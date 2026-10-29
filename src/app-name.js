export const DEFAULT_APP_NAME = 'Lá Thu Chi';
export const APP_NAME_PARAM = 'app_name';
export const APP_MOUNT = '/chitieucanhan/';
export const MAX_APP_NAME_LENGTH = 40;

export function normalizeAppName(value) {
 if (typeof value !== 'string') throw new Error('Vui lòng nhập tên ứng dụng.');
 const name = value.normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f]/gu, ' ').replace(/\s+/gu, ' ').trim();
 if (!name) throw new Error('Vui lòng nhập tên ứng dụng.');
 if (Array.from(name).length > MAX_APP_NAME_LENGTH) throw new Error('Tên ứng dụng tối đa 40 ký tự.');
 return name;
}

export function readAppName(url) {
 try { return normalizeAppName(url.searchParams.get(APP_NAME_PARAM)); }
 catch { return ''; }
}

function nameQuery(name) {
 return new URLSearchParams({ [APP_NAME_PARAM]: normalizeAppName(name) }).toString();
}

export function manifestUrlForName(name) {
 return APP_MOUNT + 'manifest.webmanifest?' + nameQuery(name);
}

export function appUrlForName(name, href) {
 const url = new URL(APP_MOUNT, href);
 url.search = nameQuery(name);
 url.hash = 'install';
 return url.href;
}

export function personalizeManifest(manifest, value) {
 const name = normalizeAppName(value);
 return {
  ...manifest,
  name,
  short_name: name,
  start_url: APP_MOUNT + '?' + nameQuery(name),
  icons: manifest.icons.map(icon => ({ ...icon, src: new URL(icon.src, 'https://app.invalid' + APP_MOUNT).pathname }))
 };
}

function escapeAttribute(value) {
 const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
 return value.replace(/[&<>"']/gu, character => entities[character]);
}

// These two double-quoted tags are owned by index.html; use callbacks so user
// names containing replacement patterns such as $& always remain literal text.
export function personalizeHtml(html, value) {
 const name = normalizeAppName(value);
 return html
  .replace(/<meta\b(?=[^>]*\bname="apple-mobile-web-app-title")[^>]*>/i,
   () => '<meta name="apple-mobile-web-app-title" content="' + escapeAttribute(name) + '">')
  .replace(/<link\b(?=[^>]*\brel="manifest")[^>]*>/i,
   () => '<link rel="manifest" href="' + escapeAttribute(manifestUrlForName(name)) + '">');
}
