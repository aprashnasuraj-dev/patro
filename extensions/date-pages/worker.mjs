// Matching HTML is served by Static Assets before this handler: no Worker execution.
// Misses retain the complete archive, date normalization, methods and error responses.
export default {
  async fetch(request,env) {
    if(!new URL(request.url).pathname.startsWith('/date/'))return new Response('Not Found',{status:404});
    return env.ORIGIN.fetch(request);
  }
};
