// original.mjs is the exact previously deployed independent Worker source.
import original from './original.mjs';
import {addAdvancedToolDiscovery} from './advanced-tool-discovery.mjs';
export * from './original.mjs';
export default {
  ...original,
  async fetch(request, env, ctx) {
    return addAdvancedToolDiscovery(request, await original.fetch(request, env, ctx));
  },
};
