/**
 * Shared, build-time SEO vocabulary for all public AafnaiPatro browser tools.
 * Keep canonical URLs and runtime identifiers unchanged: titles are presentation,
 * not identity. Call only for products that are genuinely free to use.
 */
const compact = value => String(value ?? "").replace(/\s+/g, " ").trim();

export function freeToolName(name) {
  const value = compact(name);
  if (!value) throw new Error("Tool title must not be empty");
  return /^free(?:\s|$)/i.test(value) ? value : `Free ${value}`;
}

export function freeToolSeoTitle(name, { brand = "AafnaiPatro" } = {}) {
  const title = freeToolName(name);
  // Keep long, specific tool names intact rather than cutting off distinguishing words.
  return title.length + brand.length + 3 <= 72 ? `${title} | ${brand}` : title;
}

export function freeToolDescription(description, { limit = 160 } = {}) {
  const original = compact(description);
  if (!original) throw new Error("Tool meta description must not be empty");
  const lead = /\bfree\b/i.test(original) ? "" : "Free to use online. ";
  if ((lead + original).length <= limit) return lead + original;
  // Prefer an actual sentence over cutting a specific claim in half.
  const maxBody = limit - lead.length;
  const sentences = [...original.matchAll(/[.!?](?=\s|$)/g)]
    .map(match => original.slice(0, match.index + 1))
    .filter(value => value.length >= 55 && value.length <= maxBody);
  if (sentences.length) return lead + sentences.at(-1);
  // If the first sentence alone is too long, shorten at a word boundary.
  let bounded = original.slice(0, Math.max(1, maxBody - 1))
    .replace(/\s+\S*$/, "").replace(/[\s,;:—–-]+$/, "");
  // An incomplete conjunction or preposition is not a valid standalone sentence.
  // Remove only the dangling ending; never introduce new claims or terminology.
  const dangling = /(?:\s+|^)(?:and|or|an|a|the|to|for|with|of|in|on|by|from|as|at|into|via|under|without|versus|per|over|than|against|using|including|such|based|while|where|that|which|when|your)\s*$/i;
  while (dangling.test(bounded)) bounded = bounded.replace(dangling, "").replace(/[\s,;:—–-]+$/, "");
  return lead + bounded + (/[.!?]$/.test(bounded) ? "" : ".");
}

export function freeToolLabel(name) {
  return freeToolName(name);
}
