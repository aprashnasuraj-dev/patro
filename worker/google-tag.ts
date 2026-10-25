import { GOOGLE_TAG_HTML, googleTagCsp } from "../shared/google-tag";

/** Streaming decoration: no storage reads, extra requests, or changes to asset-first routing. */
export function googleTagResponse(request: Request, response: Response): Response {
  const path = new URL(request.url).pathname;
  if (request.method !== "GET" || !response.headers.get("content-type")?.toLowerCase().includes("text/html") || /^\/(?:admin(?:-console)?|api)(?:\/|$)/.test(path)) return response;
  const headers = new Headers(response.headers);
  const csp = headers.get("content-security-policy");
  if (csp) headers.set("content-security-policy", googleTagCsp(csp));
  headers.delete("content-length");
  headers.delete("etag");
  const html = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  // @ts-ignore HTMLRewriter is provided by Cloudflare Workers.
  return new HTMLRewriter()
    .on("head", { element(el: any) { el.prepend(GOOGLE_TAG_HTML, { html: true }); } })
    // Inserted markup is not reprocessed by HTMLRewriter. Remove any copy already
    // present in the static/prerendered response so the config runs exactly once.
    .on("script[data-patro-google-tag]", { element(el: any) { el.remove(); } })
    .transform(html);
}
