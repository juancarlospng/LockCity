const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const read = (path) => readFileSync(join(__dirname, '..', path), 'utf8');

test('footer exposes every customer policy and contact route', () => {
  const footer = read('components/Footer.tsx');
  for (const route of ['/shop', '/shipping', '/returns', '/terms', '/privacy', '/contact']) {
    assert.match(footer, new RegExp(`href: "${route.replace('/', '\\/')}"`));
  }
});

test('checkout presents legal acknowledgements without technical customer copy', () => {
  const page = read('app/checkout/page.tsx');
  const form = read('components/CheckoutForm.tsx');
  for (const route of ['/terms', '/privacy', '/shipping', '/returns']) assert.match(form, new RegExp(`href="${route}"`));
  const renderedCopy = `${page}\n${form}`;
  for (const phrase of [
    'Loading WooCommerce checkout', 'WooCommerce will use', 'WooCommerce returned no shipping',
    'WooCommerce order summary', 'Gateway:', 'WooCommerce total', 'Live payment remains disabled',
  ]) assert.doesNotMatch(renderedCopy, new RegExp(phrase, 'i'));
});

test('contact form uses an honest mailto fallback and never claims delivery', () => {
  const page = read('app/contact/page.tsx');
  const form = read('components/ContactForm.tsx');
  assert.match(`${page}\n${form}`, /mailto:info@lockcityclothes\.com/);
  assert.match(form, /Send message/);
  assert.match(form, /Your email app should now be open/);
  assert.doesNotMatch(form, /message (was|has been) sent|successfully sent/i);
});

test('legal pages retain seller identity, consumer rights and the published privacy sections', () => {
  const terms = read('app/terms/page.tsx');
  const returns = read('app/returns/page.tsx');
  const privacy = read('app/privacy/page.tsx');
  assert.match(terms, /Lock City Clothes By Yanio Concepcion Jr\. SRL/);
  assert.match(terms, /Dominican Republic/);
  assert.match(returns, /mandatory consumer rights/);
  assert.match(privacy, /Your privacy rights/i);
  assert.match(privacy, /OpenAI/);
  assert.match(privacy, /Presidente Meriño, La Vega/);
});

test('order confirmation and bag avoid technical infrastructure copy', () => {
  const source = `${read('app/order-confirmation/page.tsx')}\n${read('components/CartDrawer.tsx')}`;
  for (const phrase of ['WooCommerce', 'gateway', 'server verification', 'Cart-Token']) {
    assert.doesNotMatch(source, new RegExp(phrase, 'i'));
  }
});
