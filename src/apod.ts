import type { ApodPayload } from "./types";

const ENTITY_MAP: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
};

function decodeEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      const raw = entity.slice(hex ? 2 : 1);
      const code = Number.parseInt(raw, hex ? 16 : 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    }
    return ENTITY_MAP[entity.toLowerCase()] ?? "";
  });
}

export function sanitizeApodText(value: unknown, maxLength = 6000) {
  const text = String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");
  return decodeEntities(text).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeApod(payload: ApodPayload | null | undefined): ApodPayload | null {
  if (!payload) return null;
  return {
    ...payload,
    title: sanitizeApodText(payload.title, 240),
    explanation: sanitizeApodText(payload.explanation, 6000),
    copyright: sanitizeApodText(payload.copyright, 300),
    fallback_reason: payload.fallback_reason ? sanitizeApodText(payload.fallback_reason, 300) : undefined,
  };
}
