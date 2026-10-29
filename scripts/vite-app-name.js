import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { APP_MOUNT, readAppName, personalizeHtml, personalizeManifest } from '../src/app-name.js';

// Mirror the Worker metadata endpoints in both Vite development and preview.
export function appNamePlugin() {
 function middleware(htmlPath) {
  return async (request, response, next) => {
   try {
    if (!['GET', 'HEAD'].includes(request.method)) return next();
    const url = new URL(request.url, 'http://localhost');
    const name = readAppName(url);
    if (!name) return next();
    let body, contentType;
    if (url.pathname === APP_MOUNT + 'manifest.webmanifest') {
     const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
     body = JSON.stringify(personalizeManifest(manifest, name));
     contentType = 'application/manifest+json; charset=utf-8';
    } else if (htmlPath && [APP_MOUNT, APP_MOUNT + 'index.html'].includes(url.pathname)) {
     body = personalizeHtml(await readFile(htmlPath, 'utf8'), name);
     contentType = 'text/html; charset=utf-8';
    } else return next();
    response.statusCode = 200;
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.end(request.method === 'HEAD' ? undefined : body);
   } catch (error) { next(error); }
  };
 }
 return {
  name: 'home-screen-app-name',
  configureServer(server) { server.middlewares.use(middleware()); },
  configurePreviewServer(server) {
   server.middlewares.use(middleware(resolve(server.config.root, server.config.build.outDir, 'index.html')));
  },
  transformIndexHtml(html, context) {
   const name = readAppName(new URL(context.originalUrl || context.path, 'http://localhost'));
   return name ? personalizeHtml(html, name) : html;
  }
 };
}
