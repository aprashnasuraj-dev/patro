import { adsterraResponse } from './patro-adsterra.mjs';
import { dateNativeLayout } from './date-native-layout.mjs';
import { addToolDiscovery } from './tool-discovery.mjs';
import { addAdDiagnostics } from './ad-diagnostics.mjs';

// The two existing service bindings and their routing remain unchanged.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const response = await (url.pathname.startsWith('/date/') ? env.DATE : env.ORIGIN).fetch(request);
    return addAdDiagnostics(request, addToolDiscovery(request, await dateNativeLayout(request, adsterraResponse(request, response, env))));
  },
};
