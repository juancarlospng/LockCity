const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const read = (path) => readFileSync(join(__dirname, '..', path), 'utf8');
let previousTsLoader;
before(() => {
  previousTsLoader = Module._extensions['.ts'];
  Module._extensions['.ts'] = (mod, filename) => mod._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
});
after(() => { Module._extensions['.ts'] = previousTsLoader; });

const load = (path) => require(join(__dirname, '..', path));
const resolvedVariant = (extra = {}) => ({
  id: 'woo-1-default', size: 'OS', status: 'AVAILABLE', detailsState: 'resolved',
  price: 35, currency: 'USD', availability: { is_in_stock: true, is_purchasable: true }, ...extra,
});
const product = (extra = {}) => ({
  id: 'woo-1', wooProductId: 1, name: 'Test', slug: 'test', type: 'simple', price: 35,
  currency: 'USD', status: 'AVAILABLE', availability: { is_in_stock: true, is_purchasable: true },
  variants: [resolvedVariant()], images: [], sourceImages: [], categories: [], attributes: [], hasOptions: false,
  ...extra,
});

test('color accents cover launch colors and use a neutral future-safe fallback', () => {
  const { getColorAccent, isColorAttribute } = load('lib/color-accent.ts');
  assert.equal(getColorAccent('Black').background, '#090909');
  assert.equal(getColorAccent('White').borderColor, '#8b8a84');
  assert.equal(getColorAccent('Navy').background, '#101c35');
  assert.equal(getColorAccent('Maroon').background, '#5a1723');
  assert.equal(getColorAccent('Forest').background, '#183b2b');
  assert.equal(getColorAccent('Asphalt').background, '#3f4141');
  assert.equal(getColorAccent('Vintage Black').background, '#343434');
  assert.equal(getColorAccent('Future custom color').background, '#777775');
  assert.equal(isColorAttribute('Colour'), true);
  assert.equal(isColorAttribute('Size'), false);
});

test('image ordering prefers mockup and model imagery while preserving single images', () => {
  const { orderedProductImages, mainProductImage } = load('lib/product-media.ts');
  const gallery = {
    images: ['/flat', '/back', '/mockup'],
    sourceImages: [
      { src: 'https://store.test/shirt-flat-lay.jpg', name: 'Flat lay' },
      { src: 'https://store.test/shirt-back.jpg', alt: 'Back' },
      { src: 'https://store.test/shirt-3d-mockup.jpg', name: '3D mockup' },
    ],
  };
  assert.deepEqual(orderedProductImages(gallery), ['/mockup', '/back', '/flat']);
  assert.equal(mainProductImage({ images: ['/only'], sourceImages: [{ src: 'only.jpg' }] }), '/only');
});

test('card action exposes priced quick add, active variable options and honest sold-out states', () => {
  const { getProductCardAction } = load('lib/product-card-state.ts');
  const simple = getProductCardAction(product());
  assert.equal(simple.kind, 'quick-add');
  assert.match(simple.label, /Quick add/);
  assert.doesNotMatch(simple.label, /(?:^|\D)0(?:\D|$)/);

  const variable = getProductCardAction(product({ type: 'variable', variants: [{ id: 'unresolved', status: 'UNKNOWN', detailsState: 'unresolved' }] }));
  assert.deepEqual(variable, { kind: 'select-options', label: 'Select options' });
  assert.equal(getProductCardAction(product({ status: 'SOLD_OUT', availability: { is_in_stock: false, is_purchasable: false } })).kind, 'sold-out');
  assert.equal(getProductCardAction(product({ price: 0, variants: [resolvedVariant({ price: 0 })] })).kind, 'unavailable');
});

test('product UI keeps media contained, thumbnails fixed and footer credit subtle', () => {
  const card = read('components/ProductCard.tsx');
  const detail = read('components/ProductDetail.tsx');
  const footer = read('components/Footer.tsx');
  assert.match(card, /object-contain/);
  assert.match(card, /select-options-link/);
  assert.match(detail, /object-contain/);
  assert.match(detail, /h-20 w-20 shrink-0 snap-start/);
  assert.match(detail, /overflow-x-auto/);
  assert.match(detail, /Previous product images/);
  assert.match(detail, /Next product images/);
  assert.match(detail, /getColorAccent/);
  assert.match(footer, /Powered by Blueether/);
});