import { adsterraResponse } from './patro-adsterra.mjs';
import { dateNativeLayout } from './date-native-layout.mjs';

// The two existing service bindings and their routing remain unchanged.
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const response = await (url.pathname.startsWith('/date/') ? env.DATE : env.ORIGIN).fetch(request);
    return dateNativeLayout(request, adsterraResponse(request, response, env));
  },
};
