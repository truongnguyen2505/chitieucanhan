// Only the two /chitieucanhan routes are attached to the production domain.
// Leave the root website and all other paths to their existing origin/Worker.
const MOUNT = '/chitieucanhan';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === MOUNT) {
      url.pathname = `${MOUNT}/`;
      return Response.redirect(url.toString(), 308);
    }
    if (!url.pathname.startsWith(`${MOUNT}/`)) {
      return new Response('Not found', { status: 404 });
    }
    // Vite emits URLs with the public prefix. Assets are stored at the root of
    // dist, so remove the prefix only when passing the request to the binding.
    url.pathname = url.pathname.slice(MOUNT.length);
    return env.ASSETS.fetch(new Request(url, request));
  }
};
