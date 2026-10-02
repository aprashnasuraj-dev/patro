const AI_REFERRERS: Record<string,string> = {
  "chatgpt.com": "chatgpt",
  "www.chatgpt.com": "chatgpt",
  "perplexity.ai": "perplexity",
  "www.perplexity.ai": "perplexity",
  "gemini.google.com": "gemini",
  "copilot.microsoft.com": "copilot",
  "claude.ai": "claude",
  "www.claude.ai": "claude"
};

declare global {
  interface Window { gtag?: (...args: any[]) => void; }
}

export function detectAiReferral(referrer = document.referrer) {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    const source = AI_REFERRERS[host];
    return source ? { source, host } : null;
  } catch { return null; }
}

export function recordAiReferral() {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const referral = detectAiReferral();
  if (!referral) return null;
  const detail = { source: referral.source, referrer_host: referral.host, landing_path: location.pathname, event_source: "aafnai-patro" };
  try { window.dispatchEvent(new CustomEvent("patro:ai-referral", { detail })); } catch {}
  if (typeof window.gtag === "function") window.gtag("event", "ai_referral", detail);
  return detail;
}
