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

function checkoutModule() { return require(join(__dirname, '../lib/checkout-core.ts')); }

function rawCheckout({ country = 'US', rate = 'printful_shipping_standard', shipping = '495', total = '6495' } = {}) {
  return {
    items: [{
      key: 'variable-key', id: 3636, quantity: 1, type: 'variation', name: 'L1 Polo',
      permalink: 'https://lockcityclothes.com/product/l1-polo/', sku: 'L1-BLACK-S',
      quantity_limits: { minimum: 1, maximum: 5, multiple_of: 1, editable: true },
      variation: [{ attribute: 'Color', value: 'Black' }, { attribute: 'Size', value: 'S' }],
      prices: { price: '6000', regular_price: '6000', sale_price: '6000', currency_code: 'USD', currency_minor_unit: 2 },
      totals: { line_subtotal: '6000', line_total: '6000', currency_code: 'USD', currency_minor_unit: 2 },
      images: [],
    }],
    items_count: 1,
    needs_shipping: true,
    has_calculated_shipping: true,
    billing_address: { first_name: 'Alex', last_name: 'Test', address_1: '1 Test Street', address_2: '', city: 'Test City', state: country === 'US' ? 'NY' : '', postcode: country === 'US' ? '10001' : '10115', country, email: 'checkout@example.test', phone: '' },
    shipping_address: { first_name: 'Alex', last_name: 'Test', address_1: '1 Test Street', address_2: '', city: 'Test City', state: country === 'US' ? 'NY' : '', postcode: country === 'US' ? '10001' : '10115', country },
    shipping_rates: [{ package_id: 0, shipping_rates: [{
      rate_id: rate, method_id: rate, instance_id: 0, name: 'Standard shipping',
      description: '', delivery_time: '5–12 business days', price: shipping, taxes: '0',
      currency_code: 'USD', currency_minor_unit: 2, selected: true,
    }] }],
    totals: {
      total_items: '6000', total_items_tax: '0', total_shipping: shipping,
      total_shipping_tax: '0', total_tax: '0', total_price: total,
      currency_code: 'USD', currency_minor_unit: 2,
    },
  };
}

test('maps only WooCommerce shipping rates and totals for USA, Germany and Switzerland', () => {
  const { mapCheckoutCart } = checkoutModule();
  const cases = [
    ['US', '495', '6495'], ['DE', '499', '6499'], ['CH', '1039', '7039'],
  ];
  for (const [country, shipping, total] of cases) {
    const cart = mapCheckoutCart(rawCheckout({ country, shipping, total }));
    assert.equal(cart.currency, 'USD');
    assert.equal(cart.shipping, Number(shipping) / 100);
    assert.equal(cart.total, Number(total) / 100);
    assert.equal(cart.shippingPackages[0].rates[0].methodId, 'printful_shipping_standard');
    assert.equal(cart.shippingPackages[0].rates[0].selected, true);
  }
});

test('builds the server checkout payload with the exact gateway and authoritative expected total', () => {
  const { buildPayPalCheckoutPayload } = checkoutModule();
  const checkout = rawCheckout();
  checkout.billing_address.phone = '+1 212 555 0100';
  const payload = buildPayPalCheckoutPayload(checkout);
  assert.equal(payload.payment_method, 'ppcp-gateway');
  assert.deepEqual(payload.payment_data, []);
  assert.equal(payload.expected_total, '6495');
  assert.equal(payload.billing_address.email, 'checkout@example.test');
  assert.equal(payload.shipping_address.phone, '+1 212 555 0100');
  assert.equal(payload.shipping_address.country, 'US');
  assert.equal(JSON.stringify(payload).includes('Cart-Token'), false);
});

test('refuses uncalculated shipping, missing rates, empty carts and non-USD totals', () => {
  const { buildPayPalCheckoutPayload } = checkoutModule();
  const uncalculated = rawCheckout(); uncalculated.has_calculated_shipping = false;
  assert.throws(() => buildPayPalCheckoutPayload(uncalculated), /Calculate shipping/);
  const missing = rawCheckout(); missing.shipping_rates[0].shipping_rates[0].selected = false;
  assert.throws(() => buildPayPalCheckoutPayload(missing), /Select a WooCommerce shipping rate/);
  const empty = rawCheckout(); empty.items = []; empty.items_count = 0;
  assert.throws(() => buildPayPalCheckoutPayload(empty), /cart is empty/);
  const eur = rawCheckout(); eur.totals.currency_code = 'EUR';
  assert.throws(() => buildPayPalCheckoutPayload(eur), /only accepts.*USD/);
});

test('updates customer, selects a real rate and keeps prepare separate from execution', async () => {
  const { WooCheckoutClient, buildCustomerPayload } = checkoutModule();
  const calls = [];
  const client = new WooCheckoutClient(async (url, init) => {
    calls.push([init.method, url, init.body ? JSON.parse(init.body) : undefined]);
    if (url === '/checkout/prepare') return new Response(JSON.stringify({
      ready: true, gateway: 'ppcp-gateway', currency: 'USD', expected_total: '6495',
      selected_shipping_rates: ['printful_shipping_standard'], execution_enabled: false,
    }), { status: 200 });
    return new Response(JSON.stringify(rawCheckout()), { status: 200 });
  });
  const billing = rawCheckout().billing_address;
  const shipping = rawCheckout().shipping_address;
  await client.updateCustomer(buildCustomerPayload(billing, shipping));
  await client.selectShippingRate(0, 'printful_shipping_standard');
  const prepared = await client.preparePayPal();
  assert.equal(prepared.executionEnabled, false);
  assert.deepEqual(calls.map(([method, url]) => [method, url]), [
    ['POST', '/store/cart/update-customer'],
    ['POST', '/store/cart/select-shipping-rate'],
    ['POST', '/checkout/prepare'],
  ]);
  assert.deepEqual(calls[1][2], { package_id: 0, rate_id: 'printful_shipping_standard' });
});

test('falls back to ISO presentation data when this WooCommerce has no countries endpoint', async () => {
  const { WooCheckoutClient } = checkoutModule();
  const client = new WooCheckoutClient(async () => new Response(JSON.stringify({
    code: 'rest_no_route', message: 'No route was found matching the URL and request method.',
  }), { status: 404 }));
  const countries = await client.getCountries();
  assert.ok(countries.length > 200);
  assert.equal(countries.find((country) => country.code === 'DE').name, 'Germany');
  assert.equal(countries.find((country) => country.code === 'CH').name, 'Switzerland');
  assert.ok(countries.find((country) => country.code === 'US').states.some((state) => state.code === 'NY'));
});

test('accepts PayPal/WooCommerce HTTPS redirects and rejects open redirects', () => {
  const { extractPayPalRedirect } = checkoutModule();
  assert.match(extractPayPalRedirect({ payment_result: { redirect_url: 'https://www.paypal.com/checkoutnow?token=fake' } }), /^https:\/\/www\.paypal\.com/);
  assert.match(extractPayPalRedirect({ payment_result: { redirect_url: 'https://lockcityclothes.com/?wc-ajax=ppc-return-url' } }), /^https:\/\/lockcityclothes\.com/);
  assert.throws(() => extractPayPalRedirect({ payment_result: { redirect_url: 'https://evil.example/pay' } }), /unsafe/);
  assert.throws(() => extractPayPalRedirect({ payment_result: { redirect_url: 'http://paypal.com/pay' } }), /unsafe/);
});
