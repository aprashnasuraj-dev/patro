// Cache API counters are best-effort, per Cloudflare colo. They are not a
// globally atomic billing cap. No raw IP, audio, or transcript is stored.
const locks = new Map<string, Promise<unknown>>();
export const SPEECH_LIMITS = { minute: 12, day: 240 };

export async function consumeSpeechQuota(request: Request, limits = SPEECH_LIMITS, now = Date.now()) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const hash = [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
  const key = 'https://patro.invalid/__speech-quota/' + hash;
  const previous = locks.get(key) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    try {
      const cache = (globalThis as any).caches?.default;
      if (!cache) return { allowed: false, unavailable: true, retryAfter: 60 };
      const minute = Math.floor(now / 60_000), day = Math.floor(now / 86_400_000);
      const hit = await cache.match(key);
      const old = hit ? await hit.json() : {};
      const row = {
        minute, minuteCount: old.minute === minute ? Number(old.minuteCount) || 0 : 0,
        day, dayCount: old.day === day ? Number(old.dayCount) || 0 : 0,
      };
      if (row.dayCount >= limits.day) return { allowed: false, retryAfter: Math.ceil(((day + 1) * 86_400_000 - now) / 1000) };
      if (row.minuteCount >= limits.minute) return { allowed: false, retryAfter: Math.ceil(((minute + 1) * 60_000 - now) / 1000) };
      row.minuteCount++; row.dayCount++;
      await cache.put(key, new Response(JSON.stringify(row), {
        headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' },
      }));
      return { allowed: true, retryAfter: 0 };
    } catch { return { allowed: false, unavailable: true, retryAfter: 60 }; }
  });
  locks.set(key, task);
  try { return await task; } finally { if (locks.get(key) === task) locks.delete(key); }
}
