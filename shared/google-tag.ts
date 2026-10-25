// One source for the build-time static pages and the dynamic Worker responses.
export const GOOGLE_TAG_ID = "G-XF46HGE1WR";
export const GOOGLE_TAG_INIT = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${GOOGLE_TAG_ID}');
`;
export const GOOGLE_TAG_HTML = `<!-- Google tag (gtag.js) -->
<script data-patro-google-tag async src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_TAG_ID}"></script>
<script data-patro-google-tag>${GOOGLE_TAG_INIT}</script>`;

// Verified against GOOGLE_TAG_INIT in tests; allows only this inline initializer
// on pages such as Advanced Tools whose CSP otherwise disallows inline scripts.
export const GOOGLE_TAG_HASH = "'sha256-j4oVudpMyIko4ya+fKADa1wFFsjvbbYOAc+Iecdcizk='";

export function googleTagCsp(policy: string): string {
  if (!policy) return policy;
  const directives = new Map(policy.split(";").map(part => part.trim().split(/\s+/)).filter(([name]) => name).map(([name, ...values]) => [name.toLowerCase(), values]));
  function allow(name: string, sources: string[], fallback = "default-src") {
    const values = [...(directives.get(name) || directives.get(fallback) || [])].filter(value => value !== "'none'");
    directives.set(name, [...new Set([...values, ...sources])]);
  }
  for (const name of ["script-src", ...(directives.has("script-src-elem") ? ["script-src-elem"] : [])]) {
    const values = directives.get(name) || directives.get("script-src") || directives.get("default-src") || [];
    // Adding a hash beside unsafe-inline would disable the site's other inline scripts.
    const needsHash = !values.includes("'unsafe-inline'") || values.some(value => /^'(sha\d+-|nonce-)/.test(value));
    allow(name, ["https://www.googletagmanager.com", ...(needsHash ? [GOOGLE_TAG_HASH] : [])], name === "script-src" ? "default-src" : "script-src");
  }
  allow("connect-src", ["https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.analytics.google.com"]);
  allow("img-src", ["https://*.google-analytics.com", "https://www.googletagmanager.com"]);
  return [...directives].map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

export function installGoogleTag(html: string): string {
  if (!/<head\b[^>]*>/i.test(html)) return html;
  // Idempotent when the build is repeated or a prerenderer copied the SPA shell.
  const clean = html.replace(/<!-- Google tag \(gtag\.js\) -->\s*/g, "")
    .replace(/<script\b[^>]*\bdata-patro-google-tag\b[^>]*>[\s\S]*?<\/script>\s*/gi, "");
  if (/googletagmanager\.com\/gtag\/js|gtag\s*\(\s*['"]config['"]/.test(clean)) {
    throw new Error("Unmanaged Google tag found; consolidate it before publishing duplicate analytics.");
  }
  return clean.replace(/<head\b[^>]*>\s*/i, head => `${head.trimEnd()}\n${GOOGLE_TAG_HTML}\n`);
}
