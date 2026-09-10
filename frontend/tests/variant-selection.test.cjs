const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const filename = join(__dirname, '../lib/variant-selection.ts');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
compiled._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { canPurchaseVariant, findExactVariant, getVariantOptions, variantSelection } = compiled.exports;
const variant = (id, color, size, extra = {}) => ({
  id: `woo-${id}`, wooVariationId: id, detailsState: 'resolved', status: 'AVAILABLE', price: 60,
  availability: { is_in_stock: true, is_purchasable: true },
  attributes: [{ name: 'Color', value: color }, { name: 'Size', value: size }], size, color, ...extra,
});

test('selecting color and size resolves one exact WooCommerce variation ID', () => {
  const variants = [variant(10, 'black', 's'), variant(11, 'black', 'm'), variant(12, 'red', 's')];
  assert.equal(findExactVariant(variants, { color: 'black', size: 'm' }).wooVariationId, 11);
  assert.equal(findExactVariant(variants, { color: 'red', size: 'm' }), undefined);
  assert.equal(findExactVariant(variants, { color: 'black' }), undefined);
  assert.deepEqual(variantSelection(variants[2]), { color: 'red', size: 's' });
  assert.deepEqual(getVariantOptions(variants), [
    { key: 'color', name: 'Color', values: ['black', 'red'] },
    { key: 'size', name: 'Size', values: ['s', 'm'] },
  ]);
});

test('sold-out, non-purchasable, unresolved and invalid combinations cannot be purchased', () => {
  assert.equal(canPurchaseVariant(variant(10, 'black', 's')), true);
  assert.equal(canPurchaseVariant(variant(11, 'black', 'm', { status: 'SOLD_OUT', availability: { is_in_stock: false, is_purchasable: true } })), false);
  assert.equal(canPurchaseVariant(variant(12, 'red', 's', { availability: { is_in_stock: true, is_purchasable: false } })), false);
  assert.equal(canPurchaseVariant(variant(13, 'red', 'm', { detailsState: 'unresolved' })), false);
  assert.equal(canPurchaseVariant(undefined), false);
});
