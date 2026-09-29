/**
 * Name spelling consistency checker.
 *
 * Problem: the same person is "Shreshtha" on citizenship, "Shrestha" on the
 * passport, "Srestha" on the SEE certificate and "श्रेष्ठ" in Nepali records.
 * Visa, KYC and foreign-employment applications get rejected for this.
 *
 * Approach:
 *  1. Devanagari → Roman transliteration (so Nepali and English records compare)
 *  2. Phonetic key that collapses common Nepali romanization variants
 *  3. Token-level alignment (handles missing middle names and swapped order)
 */

const CONS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'w',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
};
const VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
};
const MATRAS: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
};
const VIRAMA = '्';

export function devanagariToRoman(input: string): string {
  const s = input.normalize('NFC').replace(/[\u200C\u200D]/g, '');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];
    if (CONS[ch]) {
      out += CONS[ch];
      if (next === VIRAMA) { i++; continue; }
      if (next && MATRAS[next]) { out += MATRAS[next]; i++; continue; }
      const isWordEnd = !next || !/[ऀ-ॿ]/.test(next);
      if (!isWordEnd) out += 'a';
      continue;
    }
    if (VOWELS[ch]) { out += VOWELS[ch]; continue; }
    if (ch === 'ं' || ch === 'ँ') { out += 'n'; continue; }
    if (ch === 'ः') { out += 'h'; continue; }
    out += ch;
  }
  return out;
}

export function nameKey(token: string): string {
  let t = token.toLowerCase();
  if (/[ऀ-ॿ]/.test(t)) t = devanagariToRoman(t);
  t = t.replace(/[^a-z]/g, '');
  t = t
    .replace(/ksh/g, 'x').replace(/x/g, 'ks')
    .replace(/chh/g, 'ch').replace(/sh/g, 's').replace(/ph/g, 'f')
    .replace(/w/g, 'v').replace(/z/g, 'j').replace(/q/g, 'k')
    .replace(/ee|ii/g, 'i').replace(/oo|uu/g, 'u').replace(/aa/g, 'a')
    .replace(/ou/g, 'au').replace(/y$/g, 'i')
    .replace(/(.)\1+/g, '$1')
    .replace(/(?<=[bcdfghjklmnpqrstvxz])h/g, '')
    .replace(/a$/g, '');
  return t;
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export type TokenVerdict = 'same' | 'spelling_variant' | 'similar' | 'different' | 'missing';

export interface NameComparison {
  a: string;
  b: string;
  verdict: 'match' | 'spelling_differs' | 'order_differs' | 'token_missing' | 'mismatch';
  details: { tokenA?: string; tokenB?: string; verdict: TokenVerdict }[];
  message: string;
}

function tokenVerdict(x: string, y: string): TokenVerdict {
  if (x.toLowerCase() === y.toLowerCase()) return 'same';
  const kx = nameKey(x);
  const ky = nameKey(y);
  const isDeva = (t: string) => /[\u0900-\u097F]/.test(t);
  if (kx === ky) return isDeva(x) !== isDeva(y) ? 'same' : 'spelling_variant';
  if (kx[0] !== ky[0]) return 'different';
  const d = levenshtein(kx, ky);
  return d <= Math.max(1, Math.floor(Math.max(kx.length, ky.length) / 5)) ? 'similar' : 'different';
}

const tokens = (s: string) => s.trim().split(/[\s.,]+/).filter(Boolean);

export function compareNames(a: string, b: string): NameComparison {
  const ta = tokens(a);
  const tb = tokens(b);
  const used = new Set<number>();
  const details: NameComparison['details'] = [];
  for (const x of ta) {
    let bestJ = -1;
    let best: TokenVerdict = 'different';
    const rank: Record<TokenVerdict, number> = { same: 0, spelling_variant: 1, similar: 2, different: 3, missing: 4 };
    tb.forEach((y, j) => {
      if (used.has(j)) return;
      const v = tokenVerdict(x, y);
      if (rank[v] < rank[best]) { best = v; bestJ = j; }
    });
    if (bestJ >= 0 && best !== 'different') { used.add(bestJ); details.push({ tokenA: x, tokenB: tb[bestJ], verdict: best }); }
    else details.push({ tokenA: x, verdict: 'missing' });
  }
  tb.forEach((y, j) => { if (!used.has(j)) details.push({ tokenB: y, verdict: 'missing' }); });

  const matched = details.filter((d) => d.tokenA && d.tokenB);
  const orderSame = matched.every((d, i) => tb.indexOf(d.tokenB!) >= (i ? tb.indexOf(matched[i - 1].tokenB!) : -1));
  let verdict: NameComparison['verdict'];
  let message: string;
  const missA = details.some((d) => d.verdict === 'missing' && d.tokenA);
  const missB = details.some((d) => d.verdict === 'missing' && d.tokenB);
  if ((missA && missB) || matched.length === 0) {
    verdict = 'mismatch'; message = 'नाम मेल खाँदैन — कागजात जाँच गर्नुहोस्।';
  } else if (details.some((d) => d.verdict === 'missing')) {
    verdict = 'token_missing'; message = 'एउटा कागजातमा बीचको/थर नाम छुटेको छ।';
  } else if (details.some((d) => d.verdict === 'spelling_variant' || d.verdict === 'similar')) {
    verdict = 'spelling_differs'; message = 'उच्चारण उस्तै तर हिज्जे फरक — भिसा/KYC मा समस्या आउन सक्छ। एउटै हिज्जे बनाउनुहोस्।';
  } else if (!orderSame) {
    verdict = 'order_differs'; message = 'नामको क्रम फरक छ।';
  } else {
    verdict = 'match'; message = 'मेल खान्छ ✓';
  }
  return { a, b, verdict, details, message };
}

export interface DocumentRecord {
  document: string;
  fullName: string;
  fatherName?: string;
  dobAD?: string;
}

export function crossCheck(records: DocumentRecord[]) {
  const results: { docs: [string, string]; field: string; comparison?: NameComparison; message?: string }[] = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const A = records[i];
      const B = records[j];
      results.push({ docs: [A.document, B.document], field: 'नाम', comparison: compareNames(A.fullName, B.fullName) });
      if (A.fatherName && B.fatherName) {
        results.push({ docs: [A.document, B.document], field: 'बाबुको नाम', comparison: compareNames(A.fatherName, B.fatherName) });
      }
      if (A.dobAD && B.dobAD && A.dobAD !== B.dobAD) {
        results.push({ docs: [A.document, B.document], field: 'जन्ममिति', message: `जन्ममिति फरक: ${A.dobAD} vs ${B.dobAD}` });
      }
    }
  }
  return results.filter((r) => r.message || r.comparison?.verdict !== 'match');
}
