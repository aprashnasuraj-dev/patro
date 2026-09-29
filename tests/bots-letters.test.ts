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
  ])('%s → %s', (q, type) => { expect(parseIntent(q).type).toBe(type); });
  it('BS year heuristic', () => {
    expect(parseIntent('2083-06-13')).toMatchObject({ direction: 'bs2ad' });
    expect(parseIntent('2026-09-29')).toMatchObject({ direction: 'ad2bs' });
  });
});

describe('responder', () => {
  it('today card', async () => {
    const text = await reply({ type: 'today' }, { bs: fakeBs, appUrl: 'https://x' }, new Date('2026-09-29T02:00:00Z'));
    expect(text).toContain('२०८३ असोज १३');
    expect(text).toContain('आश्विन कृष्ण तृतीया');
  });
  it('festival countdown', async () => {
    const text = await reply(parseIntent('dashain kahile'), { bs: fakeBs, appUrl: 'https://x' }, new Date('2026-09-29T02:00:00Z'));
    expect(text).toContain('2026-10-21');
    expect(text).toContain('२२ दिन बाँकी');
  });
});

describe('letters', () => {
  it('passphrase seal round-trip; wrong passphrase fails', async () => {
    const s = await sealWithPassphrase('प्रिय छोरी, १६ औं जन्मदिनको शुभकामना!', 'हजुरआमाको गाउँ');
    expect(await openWithPassphrase(s, 'हजुरआमाको गाउँ')).toContain('शुभकामना');
    await expect(openWithPassphrase(s, 'wrong')).rejects.toThrow();
  });
  it('server seal bound to letter id', async () => {
    const key = b64.encode(crypto.getRandomValues(new Uint8Array(32)));
    const s = await sealWithServerKey('hello', key, 'k1', 'id-1');
    expect(await openWithServerKey(s, key, 'id-1')).toBe('hello');
    await expect(openWithServerKey(s, key, 'id-2')).rejects.toThrow();
  });
  it('lock state', () => {
    expect(lockState({ openAt: '2099-01-01T00:00:00Z' }, new Date('2026-09-29')).locked).toBe(true);
    expect(lockState({ openAt: '2020-01-01T00:00:00Z' }).locked).toBe(false);
  });
});
