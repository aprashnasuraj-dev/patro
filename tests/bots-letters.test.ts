import { describe, expect, it } from 'vitest';
import { parseIntent } from '../src/patro-tools/bots/intents';
import { reply } from '../src/patro-tools/bots/responder';
import { openWithPassphrase, openWithServerKey, sealWithPassphrase, sealWithServerKey, b64 } from '../src/patro-tools/letters/crypto';
import { lockState } from '../src/patro-tools/letters/letters';
import type { BsAdapter } from '../src/patro-tools/core/types';

// Test-only adapter valid for Sep–Oct 2026 (13 Ashwin 2083 = 2026-09-29). Use your real converter in the app.
const fakeBs: BsAdapter = {
  toBS: ({ year, month, day }) => {
    const diff = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(2026, 8, 29)) / 86_400_000);
    return { year: 2083, month: 6, day: 13 + diff };
  },
  toAD: ({ day }) => { const d = new Date(Date.UTC(2026, 8, 29 + day - 13)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }; },
};

describe('intents', () => {
  it.each([
    ['aaja', 'today'], ['आज को मिति', 'today'], ['bholi', 'tomorrow'], ['dashain kahile?', 'festival'],
    ['तिहार कहिले', 'festival'], ['२०८३-०६-१३', 'convert'], ['mesh rashifal', 'rashifal'],
    ['सुरु', 'subscribe'], ['रोक', 'unsubscribe'], ['hello', 'help'],
  ])('%s → %s', (q, type) => {
    expect(parseIntent(q).type).toBe(type);
    expect(parseIntent(`  ${q} !!!  `).type).toBe(type); // surrounding whitespace/punctuation must be harmless
  });
  it('BS year heuristic', () => {
    expect(parseIntent('2083-06-13')).toMatchObject({ type: 'convert', direction: 'bs2ad', y: 2083, m: 6, d: 13 });
    expect(parseIntent('2026-09-29')).toMatchObject({ type: 'convert', direction: 'ad2bs', y: 2026, m: 9, d: 29 });
    expect(parseIntent('२०८३/६/१३')).toMatchObject({ type: 'convert', direction: 'bs2ad', y: 2083, m: 6, d: 13 });
  });
});

describe('responder', () => {
  it('today card', async () => {
    const deps = { bs: fakeBs, appUrl: 'https://aafnaipatro.test' };
    const text = await reply({ type: 'today' }, deps, new Date('2026-09-29T02:00:00Z'));
    expect(text).toContain('२०८३ असोज १३');
    expect(text).toContain('आश्विन कृष्ण तृतीया');
    expect(text).toContain('पूरा पात्रो: https://aafnaipatro.test');
    const tomorrow = await reply({ type: 'tomorrow' }, deps, new Date('2026-09-29T02:00:00Z'));
    expect(tomorrow).toContain('भोलि');
    expect(tomorrow).toContain('2026-09-30');
    expect(await reply({ type: 'convert', direction: 'bs2ad', y: 2083, m: 6, d: 13 }, deps)).toContain('2026-09-29');
    expect(await reply({ type: 'rashifal', rashi: 0 }, deps, new Date('2026-09-29T02:00:00Z'))).toBe('राशिफल: https://aafnaipatro.test/jyotish/rashifal');
    expect(await reply({ type: 'subscribe' }, deps)).toContain('हरेक बिहान ६ बजे');
    expect(await reply({ type: 'unsubscribe' }, deps)).toContain('बन्द गरियो');
    expect(await reply({ type: 'help' }, deps)).toContain('आज / aaja');
  });
  it('festival countdown', async () => {
    const text = await reply(parseIntent('dashain kahile'), { bs: fakeBs, appUrl: 'https://x' }, new Date('2026-09-29T02:00:00Z'));
    expect(text).toContain('2026-10-21');
    expect(text).toContain('२२ दिन बाँकी');
    expect(text.split('\n')).toHaveLength(2);
    expect(text).not.toContain('- दिन बाँकी');
  });
});

describe('letters', () => {
  it('passphrase seal round-trip; wrong passphrase fails', async () => {
    const message = 'प्रिय छोरी, १६ औं जन्मदिनको शुभकामना!';
    const passphrase = 'हजुरआमाको गाउँ';
    const s = await sealWithPassphrase(message, passphrase);
    const s2 = await sealWithPassphrase(message, passphrase);
    expect(s).toMatchObject({ mode: 'passphrase' });
    expect(s.salt).toBeTruthy();
    expect(s.iv).not.toBe(s2.iv);
    expect(s.salt).not.toBe(s2.salt);
    expect(s.ciphertext).not.toBe(s2.ciphertext);
    expect(await openWithPassphrase(s, passphrase)).toBe(message);
    await expect(openWithPassphrase(s, 'wrong')).rejects.toThrow();
    const bytes = b64.decode(s.ciphertext); bytes[0] ^= 1;
    await expect(openWithPassphrase({ ...s, ciphertext: b64.encode(bytes) }, passphrase)).rejects.toThrow();
  });
  it('server seal bound to letter id', async () => {
    const key = b64.encode(crypto.getRandomValues(new Uint8Array(32)));
    const wrongKey = b64.encode(crypto.getRandomValues(new Uint8Array(32)));
    const s = await sealWithServerKey('hello', key, 'k1', 'id-1');
    expect(s).toMatchObject({ mode: 'server', kid: 'k1' });
    expect(await openWithServerKey(s, key, 'id-1')).toBe('hello');
    await expect(openWithServerKey(s, key, 'id-2')).rejects.toThrow();
    await expect(openWithServerKey(s, wrongKey, 'id-1')).rejects.toThrow();
    const bytes = b64.decode(s.ciphertext); bytes[0] ^= 1;
    await expect(openWithServerKey({ ...s, ciphertext: b64.encode(bytes) }, key, 'id-1')).rejects.toThrow();
  });
  it('lock state', () => {
    const now = new Date('2026-09-29T00:00:00Z');
    expect(lockState({ openAt: '2099-01-01T00:00:00Z' }, now).locked).toBe(true);
    expect(lockState({ openAt: '2020-01-01T00:00:00Z' }, now).locked).toBe(false);
    expect(lockState({ openAt: now.toISOString() }, now).locked).toBe(false); // exact unlock instant is open
    expect(lockState({ openAt: '2026-09-30T00:00:00Z' }, now)).toMatchObject({ locked: true, days: 1, label: '१ दिन बाँकी' });
  });
});
