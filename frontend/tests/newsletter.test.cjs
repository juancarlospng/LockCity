const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');

const filename = join(__dirname, '../lib/newsletter-core.ts');
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = module.paths;
compiled._compile(ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);

const {
  BREVO_DOI_ENDPOINT,
  BrevoDoubleOptInProvider,
  buildDoubleOptInPayload,
  parseBrevoConfig,
  parseJoinPayload,
} = compiled.exports;

const config = {
  apiKey: 'test-key-never-sent',
  listId: 2,
  templateId: 1,
  redirectionUrl: 'https://lock-city.vercel.app/join/confirmed',
};

test('valid consent builds the exact Double Opt-In request with a normalized email', async () => {
  let call;
  const provider = new BrevoDoubleOptInProvider(config, async (url, init) => {
    call = { url, init, body: JSON.parse(init.body) };
    return new Response(null, { status: 201 });
  });
  const request = parseJoinPayload({ email: '  Person@Example.COM ', consent: true, website: '' });
  assert.deepEqual(request, { email: 'person@example.com', consent: true });
  assert.deepEqual(await provider.subscribe(request), { status: 'pending_confirmation' });
  assert.equal(call.url, BREVO_DOI_ENDPOINT);
  assert.equal(call.init.headers['api-key'], config.apiKey);
  assert.deepEqual(call.body, {
    email: 'person@example.com', includeListIds: [2], templateId: 1,
    redirectionUrl: 'https://lock-city.vercel.app/join/confirmed',
  });
});

test('configuration requires all server-side values and an absolute safe confirmation URL', () => {
  assert.deepEqual(parseBrevoConfig({
    BREVO_API_KEY: 'private', BREVO_LIST_ID: '2', BREVO_DOI_TEMPLATE_ID: '1',
  }), { ...config, apiKey: 'private' });
  assert.equal(parseBrevoConfig({ BREVO_API_KEY: 'private', BREVO_LIST_ID: '2' }), undefined);
  assert.equal(parseBrevoConfig({
    BREVO_API_KEY: 'private', BREVO_LIST_ID: '2', BREVO_DOI_TEMPLATE_ID: '1',
    BREVO_DOI_REDIRECT_URL: 'javascript:alert(1)',
  }), undefined);
  assert.deepEqual(buildDoubleOptInPayload('A@EXAMPLE.COM', config).includeListIds, [2]);
});

test('invalid email, missing consent, honeypot and unexpected fields are rejected', () => {
  assert.throws(() => parseJoinPayload({ email: 'invalid', consent: true }), /invalid_email/);
  assert.throws(() => parseJoinPayload({ email: 'a@example.com', consent: false }), /consent_required/);
  assert.throws(() => parseJoinPayload({ email: 'a@example.com', consent: true, website: 'bot.test' }), /honeypot/);
  assert.throws(() => parseJoinPayload({ email: 'a@example.com', consent: true, language: 'en' }), /invalid_payload/);
});

test('provider errors stay internal and identify an incompatible DOI template without exposing its response', async () => {
  const generic = new BrevoDoubleOptInProvider(config, async () => new Response('private provider detail', { status: 400 }));
  assert.deepEqual(await generic.subscribe({ email: 'a@example.com', consent: true }), { status: 'error', reason: 'provider' });
  const template = new BrevoDoubleOptInProvider(config, async () => new Response('Template is not Double opt-in compatible', { status: 400 }));
  assert.deepEqual(await template.subscribe({ email: 'a@example.com', consent: true }), { status: 'error', reason: 'doi_template' });
});

test('public UI protects double submit and shows only customer-safe states', () => {
  const component = readFileSync(join(__dirname, '../components/Newsletter.tsx'), 'utf8');
  const route = readFileSync(join(__dirname, '../app/join/route.ts'), 'utf8');
  assert.match(component, /if \(submitting\.current\) return/);
  assert.match(component, /disabled=\{state === "loading" \|\| !consent\}/);
  assert.match(component, /Check your inbox/i);
  assert.match(component, /Confirm your place in The City/);
  assert.match(component, /We couldn’t complete your request right now/);
  assert.match(component, /href="\/privacy"/);
  assert.doesNotMatch(component, /BREVO_API_KEY|Brevo|status code|HTTP/i);
  assert.match(route, /MAX_JOIN_BODY_BYTES/);
  assert.doesNotMatch(route, /body\.email|console\.log/);
});

test('the private key is referenced only by server-side newsletter code', () => {
  const server = readFileSync(join(__dirname, '../lib/newsletter.ts'), 'utf8');
  const client = readFileSync(join(__dirname, '../components/Newsletter.tsx'), 'utf8');
  assert.match(server, /import "server-only"/);
  assert.match(server, /process\.env/);
  assert.doesNotMatch(client, /BREVO_API_KEY|process\.env/);
});
