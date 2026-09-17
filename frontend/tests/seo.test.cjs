const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const read = (path) => readFileSync(join(__dirname, '..', path), 'utf8');

test('SEO origin and indexing switch stay server-side and default safely', () => {
  const seo = read('lib/seo.ts');
  const env = read('.env.example');
  assert.match(seo, /DEFAULT_SITE_URL = "https:\/\/lock-city\.vercel\.app"/);
  assert.match(seo, /process\.env\.SITE_URL/);
  assert.match(seo, /process\.env\.SEO_INDEXING_ENABLED === "true"/);
  assert.doesNotMatch(seo, /NEXT_PUBLIC_(SITE_URL|SEO_INDEXING)/);
  assert.match(env, /^SITE_URL=https:\/\/lock-city\.vercel\.app$/m);
  assert.match(env, /^SEO_INDEXING_ENABLED=false$/m);
});

test('global metadata uses the configured origin and title template', () => {
  const layout = read('app/layout.tsx');
  assert.match(layout, /metadataBase: siteUrl\(\)/);
  assert.match(layout, /template: `%s \| \$\{SITE_NAME\}`/);
  assert.match(layout, /robots: publicRobots\(\)/);
});

test('transactional and confirmation pages are explicitly noindex', () => {
  for (const path of [
    'app/checkout/page.tsx',
    'app/order-confirmation/page.tsx',
    'app/join/confirmed/page.tsx',
  ]) {
    assert.match(read(path), /noIndex: true/);
  }
});

test('robots permits crawling for noindex discovery and protects technical routes', () => {
  const robots = read('app/robots.ts');
  assert.match(robots, /allow: "\/"/);
  for (const route of ['/checkout', '/order-confirmation', '/join/confirmed', '/store/']) {
    assert.match(robots, new RegExp(route.replaceAll('/', '\\/')));
  }
  assert.match(robots, /sitemap: absoluteUrl\("\/sitemap\.xml"\)/);
});

test('sitemap includes public content and products but excludes private routes', () => {
  const sitemap = read('app/sitemap.ts');
  for (const route of ['/shop', '/city', '/shipping', '/returns', '/contact', '/privacy', '/terms']) {
    assert.match(sitemap, new RegExp(`"${route}"`));
  }
  assert.match(sitemap, /commerce\.getProducts\(\)/);
  assert.match(sitemap, /\/product\/\$\{encodeURIComponent\(product\.slug\)\}/);
  for (const route of ['/checkout', '/order-confirmation', '/join/confirmed']) {
    assert.doesNotMatch(sitemap, new RegExp(route));
  }
});

test('product and store structured data use real mapped fields without review claims', () => {
  const structured = read('lib/structured-data.ts');
  const productPage = read('app/product/[slug]/page.tsx');
  const home = read('app/page.tsx');
  assert.match(structured, /"@type": "Product"/);
  assert.match(structured, /product\.variants/);
  assert.match(structured, /variant\.availability/);
  assert.match(structured, /productImagePath\(product\.slug\)/);
  assert.doesNotMatch(structured, /product\.images\[0\]/);
  assert.match(structured, /"@type": "OnlineStore"/);
  assert.doesNotMatch(structured, /aggregateRating|reviewCount|ratingValue/);
  assert.match(productPage, /productStructuredData\(product\)/);
  assert.match(productPage, /productBreadcrumbData\(product\)/);
  assert.match(home, /onlineStoreStructuredData\(\)/);
});
