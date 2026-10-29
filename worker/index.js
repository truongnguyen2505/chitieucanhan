import { APP_MOUNT, readAppName, personalizeHtml, personalizeManifest } from '../src/app-name.js';

// Only the two /chitieucanhan routes are attached to the production domain.
const MOUNT = APP_MOUNT.slice(0, -1);

export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === MOUNT) {
   url.pathname = APP_MOUNT;
   return Response.redirect(url.toString(), 308);
  }
  if (!url.pathname.startsWith(APP_MOUNT)) return new Response('Not found', { status: 404 });
  const name = readAppName(url);
  url.pathname = url.pathname.slice(MOUNT.length);
  const personalize = name && (request.method === 'GET' || request.method === 'HEAD');
  const assetRequest = new Request(url, request);
  if (personalize) {
   // Template validators cannot validate a response whose name has changed.
   assetRequest.headers.delete('if-none-match');
   assetRequest.headers.delete('if-modified-since');
  }
  const response = await env.ASSETS.fetch(personalize ? new Request(assetRequest, { method: 'GET' }) : assetRequest);
  if (!personalize || !response.ok) return request.method === 'HEAD' && personalize ? new Response(null, response) : response;
  let body;
  let contentType;
  if (url.pathname === '/manifest.webmanifest') {
   body = JSON.stringify(personalizeManifest(await response.json(), name));
   contentType = 'application/manifest+json; charset=utf-8';
  } else if (response.headers.get('content-type')?.includes('text/html')) {
   body = personalizeHtml(await response.text(), name);
   contentType = 'text/html; charset=utf-8';
  } else {
   return request.method === 'HEAD' ? new Response(null, response) : response;
  }
  const headers = new Headers(response.headers);
  for (const header of ['etag', 'last-modified', 'content-length', 'content-encoding', 'cdn-cache-control', 'cloudflare-cdn-cache-control']) headers.delete(header);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Content-Type', contentType);
  return new Response(request.method === 'HEAD' ? null : body, { status: response.status, headers });
 }
};
