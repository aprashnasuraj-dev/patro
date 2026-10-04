// Encrypted storage for API keys (OpenAI, Anthropic, Gemini, Groq, Cloudflare...).
// Values are AES-GCM encrypted at rest and never returned to the browser —
// the UI only ever sees a masked hint like "sk-…Q7f2".
import { decryptSecret, encryptSecret, randomToken } from "./crypto";
import { all, first, getSetting, run, setSetting, type AdminEnv } from "./db";

export async function keyMaterial(env: AdminEnv) {
  if (typeof env.ADMIN_SECRET === "string" && env.ADMIN_SECRET.length >= 16) return env.ADMIN_SECRET;
  let generated = await getSetting<string | null>(env, "secrets.generated_kek", null);
  if (!generated) {
    generated = randomToken(32);
    await setSetting(env, "secrets.generated_kek", generated);
  }
  return generated;
}

export function maskSecret(value: string) {
  if (value.length <= 8) return "••••";
  return value.slice(0, 4) + "…" + value.slice(-4);
}

export async function putSecret(env: AdminEnv, name: string, value: string, by: string) {
  const enc = await encryptSecret(await keyMaterial(env), value);
  await run(
    env,
    "insert into aap_secrets(name,value_enc,hint,updated_at,updated_by) values(?1,?2,?3,?4,?5) on conflict(name) do update set value_enc=excluded.value_enc,hint=excluded.hint,updated_at=excluded.updated_at,updated_by=excluded.updated_by",
    name,
    enc,
    maskSecret(value),
    Date.now(),
    by
  );
}

export async function getSecret(env: AdminEnv, name: string): Promise<string | null> {
  const row = await first<{ value_enc: string }>(env, "select value_enc from aap_secrets where name=?1", name);
  if (!row) return null;
  try {
    return await decryptSecret(await keyMaterial(env), row.value_enc);
  } catch {
    return null; // ADMIN_SECRET changed — key must be re-entered
  }
}

export async function deleteSecret(env: AdminEnv, name: string) {
  await run(env, "delete from aap_secrets where name=?1", name);
}

export async function listSecretHints(env: AdminEnv) {
  const rows = await all<{ name: string; hint: string; updated_at: number; updated_by: string }>(
    env,
    "select name,hint,updated_at,updated_by from aap_secrets order by name"
  );
  return rows;
}

export function usingGeneratedKek(env: AdminEnv) {
  return !(typeof env.ADMIN_SECRET === "string" && env.ADMIN_SECRET.length >= 16);
}
