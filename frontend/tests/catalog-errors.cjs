// Run after next build. Faults are served locally, never injected into WooCommerce.
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { join } = require('node:path');

(async () => {
  let mode = 'empty';
  const upstream = http.createServer((req, res) => {
    res.writeHead(mode === 'error' ? 503 : 200, { 'Content-Type': 'application/json', 'X-WP-Total': '0', 'X-WP-TotalPages': '0' });
    res.end(mode === 'error' ? '{"code":"temporarily_unavailable"}' : '[]');
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const upstreamPort = upstream.address().port;
  const probe = http.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, [join(__dirname, '../node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: join(__dirname, '..'), windowsHide: true,
    env: { ...process.env, WC_STORE_URL: `http://127.0.0.1:${upstreamPort}` }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', d => { output += d; });
  child.stderr.on('data', d => { output += d; });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (output.includes('Ready in')) { ready = true; break; }
      if (child.exitCode !== null) throw new Error(output);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(ready, output);
    const empty = await (await fetch(`${base}/shop`)).text();
    assert.match(empty, /data-testid="shop-empty-state"/);
    assert.doesNotMatch(empty, /data-testid="catalog-error-/);
    const missing = await fetch(`${base}/product/no-such-product`);
    assert.equal(missing.status, 404);
    console.log('PASS: genuinely empty shop and missing product 404');
    mode = 'error';
    for (const route of ['/shop', '/product/existing-product']) {
      const html = await (await fetch(base + route)).text();
      assert.match(html, /data-testid="catalog-error-woocommerce"/);
      assert.doesNotMatch(html, /data-testid="shop-empty-state"/);
    }
    const proxyError = await fetch(`${base}/store/products`);
    assert.equal(proxyError.status, 503);
    assert.equal((await proxyError.json()).error, 'woocommerce');
    console.log('PASS: WooCommerce failure shown as error on Shop/product and preserved by proxy');
    await new Promise(resolve => upstream.close(resolve));
    for (const route of ['/shop', '/product/existing-product']) {
      const html = await (await fetch(base + route)).text();
      assert.match(html, /data-testid="catalog-error-network"/);
      assert.doesNotMatch(html, /data-testid="shop-empty-state"/);
    }
    const networkError = await fetch(`${base}/store/products`);
    assert.equal(networkError.status, 502);
    assert.equal((await networkError.json()).error, 'network');
    console.log('PASS: network failure shown as error on Shop/product and proxy');
  } finally {
    child.kill();
    upstream.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
