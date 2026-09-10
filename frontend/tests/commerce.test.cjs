const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Compile the actual adapter in memory; no generated files or replacement implementation.
const filename = join(__dirname, '../lib/commerce-core.ts');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
compiled._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { WooCommerceAdapter, mapProduct } = compiled.exports;
const product = (id) => ({ id, slug: `product-${id}`, name: `Product ${id}`, type: 'simple',
  is_in_stock: true, is_purchasable: true,
  prices: { price: '2709', currency_code: 'USD', currency_minor_unit: 2 },
  categories: [{ id: 1, name: 'Hats', slug: 'hats' }, { id: 2, name: 'Summer', slug: 'summer' }],
  images: [{ id: 10, src: 'https://store.test/wp-content/uploads/test.jpg', alt: 'Hat' }],
});
const json = (data, headers = {}) => new Response(JSON.stringify(data), { headers });

test('loads 205 published products over three pages, without truncating at 100', async () => {
  const calls = [];
  const adapter = new WooCommerceAdapter('https://store.test', async (url) => {
    const page = Number(url.searchParams.get('page'));
    calls.push(page);
    return json(Array.from({ length: page === 3 ? 5 : 100 }, (_, i) => product((page - 1) * 100 + i + 1)),
      { 'X-WP-Total': '205', 'X-WP-TotalPages': '3' });
  });
  assert.equal((await adapter.getProducts()).length, 205);
  assert.deepEqual(calls, [1, 2, 3]);
});
test('headerless pagination also loads more than 100 products', async () => {
  const adapter = new WooCommerceAdapter('https://store.test', async (url) => {
    const page = Number(url.searchParams.get('page'));
    return json(Array.from({ length: page === 1 ? 100 : 1 }, (_, i) => product((page - 1) * 100 + i + 1)));
  });
  assert.equal((await adapter.getProducts()).length, 101);
});
test('actual empty response differs from missing product and configuration error', async () => {
  const adapter = new WooCommerceAdapter('https://store.test', async () => json([], { 'X-WP-Total': '0', 'X-WP-TotalPages': '0' }));
  assert.deepEqual(await adapter.getProducts(), []);
  assert.equal(await adapter.getProductBySlug('missing'), undefined);
  await assert.rejects(new WooCommerceAdapter().getProducts(), { kind: 'configuration' });
});
test('network errors and WooCommerce HTTP errors propagate for catalog and product', async () => {
  const network = new WooCommerceAdapter('https://store.test', async () => { throw new TypeError('offline'); });
  const upstream = new WooCommerceAdapter('https://store.test', async () => new Response('unavailable', { status: 503 }));
  await assert.rejects(network.getProducts(), { kind: 'network' });
  await assert.rejects(network.getProductBySlug('existing'), { kind: 'network' });
  await assert.rejects(upstream.getProducts(), { kind: 'woocommerce', httpStatus: 503 });
  await assert.rejects(upstream.getProductBySlug('existing'), { kind: 'woocommerce', httpStatus: 503 });
});
test('invalid JSON, failed later page and incomplete totals never become empty or partial results', async () => {
  await assert.rejects(new WooCommerceAdapter('https://store.test', async () => new Response('<html>blocked</html>')).getProducts(), { kind: 'woocommerce' });
  await assert.rejects(new WooCommerceAdapter('https://store.test', async () => json([product(1)], { 'X-WP-Total': '2', 'X-WP-TotalPages': '1' })).getProducts(), { kind: 'woocommerce' });
  await assert.rejects(new WooCommerceAdapter('https://store.test', async (url) => url.searchParams.get('page') === '1'
    ? json([product(1)], { 'X-WP-Total': '2', 'X-WP-TotalPages': '2' })
    : new Response('', { status: 500 })).getProducts(), { kind: 'woocommerce' });
});
test('repeated pages cannot loop forever or silently duplicate products', async () => {
  await assert.rejects(new WooCommerceAdapter('https://store.test', async () => json([product(1)], { 'X-WP-Total': '2', 'X-WP-TotalPages': '2' })).getProducts(), { kind: 'woocommerce' });
});
test('preserves IDs, USD, original image metadata and every category', async () => {
  const raw = product(1);
  const mapped = mapProduct(raw);
  assert.equal(mapped.wooProductId, 1);
  assert.equal(mapped.price, 27.09);
  assert.equal(mapped.currency, 'USD');
  assert.deepEqual(mapped.sourceImages, raw.images);
  assert.ok(mapped.images[0].startsWith('/store/media?'));
  assert.deepEqual(mapped.categories, raw.categories);
  const adapter = new WooCommerceAdapter('https://store.test', async () => json([raw]));
  assert.equal((await adapter.getProductsByCollection('summer')).length, 1);
});
test('parent stock and price are never copied to unresolved variations', () => {
  const raw = { ...product(1), type: 'variable', has_options: true,
    attributes: [{ id: 1, name: 'Size', terms: [{ id: 2, name: 'S', slug: 's' }] }],
    variations: [{ id: 2, attributes: [{ name: 'Size', value: 's' }, { name: 'Color', value: 'black' }] }] };
  const mapped = mapProduct(raw);
  assert.deepEqual(mapped.attributes, raw.attributes);
  assert.equal(mapped.variants[0].wooVariationId, 2);
  assert.equal(mapped.variants[0].status, 'UNKNOWN');
  assert.equal(mapped.variants[0].price, undefined);
  assert.equal(mapped.variants[0].detailsState, 'unresolved');
  assert.equal(mapProduct({ ...raw, variations: [] }).variants.length, 0);
});
test('an in-stock product that WooCommerce marks non-purchasable is unavailable', () => {
  assert.equal(mapProduct({ ...product(1), is_purchasable: false }).status, 'UNAVAILABLE');
});
test('real variation resolver uses its own price and stock and verifies parent', async () => {
  const variant = { id: 'woo-2', wooVariationId: 2, size: 's', status: 'UNKNOWN' };
  const raw = { ...product(2), parent: 1, type: 'variation', is_in_stock: false,
    prices: { price: '3000', currency_code: 'USD', currency_minor_unit: 2 } };
  const adapter = new WooCommerceAdapter('https://store.test', async () => json(raw));
  const result = await adapter.getVariationById(1, variant);
  assert.equal(result.price, 30);
  assert.equal(result.status, 'SOLD_OUT');
  assert.equal(result.detailsState, 'resolved');
  await assert.rejects(adapter.getVariationById(99, variant), { kind: 'woocommerce' });
});

test('resolves the complete parent variation set with real commercial fields', async () => {
  const parent = { ...product(1), type: 'variable', has_options: true,
    variations: [
      { id: 2, attributes: [{ name: 'Color', value: 'black' }, { name: 'Size', value: 's' }] },
      { id: 3, attributes: [{ name: 'Color', value: 'black' }, { name: 'Size', value: 'm' }] },
    ] };
  const variations = [
    { ...product(2), parent: 1, type: 'variation', sku: 'BLACK-S', variation: 'Color: Black, Size: S',
      prices: { price: '2500', regular_price: '3000', sale_price: '2500', currency_code: 'USD', currency_minor_unit: 2 },
      low_stock_remaining: 2, images: [{ id: 20, src: 'https://store.test/wp-content/uploads/black-s.jpg' }] },
    { ...product(3), parent: 1, type: 'variation', sku: 'BLACK-M', variation: 'Color: Black, Size: M',
      prices: { price: '3000', regular_price: '3000', sale_price: '3000', currency_code: 'USD', currency_minor_unit: 2 },
      is_in_stock: false, is_purchasable: false },
  ];
  const adapter = new WooCommerceAdapter('https://store.test', async (url) =>
    url.searchParams.get('slug') ? json([parent], { 'X-WP-Total': '1', 'X-WP-TotalPages': '1' })
      : json(variations, { 'X-WP-Total': '2', 'X-WP-TotalPages': '1' }));
  const mapped = await adapter.getProductBySlug('product-1');
  assert.equal(mapped.variants.length, 2);
  assert.deepEqual(mapped.variants[0], {
    id: 'woo-2', wooVariationId: 2, parentWooProductId: 1, sku: 'BLACK-S',
    size: 's', color: 'black', attributes: parent.variations[0].attributes,
    price: 25, regularPrice: 30, salePrice: 25, currency: 'USD', status: 'AVAILABLE',
    availability: { is_in_stock: true, is_purchasable: true, is_on_backorder: undefined,
      stock_status: undefined, low_stock_remaining: 2, stock_availability: undefined },
    detailsState: 'resolved', sourceImage: variations[0].images[0],
    image: '/store/media?src=https%3A%2F%2Fstore.test%2Fwp-content%2Fuploads%2Fblack-s.jpg',
  });
  assert.equal(mapped.variants[1].status, 'SOLD_OUT');
  assert.equal(mapped.variants[1].availability.is_purchasable, false);
});

test('rejects variation responses from another parent or with missing IDs', async () => {
  const parent = { ...product(1), type: 'variable', variations: [{ id: 2, attributes: [] }] };
  const wrongParent = { ...product(2), parent: 99, type: 'variation' };
  const adapter = new WooCommerceAdapter('https://store.test', async (url) =>
    url.searchParams.get('slug') ? json([parent]) : json([wrongParent]));
  await assert.rejects(adapter.getProductBySlug('product-1'), { kind: 'woocommerce' });
  const missing = new WooCommerceAdapter('https://store.test', async (url) =>
    url.searchParams.get('slug') ? json([parent]) : json([]));
  await assert.rejects(missing.getProductBySlug('product-1'), { kind: 'woocommerce' });
});

if (process.env.TEST_LIVE_STORE === '1') test('live catalog and three requested products', async () => {
  const adapter = new WooCommerceAdapter('https://lockcityclothes.com');
  const products = await adapter.getProducts();
  assert.equal(new Set(products.map(p => p.wooProductId)).size, products.length);
  console.log('LIVE_PRODUCTS', products.length);
  for (const [slug, type] of [['soul-piece-cap', 'simple'], ['white-highneck-lcc', 'variable'], ['l1-polo', 'variable']]) {
    const p = await adapter.getProductBySlug(slug);
    assert.equal(p.type, type);
    assert.equal(p.currency, 'USD');
    assert.ok(p.images.length > 0);
    if (type === 'variable') assert.ok(p.variants.every(v => v.detailsState === 'resolved' && v.parentWooProductId === p.wooProductId && v.price !== undefined));
    console.log('LIVE_PRODUCT', JSON.stringify({ id: p.wooProductId, slug, type, price: p.price, variants: p.variants.length,
      example: p.variants[0] && { id: p.variants[0].wooVariationId, parent: p.variants[0].parentWooProductId,
        attributes: p.variants[0].attributes, price: p.variants[0].price, regularPrice: p.variants[0].regularPrice,
        salePrice: p.variants[0].salePrice, currency: p.variants[0].currency,
        inStock: p.variants[0].availability?.is_in_stock, purchasable: p.variants[0].availability?.is_purchasable } }));
  }
  assert.equal(await adapter.getProductBySlug('lock-city-audit-nonexistent'), undefined);
});
