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

const load = (path) => require(join(__dirname, '..', path));

test('all 11 launch products have centralized editorial content', () => {
  const { PRODUCT_CONTENT, PRODUCT_CONTENT_IDS } = load('lib/product-content.ts');
  const { PUBLIC_STORE_PRODUCT_IDS } = load('lib/merchandising.ts');
  assert.equal(PRODUCT_CONTENT_IDS.length, 11);
  assert.deepEqual([...PRODUCT_CONTENT_IDS].sort((a, b) => a - b), [...PUBLIC_STORE_PRODUCT_IDS].sort((a, b) => a - b));
  for (const content of Object.values(PRODUCT_CONTENT)) {
    assert.ok(content.displayName);
    assert.ok(content.shortDescription);
    assert.ok(content.description);
    assert.ok(content.details.length > 0);
  }
});

test('public editorial copy excludes supplier, placeholder and storefront compliance text', () => {
  const { PRODUCT_CONTENT } = load('lib/product-content.ts');
  const copy = JSON.stringify(PRODUCT_CONTENT);
  for (const forbidden of [
    /blank product/i,
    /made especially for you/i,
    /no minimums?/i,
    /printing/i,
    /embroidery/i,
    /Oak Inc\.?/i,
    /Sinden Ventures/i,
    /alex\.oak/i,
    /123 Main Street/i,
    /GPSR/i,
    /Athletic Heather/i,
    /Charcoal Heather/i,
    /Carbon Grey/i,
  ]) assert.doesNotMatch(copy, forbidden);
});

test('editorial overlay changes presentation only and preserves WooCommerce commercial data', () => {
  const { applyProductContent } = load('lib/product-content.ts');
  const variants = [{ id: 'woo-20', wooVariationId: 20, size: 'M', status: 'AVAILABLE' }];
  const images = ['/store/media?src=one'];
  const sourceImages = [{ src: 'https://commerce.test/one.jpg' }];
  const product = {
    id: 'woo-2911', wooProductId: 2911, name: 'Woo name', slug: 'woo-slug', type: 'variable',
    price: 90, priceRange: { min: 90, max: 90 }, currency: 'USD', sku: 'WOO-SKU',
    status: 'AVAILABLE', availability: { is_in_stock: true, is_purchasable: true },
    variants, images, sourceImages, categories: [], attributes: [], hasOptions: true,
    description: 'Supplier description',
  };
  const result = applyProductContent(product);
  assert.equal(result.name, 'Lock Hoodie');
  assert.notEqual(result.description, product.description);
  assert.equal(result.price, product.price);
  assert.equal(result.priceRange, product.priceRange);
  assert.equal(result.currency, product.currency);
  assert.equal(result.status, product.status);
  assert.equal(result.availability, product.availability);
  assert.equal(result.variants, variants);
  assert.equal(result.images, images);
  assert.equal(result.sourceImages, sourceImages);
  assert.equal(result.slug, product.slug);
  assert.equal(result.sku, product.sku);
});

test('size guides contain only confirmed positive measurements and no care copy', () => {
  const { PRODUCT_CONTENT } = load('lib/product-content.ts');
  assert.equal(PRODUCT_CONTENT[2911].sizeGuide, undefined);
  assert.equal(PRODUCT_CONTENT[3704].sizeGuide, undefined);
  assert.deepEqual(PRODUCT_CONTENT[3699].sizeGuide.circumference, {
    label: 'Head circumference', cm: '50.8–56 cm', inches: '20–22 in',
  });
  for (const content of Object.values(PRODUCT_CONTENT)) {
    const guide = content.sizeGuide;
    if (guide?.measurements) {
      assert.ok(guide.sizes.length > 0);
      for (const measurement of guide.measurements) {
        assert.equal(measurement.valuesCm.length, guide.sizes.length);
        assert.equal(measurement.valuesCm.every((value) => Number.isFinite(value) && value > 0), true);
      }
    }
  }
  for (const content of Object.values(PRODUCT_CONTENT)) {
    assert.equal(Object.hasOwn(content, 'care'), false);
    assert.equal(content.details.some((detail) => /^care$/i.test(detail.title)), false);
  }
});

test('3214 exposes only its verified one-size beanie measurements', () => {
  const { PRODUCT_CONTENT } = load('lib/product-content.ts');
  const guide = PRODUCT_CONTENT[3214].sizeGuide;
  assert.equal(PRODUCT_CONTENT[3214].displayName, 'Lock Ribbed Beanie');
  assert.ok(guide);
  assert.deepEqual(guide.sizes, ['One Size']);
  assert.deepEqual(guide.measurements, [
    { label: 'Total height', valuesCm: [22] },
    { label: 'Cuff height', valuesCm: [7.5] },
    { label: 'Width', valuesCm: [20] },
  ]);
  assert.deepEqual(guide.circumference, {
    label: 'Head circumference', cm: '41.9–58.4 cm', inches: '16.5–23 in',
  });
  assert.equal(PRODUCT_CONTENT[2911].sizeGuide, undefined);
  assert.equal(PRODUCT_CONTENT[3704].sizeGuide, undefined);
});

test('2415 omits 5XL and 3011/3686 use the same confirmed table', () => {
  const { PRODUCT_CONTENT } = load('lib/product-content.ts');
  assert.deepEqual(PRODUCT_CONTENT[2415].sizeGuide.sizes, ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']);
  assert.equal(PRODUCT_CONTENT[2415].sizeGuide.sizes.includes('5XL'), false);
  assert.deepEqual(PRODUCT_CONTENT[3011].sizeGuide, PRODUCT_CONTENT[3686].sizeGuide);
  assert.deepEqual(PRODUCT_CONTENT[3011].sizeGuide.measurements, [
    { label: 'Length', valuesCm: [73, 75, 77, 80, 82.5] },
    { label: 'Width', valuesCm: [63, 67, 71, 76, 81] },
    { label: 'Sleeve', valuesCm: [24, 24.5, 25, 25.5, 26] },
  ]);
});

test('size guide defaults to confirmed cm data, converts inches and filters against Woo sizes', () => {
  const { PRODUCT_CONTENT } = load('lib/product-content.ts');
  const { measurementValue, sizeGuideTable } = load('lib/size-guide.ts');
  assert.equal(measurementValue(74.93, 'cm'), '74.93');
  assert.equal(measurementValue(74.93, 'in'), '29.5');
  const filtered = sizeGuideTable(PRODUCT_CONTENT[2415].sizeGuide, ['M', 'XL', '4XL']);
  assert.deepEqual(filtered.sizes, ['M', 'XL', '4XL']);
  assert.deepEqual(filtered.measurements[0].valuesCm, [77.47, 82.55, 90.17]);
  assert.equal(sizeGuideTable(PRODUCT_CONTENT[2415].sizeGuide, ['5XL']), undefined);
});

test('size guide UI provides CM/IN controls and responsive table scrolling', () => {
  const source = readFileSync(join(__dirname, '..', 'components/ProductSizeGuide.tsx'), 'utf8');
  assert.match(source, /useState<SizeGuideUnit>\("cm"\)/);
  assert.match(source, /\["cm", "in"\]/);
  assert.match(source, /size-guide-unit-\$\{value\}/);
  assert.match(source, /overflow-x-auto/);
  assert.match(source, /sizeGuideTable\(content, soldSizes\)/);
});

test('front imagery outranks a WooCommerce back image for product covers', () => {
  const { orderedProductImages, shouldPrioritizeVariantImage } = load('lib/product-media.ts');
  const product = {
    images: ['/back', '/front'],
    sourceImages: [
      { src: 'https://commerce.test/hoodie-black-back.jpg' },
      { src: 'https://commerce.test/hoodie-black-front.jpg' },
    ],
  };
  assert.deepEqual(orderedProductImages(product), ['/front', '/back']);
  assert.equal(shouldPrioritizeVariantImage(product.sourceImages[0]), false);
  assert.equal(shouldPrioritizeVariantImage(product.sourceImages[1]), true);
});
