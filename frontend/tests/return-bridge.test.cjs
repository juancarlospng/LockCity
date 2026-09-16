const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

let previousTsLoader;
before(() => {
  previousTsLoader = Module._extensions['.ts'];
  Module._extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
});
after(() => { Module._extensions['.ts'] = previousTsLoader; });

function bridgeModule() { return require(join(__dirname, '../lib/return-bridge-core.ts')); }

test('server verification is signed, time-limited and rejects tampering', async () => {
  const { parseBridgeVerification, signCheckoutResult, verifyCheckoutResult } = bridgeModule();
  const now = Date.now();
  const secret = 'test-only-secret-with-at-least-32-characters';
  const result = parseBridgeVerification({ verified: true, status: 'paid', order_number: 'LC-123' }, now);
  const signed = await signCheckoutResult(result, secret);
  assert.deepEqual(await verifyCheckoutResult(signed, secret, now + 1000), result);
  assert.equal(await verifyCheckoutResult(`${signed}x`, secret, now + 1000), null);
  assert.equal(await verifyCheckoutResult(signed, secret, now + 11 * 60_000), null);
});

test('a browser value cannot declare payment success without verified server data', () => {
  const { parseBridgeVerification } = bridgeModule();
  assert.throws(() => parseBridgeVerification({ verified: false, status: 'paid', order_number: '1' }), /Invalid/);
  assert.throws(() => parseBridgeVerification({ verified: true, status: 'paid', order_number: '../secret' }), /Invalid/);
});

test('cancel flow returns only a non-sensitive cancellation state', () => {
  const { cancelCheckoutUrl } = bridgeModule();
  const url = new URL(cancelCheckoutUrl('https://lock-city.vercel.app'));
  assert.equal(url.pathname, '/checkout');
  assert.deepEqual([...url.searchParams.entries()], [['payment', 'cancelled']]);
});

test('WordPress bridge keeps keys server-side and validates payment before V2 success', () => {
  const source = readFileSync(join(__dirname, '../../wordpress/lock-city-v2-return-bridge/lock-city-v2-return-bridge.php'), 'utf8');
  assert.match(source, /woocommerce_get_return_url/);
  assert.match(source, /template_redirect/);
  assert.match(source, /is_wc_endpoint_url\( 'order-received' \)/);
  assert.match(source, /ppcp_create_order_request_body_data/);
  assert.match(source, /\$order->is_paid\(\)/);
  assert.match(source, /hash_equals\( \$order->get_order_key\(\)/);
  assert.match(source, /method="post"/);
  assert.doesNotMatch(source, /order_key=.*order-confirmation/);
  assert.doesNotMatch(source, /order_id=.*order-confirmation/);
});

test('WordPress bridge secret settings are admin-only, nonce-protected and never prefilled', () => {
  const source = readFileSync(join(__dirname, '../../wordpress/lock-city-v2-return-bridge/lock-city-v2-return-bridge.php'), 'utf8');
  assert.match(source, /get_option\( 'lc_v2_bridge_secret'/);
  assert.match(source, /current_user_can\( 'manage_options' \)/);
  assert.match(source, /check_admin_referer\( 'lc_v2_save_bridge_settings' \)/);
  assert.match(source, /type="password"/);
  assert.match(source, /autocomplete="new-password"/);
  assert.match(source, /add_option\( 'lc_v2_bridge_secret', \$secret, '', false \)/);
  assert.doesNotMatch(source, /value="<\?php echo[^\n]*bridge_secret/);
});

test('generic Store API proxy blocks a direct checkout POST', () => {
  const source = readFileSync(join(__dirname, '../app/store/[...path]/route.ts'), 'utf8');
  assert.match(source, /path\[0\] === "checkout" && req\.method !== "GET"/);
  assert.match(source, /checkout_execution_disabled/);
});

test('production checkout stays environment-gated without staging or localhost coupling', () => {
  const server = readFileSync(join(__dirname, '../lib/woocommerce-server.ts'), 'utf8');
  const page = readFileSync(join(__dirname, '../app/checkout/page.tsx'), 'utf8');
  const plugin = readFileSync(join(__dirname, '../../wordpress/lock-city-v2-return-bridge/lock-city-v2-return-bridge.php'), 'utf8');
  assert.match(server, /PAYPAL_CHECKOUT_EXECUTION_ENABLED/);
  assert.doesNotMatch(`${server}\n${page}\n${plugin}`, /localhost|pruebasv2/i);
});
