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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
});
after(() => { Module._extensions['.ts'] = previousTsLoader; });

function merchandising() {
  return require(join(__dirname, '../lib/merchandising.ts'));
}

function homeMerchandising() {
  return require(join(__dirname, '../lib/home-merchandising.ts'));
}

const product = (wooProductId) => ({
  wooProductId,
  id: String(wooProductId),
  slug: `product-${wooProductId}`,
  name: `Product ${wooProductId}`,
  type: 'simple', categories: [], attributes: [], hasOptions: false,
  availability: {}, sourceImages: [], price: 1, currency: 'USD', status: 'AVAILABLE', images: [], variants: [],
});

test('launch classification exposes exactly 8 Core and 3 Shop-extra products', () => {
  const m = merchandising();
  assert.equal(m.CORE_PRODUCT_IDS.length, 8);
  assert.equal(m.SHOP_EXTRA_PRODUCT_IDS.length, 3);
  assert.equal(m.ACTIVE_DROP_PRODUCT_IDS.length, 0);
  assert.equal(m.LEGACY_PRODUCT_IDS.length, 14);
  assert.equal(m.PUBLIC_STORE_PRODUCT_IDS.length, 11);
  assert.equal(new Set(m.PUBLIC_STORE_PRODUCT_IDS).size, 11);
});

test('Shop allowlist excludes every legacy product and preserves configured order', () => {
  const m = merchandising();
  const allIds = [...m.LEGACY_PRODUCT_IDS, ...m.SHOP_EXTRA_PRODUCT_IDS, ...m.CORE_PRODUCT_IDS];
  const all = allIds.map(product);
  const visible = m.publicStoreProducts(all);
  assert.deepEqual(visible.map((item) => item.wooProductId), m.PUBLIC_STORE_PRODUCT_IDS);
  assert.equal(visible.some((item) => m.isLegacyProduct(item.wooProductId)), false);
  assert.deepEqual(m.coreProducts(all).map((item) => item.wooProductId), m.CORE_PRODUCT_IDS);
  assert.deepEqual(m.activeDropProducts(all), []);
});

test('related products stay within the public merchandising rules', () => {
  const m = merchandising();
  const all = [...m.PUBLIC_STORE_PRODUCT_IDS, ...m.LEGACY_PRODUCT_IDS].map(product);
  const core = m.relatedStoreProducts(product(m.CORE_PRODUCT_IDS[0]), all);
  assert.equal(core.every((item) => m.isCoreProduct(item.wooProductId)), true);
  const extra = m.relatedStoreProducts(product(m.SHOP_EXTRA_PRODUCT_IDS[0]), all);
  assert.equal(extra.every((item) => m.isPublicStoreProduct(item.wooProductId)), true);
  assert.deepEqual(m.relatedStoreProducts(product(m.LEGACY_PRODUCT_IDS[0]), all), []);
});

test('public navigation and home contain only launch sections', () => {
  const navigation = read('components/Navigation.tsx');
  for (const path of ['/shop', '/collections/core', '/contact']) assert.match(navigation, new RegExp(path.replaceAll('/', '\\/')));
  for (const path of ['/collections/drop', '/archive', '/journal', '/city', '/people', '/collab']) assert.doesNotMatch(navigation, new RegExp(path.replaceAll('/', '\\/')));

  const home = read('app/page.tsx');
  for (const component of ['LatestDrop', 'Districts', 'TheCity', 'People', 'ArchiveTeaser', 'Transmissions']) assert.doesNotMatch(home, new RegExp(component));
  for (const component of ['Loader', 'Marquee']) assert.doesNotMatch(home, new RegExp(component));
  assert.match(home, /<Hero product=\{hero\}/);
  assert.match(home, /<CityExperience \/>/);
  assert.match(home, /ProductShowcase/);
  assert.match(home, /BrandEditorial/);
  assert.match(home, /Newsletter/);
  assert.match(home, /Selected from the city/i);
  assert.match(home, /ctaHref="\/collections\/core"/);
  assert.match(home, /ctaHref="\/shop"/);
  assert.doesNotMatch(home, /coming soon/i);
});

test('home restores the original lazy Three.js city before the editorial Hero', () => {
  const home = read('app/page.tsx');
  const city = read('components/home/CityExperience.tsx');
  const scene = read('components/three/HeroScene.tsx');
  const canvas = read('components/three/SceneCanvas.tsx');
  assert.match(home, /<CityExperience \/>\s*<Hero product=\{hero\} \/>/);
  assert.match(city, /dynamic\(/);
  assert.match(city, /components\/three\/HeroScene/);
  assert.match(city, /<HeroScene progress=\{scrollYProgress\}/);
  assert.match(city, /interact3D\("hero-city", "pointer"\)/);
  assert.match(scene, /function Buildings/);
  assert.match(scene, /function Monoliths/);
  assert.match(scene, /function Dust/);
  assert.match(scene, /function CameraRig/);
  assert.match(canvas, /IntersectionObserver/);
  assert.match(canvas, /frameloop=\{visible && !pageHidden \? "always" : "never"\}/);
});

test('home merchandising is centralized, public and visually non-repetitive', () => {
  const m = merchandising();
  const home = homeMerchandising();
  const publicIds = new Set(m.PUBLIC_STORE_PRODUCT_IDS);

  assert.equal(home.HOME_HERO_PRODUCT_IDS[0], 3292);
  assert.equal(home.HOME_CORE_PRODUCT_IDS.length, 5);
  assert.equal(home.HOME_SELECTED_PRODUCT_IDS.length, 5);
  for (const id of [
    ...home.HOME_HERO_PRODUCT_IDS,
    ...home.HOME_CORE_PRODUCT_IDS,
    ...home.HOME_SELECTED_PRODUCT_IDS,
    ...home.HOME_EDITORIAL_PRODUCT_IDS,
  ]) assert.equal(publicIds.has(id), true, `Home product ${id} must be public`);

  assert.deepEqual(
    home.HOME_CORE_PRODUCT_IDS.filter((id) => home.HOME_SELECTED_PRODUCT_IDS.includes(id)),
    [],
  );
  assert.equal(home.HOME_SELECTED_PRODUCT_IDS.some((id) => m.SHOP_EXTRA_PRODUCT_IDS.includes(id)), true);

  const all = [...m.PUBLIC_STORE_PRODUCT_IDS, ...m.LEGACY_PRODUCT_IDS].map(product);
  assert.deepEqual(home.homeCoreProducts(all).map((item) => item.wooProductId), home.HOME_CORE_PRODUCT_IDS);
  assert.deepEqual(home.homeSelectedProducts(all).map((item) => item.wooProductId), home.HOME_SELECTED_PRODUCT_IDS);
  assert.equal(home.homeCoreProducts(all).some((item) => m.isLegacyProduct(item.wooProductId)), false);
  assert.equal(home.homeSelectedProducts(all).some((item) => m.isLegacyProduct(item.wooProductId)), false);
});

test('home hero and editorial retain the approved copy and real product media', () => {
  const hero = read('components/home/Hero.tsx');
  const editorial = read('components/home/BrandEditorial.tsx');
  assert.match(hero, /Built around the lock\./i);
  assert.match(hero, /Core pieces\. Limited expressions\. One city\./);
  assert.match(hero, /href="\/shop"/);
  assert.match(hero, /href="\/collections\/core"/);
  assert.match(hero, /mainProductImage/);
  assert.match(editorial, /The lock/);
  assert.match(editorial, /is the sign\./i);
  assert.match(editorial, /A symbol of identity, access and belonging\./);
  assert.match(editorial, /Lock City is built through the pieces that carry it\./);
  assert.match(editorial, /mainProductImage/);
});

test('Shop and collection routes use central merchandising selectors', () => {
  const shop = read('app/shop/page.tsx');
  const grid = read('components/ShopGrid.tsx');
  const collection = read('app/collections/[slug]/page.tsx');
  const productPage = read('app/product/[slug]/page.tsx');
  assert.match(shop, /publicStoreProducts/);
  assert.match(grid, /ALL/);
  assert.match(grid, /CORE/);
  assert.match(grid, /hasDrop \? \[\{ slug: "DROP", name: "Drop" \}\] : \[\]/);
  assert.match(collection, /coreProducts/);
  assert.match(collection, /activeDropProducts/);
  assert.match(collection, /Permanent Lock City pieces built around the lock/);
  assert.match(productPage, /relatedStoreProducts/);
  assert.match(productPage, /noIndex: !isPublicStoreProduct/);
});
