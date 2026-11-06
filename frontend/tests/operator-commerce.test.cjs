const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const filename = join(__dirname, '../lib/operator-commerce.ts');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'server-only') return {};
  if (request === './commerce-core') {
    return { CommerceError: class CommerceError extends Error {
      constructor(kind, message, httpStatus) {
        super(message); this.kind = kind; this.httpStatus = httpStatus;
      }
    } };
  }
  if (request === './merchandising') {
    return { AW26_PRODUCT_ID_BY_SLUG: { 'lc-code-quarter-zip-sweatshirt': 3823 } };
  }
  return originalLoad.call(this, request, parent, isMain);
};
try {
  compiled._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
} finally {
  Module._load = originalLoad;
}
const { mapOperatorProduct } = compiled.exports;
const operatorSource = readFileSync(filename, 'utf8');

const hiddenProduct = (extra = {}) => ({
  id: 3823,
  name: 'LC Code Quarter-Zip Sweatshirt',
  slug: 'lc-code-quarter-zip-sweatshirt',
  status: 'draft',
  type: 'variable',
  catalog_visibility: 'hidden',
  categories: [{ id: 43, name: 'Tops', slug: 'tops' }],
  images: [{ id: 9, src: 'https://lockcityclothes.com/wp-content/uploads/aw26.jpg', alt: 'AW26' }],
  attributes: [
    { id: 1, name: 'Color', options: ['Black', 'Navy'], variation: true },
    { id: 2, name: 'Size', options: ['S', 'M'], variation: true },
  ],
  variations: [
    { id: 100, color: 'Black', size: 'M', regular_price: '78.00', stock_status: 'instock', attributes: [{ name: 'Color', option: 'Black' }, { name: 'Size', option: 'M' }] },
    { id: 101, color: 'Navy', size: 'S', regular_price: '78.00', stock_status: 'instock', attributes: [{ name: 'Color', option: 'Navy' }, { name: 'Size', option: 'S' }] },
  ],
  ...extra,
});

test('maps hidden AW26 products for read-only QA without making them purchasable', () => {
  const product = mapOperatorProduct(hiddenProduct());
  assert.equal(product.wooProductId, 3823);
  assert.equal(product.previewOnly, true);
  assert.equal(product.price, 78);
  assert.equal(product.currency, 'USD');
  assert.equal(product.variants.length, 2);
  assert.equal(product.variants.every((variant) => variant.availability.is_purchasable === false), true);
  assert.equal(product.images[0].startsWith('/store/media?src='), true);
  assert.deepEqual(product.attributes.map((attribute) => attribute.name), ['Color', 'Size']);
});

test('refuses AW26 products that are published or publicly visible', () => {
  assert.throws(() => mapOperatorProduct(hiddenProduct({ status: 'publish' })), /safely hidden/);
  assert.throws(() => mapOperatorProduct(hiddenProduct({ catalog_visibility: 'visible' })), /safely hidden/);
});

test('refuses zero or missing AW26 retail pricing', () => {
  assert.throws(() => mapOperatorProduct(hiddenProduct({ variations: [{ id: 100, regular_price: '0', stock_status: 'instock' }] })), /no valid retail price/);
});

test('AW26 galleries expose only colors confirmed by sellable variants and Printful sync', () => {
  const product = mapOperatorProduct(hiddenProduct({
    id: 3950,
    name: 'Lock City Mascot Youth Hoodie',
    slug: 'lock-city-mascot-kid-hoodie',
    images: [
      { id: 1, src: 'https://lockcityclothes.com/uploads/youth-hoodie-black-front.jpg' },
      { id: 2, src: 'https://lockcityclothes.com/uploads/youth-hoodie-blue-jean-front.jpg' },
      { id: 3, src: 'https://lockcityclothes.com/uploads/youth-hoodie-ivory-front.jpg' },
      { id: 4, src: 'https://lockcityclothes.com/uploads/youth-hoodie-peachy-front.jpg' },
    ],
  }));
  assert.deepEqual(product.sourceImages.map((image) => image.id), [1, 3, 4]);
});

test('exact color matching keeps black distinct from vintage-black', () => {
  const product = mapOperatorProduct(hiddenProduct({
    id: 4067,
    name: 'LC ICE DAY Sweatshirt',
    slug: 'lc-ice-day-sweatshirt',
    images: [
      { id: 1, src: 'https://lockcityclothes.com/uploads/unisex-sweatshirt-athletic-heather-front-11111111.jpg' },
      { id: 2, src: 'https://lockcityclothes.com/uploads/unisex-sweatshirt-black-front-22222222.jpg' },
      { id: 3, src: 'https://lockcityclothes.com/uploads/unisex-sweatshirt-vintage-black-front-33333333.jpg' },
      { id: 4, src: 'https://lockcityclothes.com/uploads/unisex-sweatshirt-black-back-44444444.jpg' },
    ],
  }));
  assert.deepEqual(product.sourceImages.map((image) => image.id), [2, 4]);
});

test('exact matching preserves all 27 sellable color images across AW26 color products', () => {
  const productColors = new Map([
    [3823, ['black', 'navy', 'smoke']],
    [3854, ['black', 'dust', 'forest', 'maroon', 'navy', 'vintage-brown']],
    [3950, ['black', 'ivory', 'peachy']],
    [3979, ['black', 'french-navy']],
    [4022, ['black', 'french-navy']],
    [4040, ['black', 'dark-olive', 'oxford-navy']],
    [4048, ['black', 'forest-green', 'navy']],
    [4093, ['black', 'dark-olive', 'oxford-navy']],
    [4143, ['black', 'navy-blazer']],
  ]);
  let retained = 0;
  for (const [id, colors] of productColors) {
    const images = colors.map((color, index) => ({
      id: index + 1,
      src: `https://lockcityclothes.com/uploads/product-${id}-${color}-front-${String(index + 1).repeat(8)}.jpg`,
    }));
    images.push({ id: 99, src: `https://lockcityclothes.com/uploads/product-${id}-vintage-black-front-abcdef12.jpg` });
    const product = mapOperatorProduct(hiddenProduct({ id, images }));
    assert.deepEqual(product.sourceImages.map((image) => image.id), images.slice(0, colors.length).map((image) => image.id));
    retained += product.sourceImages.length;
  }
  assert.equal(retained, 27);
});

test('a missing expected filename token never creates an empty gallery', () => {
  const product = mapOperatorProduct(hiddenProduct({
    id: 3915,
    name: 'Lockmark Ribbed Beanie',
    slug: 'lockmark-ribbed-beanie',
    images: [{ id: 1, src: 'https://lockcityclothes.com/uploads/editorial-beanie.jpg' }],
  }));
  assert.equal(product.sourceImages.length, 1);
});

test('loads the protected AW26 catalog in one cacheable batch and supports direct PDP reads', () => {
  assert.match(operatorSource, /operatorFetch\("\/aw26\/products"\)/);
  assert.match(operatorSource, /next: \{ revalidate: 300 \}/);
  assert.match(operatorSource, /requestedIds\.has\(product\.id\)/);
  assert.match(operatorSource, /AW26_PRODUCT_ID_BY_SLUG/);
  assert.match(operatorSource, /getOperatorProductBySlug/);
});
