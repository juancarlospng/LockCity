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

test('QA classification exposes 8 Core, 3 Shop-extra and 17 active AW26 products', () => {
  const m = merchandising();
  assert.equal(m.CORE_PRODUCT_IDS.length, 8);
  assert.equal(m.SHOP_EXTRA_PRODUCT_IDS.length, 3);
  assert.equal(m.AW26_PRODUCT_IDS.length, 17);
  assert.deepEqual(m.AW26_EXCLUDED_PRODUCT_IDS, [3923, 4102]);
  assert.equal(m.AW26_BLOCKED_PRODUCT_IDS[3923], 'BLOCKED_PENDING_PRINTFUL_CORRECTION');
  assert.equal(new Set(m.AW26_PRODUCT_IDS).size, 17);
  assert.equal(Object.keys(m.AW26_PRODUCT_ID_BY_SLUG).length, 17);
  assert.deepEqual(new Set(Object.values(m.AW26_PRODUCT_ID_BY_SLUG)), new Set(m.AW26_PRODUCT_IDS));
  assert.equal(m.AW26_PRODUCT_IDS.includes(4102), false);
  assert.equal(m.AW26_VISIBLE, true);
  assert.equal(m.DROP_VISIBLE, true);
  assert.equal(m.ACTIVE_DROP_PRODUCT_IDS.length, 17);
  assert.equal(m.LEGACY_PRODUCT_IDS.length, 14);
  assert.equal(m.PUBLIC_STORE_PRODUCT_IDS.length, 28);
  assert.equal(new Set(m.PUBLIC_STORE_PRODUCT_IDS).size, 28);
});

test('Shop allowlist excludes every legacy product and preserves configured order', () => {
  const m = merchandising();
  const allIds = [...m.LEGACY_PRODUCT_IDS, ...m.PUBLIC_STORE_PRODUCT_IDS];
  const all = allIds.map(product);
  const visible = m.publicStoreProducts(all);
  assert.deepEqual(visible.map((item) => item.wooProductId), m.PUBLIC_STORE_PRODUCT_IDS);
  assert.equal(visible.some((item) => m.isLegacyProduct(item.wooProductId)), false);
  assert.deepEqual(m.coreProducts(all).map((item) => item.wooProductId), m.CORE_PRODUCT_IDS);
  assert.deepEqual(m.activeDropProducts(all).map((item) => item.wooProductId), m.AW26_PRODUCT_IDS);
});

test('AW26 is fully registered for QA and blocked products stay absent', () => {
  const m = merchandising();
  const all = [...m.AW26_PRODUCT_IDS, ...m.AW26_EXCLUDED_PRODUCT_IDS, ...m.PUBLIC_STORE_PRODUCT_IDS].map(product);
  assert.deepEqual(m.aw26Products(all).map((item) => item.wooProductId), m.AW26_PRODUCT_IDS);
  assert.equal(m.aw26Products(all).length, 17);
  assert.equal(m.isAw26Product(3854), true);
  assert.equal(m.isAw26Product(4143), true);
  assert.equal(m.isAw26Product(4102), false);
  assert.equal(m.isAw26Product(3923), false);
  assert.equal(m.isExcludedAw26Product(3923), true);
  assert.equal(m.isExcludedAw26Product(4102), true);
  assert.equal(m.publicStoreProducts(all).filter((item) => m.isAw26Product(item.wooProductId)).length, 17);
  assert.equal(m.isPublicStoreProduct(3923), false);
  assert.equal(m.isPublicStoreProduct(4102), false);
  assert.deepEqual(m.activeDropProducts(all).map((item) => item.wooProductId), m.AW26_PRODUCT_IDS);
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
  for (const path of ['/archive', '/journal', '/city', '/people', '/collab']) assert.doesNotMatch(navigation, new RegExp(path.replaceAll('/', '\\/')));
  assert.match(navigation, /\.\.\.\(DROP_VISIBLE \? \[\{ href: "\/collections\/drop", label: "DROP" \}\] : \[\]\)/);

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

test('home keeps the approved Hero before the native-scroll Three.js city and Core reveal', () => {
  const home = read('app/page.tsx');
  const city = read('components/home/CityExperience.tsx');
  const scene = read('components/three/HeroScene.tsx');
  const canvas = read('components/three/SceneCanvas.tsx');
  const layout = read('app/layout.tsx');
  assert.match(home, /HOME_AW26_VISIBLE \? <Aw26Hero product=\{aw26\[0\]\} \/> : <Hero product=\{hero\} \/>/);
  assert.ok(home.indexOf('HOME_AW26_VISIBLE ? <Aw26Hero') < home.indexOf('<CityExperience />'));
  assert.ok(home.indexOf('<CityExperience />') < home.indexOf('id="aw26-drop"'));
  assert.ok(home.indexOf('id="aw26-drop"') < home.indexOf('data-testid="core-reveal"'));
  assert.match(home, /data-testid="core-reveal"/);
  assert.match(home, /HOME_AW26_VISIBLE \? "border-t border-graphite pt-12 sm:pt-16"/);
  assert.ok(home.indexOf('-mt-[16svh]') < home.indexOf('data-testid="core-reveal"'));
  assert.match(home, /scene=\{HOME_AW26_VISIBLE \? "04 — Permanent pieces" : "03 — Permanent pieces"\}/);
  assert.match(city, /dynamic\(/);
  assert.match(city, /components\/three\/HeroScene/);
  assert.match(city, /<HeroScene progress=\{scrollYProgress\}/);
  assert.match(city, /sticky top-0 h-\[100svh\]/);
  assert.match(city, /h-\[190svh\]/);
  assert.match(city, /md:h-\[260svh\]/);
  assert.match(city, /motion-reduce:h-\[110svh\]/);
  assert.match(city, /offset: \["start start", "end end"\]/);
  assert.doesNotMatch(city, /preventDefault|wheel|touchmove|scrollTo/);
  assert.doesNotMatch(layout, /SmoothScroll/);
  assert.match(layout, /overflow-x-clip/);
  assert.doesNotMatch(layout, /overflow-x-hidden/);
  assert.match(city, /interact3D\("hero-city", "pointer"\)/);
  assert.match(scene, /function Buildings/);
  assert.match(scene, /function Monoliths/);
  assert.match(scene, /function Dust/);
  assert.match(scene, /function CameraRig/);
  assert.match(scene, /CITY_CAMERA_START/);
  assert.match(scene, /CITY_CAMERA_MID/);
  assert.match(scene, /CITY_CAMERA_END/);
  assert.match(scene, /CITY_CAMERA_MID_MOBILE/);
  assert.match(scene, /CITY_CAMERA_END_MOBILE/);
  assert.match(scene, /CITY_CAMERA_TARGET_END/);
  assert.match(scene, /progress <= 0\.12/);
  assert.match(scene, /progress <= 0\.2/);
  assert.match(scene, /progress <= 0\.68/);
  assert.match(scene, /progress <= 0\.82/);
  assert.match(scene, /size\.width < 768/);
  assert.match(canvas, /IntersectionObserver/);
  assert.match(canvas, /frameloop=\{visible && !pageHidden \? "always" : "never"\}/);
  assert.match(canvas, /dpr=\{\[1, 1\.5\]\}/);
});

test('home merchandising is centralized, public and visually non-repetitive', () => {
  const m = merchandising();
  const home = homeMerchandising();
  const publicIds = new Set(m.PUBLIC_STORE_PRODUCT_IDS);

  assert.equal(home.HOME_HERO_PRODUCT_IDS[0], 3292);
  assert.deepEqual(home.HOME_AW26_PRODUCT_IDS, m.AW26_PRODUCT_IDS);
  assert.equal(home.HOME_AW26_VISIBLE, true);
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
  assert.deepEqual(
    home.homeAw26Products(m.AW26_PRODUCT_IDS.map(product)).map((item) => item.wooProductId),
    m.AW26_PRODUCT_IDS,
  );
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
  const search = read('components/SearchOverlay.tsx');
  const robots = read('app/robots.ts');
  assert.match(shop, /publicStoreProducts/);
  assert.match(grid, /ALL/);
  assert.match(grid, /CORE/);
  assert.match(grid, /hasDrop \? \[\{ slug: "DROP", name: "Drop" \}\] : \[\]/);
  assert.match(collection, /coreProducts/);
  assert.match(collection, /activeDropProducts/);
  assert.match(collection, /slug === "drop" && !DROP_VISIBLE/);
  assert.match(collection, /Permanent Lock City pieces built around the lock/);
  assert.match(productPage, /commerce\.getRelatedProducts/);
  assert.match(productPage, /noIndex: !isPublicStoreProduct/);
  assert.match(productPage, /!product \|\| !isPublicStoreProduct\(product\.wooProductId\)/);
  assert.match(search, /matches\.filter\(\(product\) => isPublicStoreProduct\(product\.id\)\)/);
  assert.match(robots, /!DROP_VISIBLE \? \["\/collections\/drop"\] : \[\]/);
});
