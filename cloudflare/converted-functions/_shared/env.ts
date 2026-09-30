import { env as cloudflareEnv } from "cloudflare:workers";

/**
 * Cloudflare-native replacement for Deno.env.get().
 * Works from request handlers, deeply nested modules, and top-level initialization.
 */
export function envGet(name: string): string | undefined {
  const value = (cloudflareEnv as unknown as Record<string, unknown>)[name];
  if (value === undefined || value === null) return undefined;
  return typeof value === "string" ? value : String(value);
}
