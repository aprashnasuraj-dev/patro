import { addLibrarySitemaps } from './sitemap-discovery.mjs';

// Exact routes only: forward the current root response, then add missing
// sitemap references. All existing robots rules and sitemap entries remain.
export default {
  async fetch(request, env) {
    const response = await env.ORIGIN.fetch(request);
    return addLibrarySitemaps(request, response);
  },
};
