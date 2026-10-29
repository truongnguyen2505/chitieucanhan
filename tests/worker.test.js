import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { readFileSync } from 'node:fs';

test('mount redirects to a trailing slash and preserves the query',async()=>{
 const response=await worker.fetch(new Request('https://truongparker.io.vn/chitieucanhan?test=1'),{});
 assert.equal(response.status,308);
 assert.equal(response.headers.get('Location'),'https://truongparker.io.vn/chitieucanhan/?test=1');
});
test('mount serves the index and assets with the prefix removed',async()=>{
 for(const [path,expected] of [['/chitieucanhan/','/'],['/chitieucanhan/assets/app.js?v=1','/assets/app.js?v=1'],['/chitieucanhan/manifest.webmanifest','/manifest.webmanifest'],['/chitieucanhan/icons/apple-touch-icon.png','/icons/apple-touch-icon.png'],['/chitieucanhan/icons/app-192.png','/icons/app-192.png'],['/chitieucanhan/icons/app-512.png','/icons/app-512.png'],['/chitieucanhan/icons/app-maskable-512.png','/icons/app-maskable-512.png']]){
  let received;
  const env={ASSETS:{fetch:async request=>{received=request;return new Response('asset');}}};
  const response=await worker.fetch(new Request(`https://truongparker.io.vn${path}`,{method:'HEAD'}),env);
  assert.equal(await response.text(),'asset');
  assert.equal(received.url,`https://truongparker.io.vn${expected}`);
  assert.equal(received.method,'HEAD');
 }
});
test('root site and similar prefixes are outside this worker',async()=>{
 for(const path of ['/','/assets/main.js','/chitieucanhan-other','/chitieucanhan2/']){
  const response=await worker.fetch(new Request(`https://truongparker.io.vn${path}`),{});
  assert.equal(response.status,404);
 }
});

const defaultManifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
const defaultHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function personalUrl(path, name) {
 const url = new URL('https://truongparker.io.vn/chitieucanhan/' + path);
 url.searchParams.set('app_name', name);
 return url;
}
function templateAssets(received = []) {
 return { ASSETS: { fetch: async request => {
  received.push(request);
  if (request.headers.has('if-none-match') || request.headers.has('if-modified-since')) return new Response(null, { status: 304 });
  const manifest = new URL(request.url).pathname === '/manifest.webmanifest';
  return new Response(manifest ? JSON.stringify(defaultManifest) : defaultHtml, { headers: {
   'Content-Type': manifest ? 'application/manifest+json' : 'text/html',
   ETag: 'template-etag',
   'Last-Modified': 'Thu, 29 Oct 2026 00:00:00 GMT',
   'Content-Length': '100',
   'Content-Encoding': 'gzip',
   'CDN-Cache-Control': 'public, max-age=3600',
   'Cache-Control': 'public, max-age=3600'
  }});
 }}};
}

test('different people receive their own app name while retaining the same app identity', async () => {
 const env = templateAssets();
 for (const name of ['Ví gia đình', 'Quỹ 50/50']) {
  const response = await worker.fetch(new Request(personalUrl('manifest.webmanifest', name)), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/manifest\+json/);
  const manifest = await response.json();
  assert.equal(manifest.name, name);
  assert.equal(manifest.short_name, name);
  assert.equal(manifest.id, defaultManifest.id);
  assert.equal(manifest.scope, defaultManifest.scope);
  const startup = new URL(manifest.start_url, 'https://truongparker.io.vn');
  assert.equal(startup.pathname, '/chitieucanhan/');
  assert.equal(startup.searchParams.get('app_name'), name);
  assert.ok(manifest.icons.every(icon => icon.src.startsWith('/chitieucanhan/icons/')));
 }
 assert.notEqual(defaultManifest.name, 'Ví gia đình');
});

test('personalized HTML uses the matching Apple name and manifest without allowing markup injection', async () => {
 const name = 'Ví "><img src=x> & $&';
 const response = await worker.fetch(new Request(personalUrl('', name)), templateAssets());
 const html = await response.text();
 assert.ok(html.includes('content="Ví &quot;&gt;&lt;img src=x&gt; &amp; $&amp;"'));
 assert.ok(!html.includes('<img src=x>'));
 const manifestHref = html.match(/<link rel="manifest" href="([^"]+)"/)[1];
 const manifestUrl = new URL(manifestHref, 'https://truongparker.io.vn');
 assert.equal(manifestUrl.pathname, '/chitieucanhan/manifest.webmanifest');
 assert.equal(manifestUrl.searchParams.get('app_name'), name);
});

test('personalized metadata ignores template validators and is never cached as a shared response', async () => {
 for (const path of ['', 'manifest.webmanifest']) {
  for (const method of ['GET', 'HEAD']) {
   const received = [];
   const request = new Request(personalUrl(path, 'Sổ của An'), { method, headers: {
    'If-None-Match': 'template-etag', 'If-Modified-Since': 'Thu, 29 Oct 2026 00:00:00 GMT'
   }});
   const response = await worker.fetch(request, templateAssets(received));
   assert.equal(response.status, 200);
   assert.equal(received[0].method, 'GET');
   assert.equal(received[0].headers.has('if-none-match'), false);
   assert.equal(received[0].headers.has('if-modified-since'), false);
   assert.equal(response.headers.get('cache-control'), 'private, no-store');
   for (const header of ['etag', 'last-modified', 'content-length', 'content-encoding', 'cdn-cache-control']) assert.equal(response.headers.has(header), false);
   if (method === 'HEAD') assert.equal(await response.text(), '');
   else assert.ok((await response.text()).length > 0);
  }
 }
});

test('missing or invalid names keep the default template metadata', async () => {
 for (const name of [null, '', '   ', 'A'.repeat(41)]) {
  const url = new URL('https://truongparker.io.vn/chitieucanhan/manifest.webmanifest');
  if (name !== null) url.searchParams.set('app_name', name);
  const response = await worker.fetch(new Request(url), templateAssets());
  assert.deepEqual(await response.json(), defaultManifest);
  assert.equal(response.headers.get('etag'), 'template-etag');
 }
});

test('a named HEAD response never includes an upstream error body', async () => {
 const env = { ASSETS: { fetch: async () => new Response('Missing', { status: 404 }) } };
 const response = await worker.fetch(new Request(personalUrl('missing', 'My Ledger'), { method: 'HEAD' }), env);
 assert.equal(response.status, 404);
 assert.equal(await response.text(), '');
});
