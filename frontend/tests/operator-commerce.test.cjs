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

test('loads the protected AW26 catalog with bounded upstream concurrency', () => {
  assert.match(operatorSource, /OPERATOR_CONCURRENCY = 3/);
  assert.match(operatorSource, /fetchProductsWithLimit\(productIds\)/);
  assert.doesNotMatch(operatorSource, /Promise\.all\(productIds\.map\(fetchProduct\)\)/);
});
