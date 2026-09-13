const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = join(__dirname, '../lib/cart-core.ts');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
compiled._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { WooCartClient, buildAddItemPayload, mapCart } = compiled.exports;

const rawCart = (items = []) => ({
  items, items_count: items.reduce((sum, entry) => sum + entry.quantity, 0),
  totals: { total_items: '12000', total_price: '12000', currency_code: 'USD', currency_minor_unit: 2 },
});
const item = (extra = {}) => ({
  key: 'cart-key', id: 3651, quantity: 2, type: 'variation', name: 'L1 Polo', sku: 'POLO-NAVY-5XL',
  permalink: 'https://store.test/product/l1-polo/',
  quantity_limits: { minimum: 1, maximum: 5, multiple_of: 1, editable: true },
  variation: [{ attribute: 'Color', value: 'Navy' }, { attribute: 'Size', value: '5XL' }],
  prices: { price: '6000', regular_price: '6000', sale_price: '6000', currency_code: 'USD', currency_minor_unit: 2 },
  totals: { line_subtotal: '12000', line_total: '12000', currency_code: 'USD', currency_minor_unit: 2 },
  images: [{ src: 'https://store.test/wp-content/uploads/polo.jpg' }], ...extra,
});

test('maps WooCommerce keys, variation IDs, attributes, images and totals without local price math', () => {
  const cart = mapCart(rawCart([item()]));
  assert.equal(cart.count, 2);
  assert.equal(cart.subtotal, 120);
  assert.equal(cart.total, 120);
  assert.deepEqual(cart.items[0], {
    key: 'cart-key', id: 3651, productId: undefined, variationId: 3651, type: 'variation', qty: 2,
    quantityLimits: { minimum: 1, maximum: 5, multipleOf: 1, editable: true },
    name: 'L1 Polo', slug: 'l1-polo', sku: 'POLO-NAVY-5XL', price: 60,
    regularPrice: 60, salePrice: 60, subtotal: 120, total: 120, currency: 'USD',
    attributes: [{ name: 'Color', value: 'Navy' }, { name: 'Size', value: '5XL' }],
    size: '5XL', color: 'Navy', image: '/store/media?src=https%3A%2F%2Fstore.test%2Fwp-content%2Fuploads%2Fpolo.jpg',
  });
});

test('simple products send product ID; variable products send exact variation ID and attributes', () => {
  const product = { wooProductId: 3633, type: 'variable', attributes: [
    { id: 1, name: 'Color', taxonomy: 'pa_color', terms: [{ id: 1, name: 'Navy', slug: 'navy' }] },
    { id: 2, name: 'Size', terms: [{ id: 2, name: '5XL', slug: '5xl' }] },
  ] };
  const payload = buildAddItemPayload(product, {
    wooVariationId: 3651, detailsState: 'resolved',
    attributes: [{ name: 'Color', value: 'Navy' }, { name: 'Size', value: '5XL' }],
  });
  assert.deepEqual(payload, { id: 3651, quantity: 1, variation: [
    { attribute: 'pa_color', value: 'navy' }, { attribute: 'Size', value: '5XL' },
  ] });
  assert.deepEqual(buildAddItemPayload({ wooProductId: 3704, type: 'simple' }, {}), { id: 3704, quantity: 1 });
});

test('client uses the cart operations and keeps server responses authoritative', async () => {
  const calls = [];
  const client = new WooCartClient(async (url, init) => {
    calls.push({ url, method: init.method, credentials: init.credentials });
    return new Response(JSON.stringify(rawCart(init.method === 'GET' ? [] : [item()])), { status: 200 });
  });
  await client.getCart();
  assert.equal((await client.addItem({ id: 3651, quantity: 1 })).items[0].variationId, 3651);
  await client.updateItem('cart-key', 2);
  await client.removeItem('cart-key');
  assert.deepEqual(calls.map(({ url, method }) => [method, url]), [
    ['GET', '/store/cart'], ['POST', '/store/cart/add-item'],
    ['POST', '/store/cart/update-item'], ['POST', '/store/cart/remove-item'],
  ]);
  assert.ok(calls.every((call) => call.credentials === 'include'));
});

test('clear deletes then reloads; WooCommerce rejection remains a real error', async () => {
  const calls = [];
  const client = new WooCartClient(async (url, init) => {
    calls.push([init.method, url]);
    return init.method === 'DELETE' ? new Response(null, { status: 204 }) : new Response(JSON.stringify(rawCart()), { status: 200 });
  });
  assert.deepEqual(await client.clearCart(), mapCart(rawCart()));
  assert.deepEqual(calls, [['DELETE', '/store/cart/items'], ['GET', '/store/cart']]);
  const rejected = new WooCartClient(async () => new Response(JSON.stringify({
    code: 'woocommerce_rest_product_out_of_stock', message: '<strong>Sold out</strong>',
  }), { status: 400 }));
  await assert.rejects(rejected.addItem({ id: 1, quantity: 1 }), {
    message: 'Sold out', status: 400, code: 'woocommerce_rest_product_out_of_stock',
  });
});
