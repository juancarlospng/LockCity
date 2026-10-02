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
  const { orderedProductImages, mainProductImage, productImagesForColor } = load('lib/product-media.ts');
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

  const colorGallery = {
    images: ['/black-front', '/navy-front', '/black-back', '/navy-back'],
    sourceImages: [
      { src: 'https://store.test/cap-black-front.jpg' },
      { src: 'https://store.test/cap-oxford-navy-front.jpg' },
      { src: 'https://store.test/cap-black-back.jpg' },
      { src: 'https://store.test/cap-oxford-navy-back.jpg' },
    ],
  };
  assert.deepEqual(productImagesForColor(colorGallery, 'Oxford Navy').slice(0, 2), ['/navy-front', '/navy-back']);
  assert.deepEqual(productImagesForColor(colorGallery, 'Missing Color'), orderedProductImages(colorGallery));

  const topGallery = {
    images: ['/black-top', '/navy-top', '/smoke-top'],
    sourceImages: [
      { src: 'https://store.test/quarter-zip-black-front.jpg' },
      { src: 'https://store.test/quarter-zip-navy-front.jpg' },
      { src: 'https://store.test/quarter-zip-smoke-front.jpg' },
    ],
  };
  assert.equal(productImagesForColor(topGallery, 'Navy')[0], '/navy-top');

  const bottomGallery = {
    images: ['/black-bottom', '/navy-bottom'],
    sourceImages: [
      { src: 'https://store.test/sweatpants-black-front.jpg' },
      { src: 'https://store.test/sweatpants-navy-blazer-front.jpg' },
    ],
  };
  assert.equal(productImagesForColor(bottomGallery, 'Navy Blazer')[0], '/navy-bottom');
});

test('card action exposes priced quick add, active variable options and honest sold-out states', () => {
  const { getProductCardAction } = load('lib/product-card-state.ts');
  const simple = getProductCardAction(product());
  assert.equal(simple.kind, 'quick-add');
  assert.match(simple.label, /Quick add/);
  assert.doesNotMatch(simple.label, /(?:^|\D)0(?:\D|$)/);

  const variable = getProductCardAction(product({ type: 'variable', variants: [{ id: 'unresolved', status: 'UNKNOWN', detailsState: 'unresolved' }] }));
  assert.deepEqual(variable, { kind: 'select-options', label: 'Select options' });
  const preview = getProductCardAction(product({ previewOnly: true, availability: { is_in_stock: true, is_purchasable: false } }));
  assert.deepEqual(preview, { kind: 'select-options', label: 'Select options' });
  assert.equal(getProductCardAction(product({ status: 'SOLD_OUT', availability: { is_in_stock: false, is_purchasable: false } })).kind, 'sold-out');
  assert.equal(getProductCardAction(product({ price: 0, variants: [resolvedVariant({ price: 0 })] })).kind, 'unavailable');
});

test('product UI keeps media contained, thumbnails fixed and footer credit subtle', () => {
  const card = read('components/ProductCard.tsx');
  const detail = read('components/ProductDetail.tsx');
  const footer = read('components/Footer.tsx');
  assert.match(card, /object-contain/);
  assert.match(card, /bg-white/);
  assert.match(card, /quality=\{86\}/);
  assert.match(card, /!text-neutral-950/);
  assert.match(card, /select-options-link/);
  assert.match(detail, /object-contain/);
  assert.match(detail, /bg-white/);
  assert.match(detail, /quality=\{88\}/);
  assert.match(detail, /quality=\{70\}/);
  assert.match(detail, /h-20 w-20 shrink-0 snap-start/);
  assert.match(detail, /overflow-x-auto/);
  assert.match(detail, /Previous product images/);
  assert.match(detail, /Next product images/);
  assert.match(detail, /getColorAccent/);
  assert.match(footer, /Powered by Blueether/);
});

test('AW26 image quality prioritizes hero and primary PDP without overfetching thumbnails', () => {
  const hero = read('components/home/Aw26Hero.tsx');
  const config = read('next.config.mjs');
  assert.match(hero, /quality=\{88\}/);
  assert.match(hero, /fetchPriority="high"/);
  assert.match(hero, /sizes="\(max-width: 1023px\) 100vw, 70vw"/);
  assert.match(config, /qualities: \[70, 75, 82, 86, 88\]/);
  assert.match(hero, /mask-image:radial-gradient/);
  assert.match(hero, /drop-shadow/);
});

test('AW26 hero keeps the campaign label clear of the oversized title', () => {
  const hero = read('components/home/Aw26Hero.tsx');
  assert.match(hero, /mt-10[^\"]*sm:mt-12[^\"]*lg:mt-14/);
});
