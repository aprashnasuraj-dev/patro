export const onRequest = async ({ request, env }) => {
  if (!env.PATRO_API || typeof env.PATRO_API.fetch !== "function") {
    return new Response(JSON.stringify({
      error: "patro_api_service_binding_missing",
      hint: "Bind PATRO_API to the mero-patro Worker in the Pages project."
    }), {
      status: 503,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }
  return env.PATRO_API.fetch(request);
};
