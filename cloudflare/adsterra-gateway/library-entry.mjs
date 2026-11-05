import original from './worker.js';
import { adsterraResponse } from './patro-adsterra.mjs';
import { libraryArticleLayout } from './library-article-layout.mjs';
export * from './worker.js';
const LIBRARY_STYLE = 'https://library-assets.aafnaipatro.com/phase1/static/library.css';
export function addLibraryStyleHint(request, response) {
  if (!['GET','HEAD'].includes(request.method) || response.status !== 200 ||
      !/^\/(?:article|research)\/[a-z0-9-]+\/?$/i.test(new URL(request.url).pathname) ||
      !(response.headers.get('content-type') || '').toLowerCase().includes('text/html')) return response;
  const headers = new Headers(response.headers);
  if (!(headers.get('link') || '').includes(LIBRARY_STYLE))
    headers.append('link', `<${LIBRARY_STYLE}>; rel=preload; as=style`);
  return new Response(response.body, {status:response.status, statusText:response.statusText, headers});
}
export default {
  ...original,
  async fetch(request, env, ctx) {
    const decorated = await libraryArticleLayout(request, adsterraResponse(request, await original.fetch(request, env, ctx), env), env);
    return addLibraryStyleHint(request, decorated);
  },
};
