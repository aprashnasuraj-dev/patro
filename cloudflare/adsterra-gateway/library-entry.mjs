import original from './worker.js';
import { adsterraResponse } from './patro-adsterra.mjs';
import { libraryArticleLayout } from './library-article-layout.mjs';
export * from './worker.js';
export default {
  ...original,
  async fetch(request, env, ctx) {
    return libraryArticleLayout(request, adsterraResponse(request, await original.fetch(request, env, ctx)));
  },
};
