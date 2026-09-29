export interface PreetiOptions {
  /** Some legacy keyboards used capital I as a visual short-i alias. Strict Preeti uses I for क्ष्. */
  capitalIAsShortI?: boolean;
}

const PREETI_MAP: Readonly<Record<string, string>> = Object.freeze({
  "v":"ख","r":"च","\"":"ू","~":"ञ्","z":"श","ç":"ॐ","f":"ा","b":"द","n":"ल","j":"व",
  "V":"ख्","R":"च्","ß":"द्म","^":"६","Z":"श्","F":"ँ","B":"द्य","N":"ल्","Ë":"ङ्ग","J":"व्",
  "6":"ट","2":"द्द","¿":"रू",">":"श्र",":":"स्","§":"ट्ट","&":"७","£":"घ्","•":"ड्ड",".":"।",
  "«":"्र","*":"८","„":"ध्र","w":"ध","s":"क","g":"न","æ":"“","c":"अ","o":"य","k":"प",
  "W":"ध्","S":"क्","[":"ृ","G":"न्","C":"ऋ","O":"इ","Î":"ङ्ख","K":"प्","7":"ठ","¶":"ठ्ठ",
  "3":"घ","9":"ढ","?":"रु",";":"स","'":"ु","#":"३","¢":"द्घ","/":"र","+":"ं","ª":"ङ","t":"त",
  "p":"उ","|":"्र","x":"ह","å":"द्व","d":"म","`":"ञ","h":"ज","T":"त्","P":"ए","X":"ह्",
  "D":"म्","@":"२","Í":"ङ्क","L":"ी","H":"ज्","4":"द्ध","0":"ण्","<":"?","8":"ड","¥":"र्‍",
  "$":"४","¡":"ज्ञ्",",":",","©":"र","(":"९","u":"ग","q":"त्र","}":"ै","y":"थ","e":"भ","a":"ब",
  "i":"ष्","‰":"झ्","U":"ग्","Q":"त्त","]":"े","Y":"थ्","Ø":"्य","E":"भ्","A":"ब्","M":"ः",
  "Ì":"न्न","I":"क्ष्","5":"छ","´":"झ","1":"ज्ञ","°":"ङ्ढ","=":".","‹":"ङ्घ","%":"५","¤":"झ्",
  "!":"१","-":"(","›":"द्र",")":"०","…":"‘","Æ":"”","Ú":"’","˜":"ऽ","÷":"/","±":"+"
});

const DIRECT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  kshe: "क्ष",
});

const DIRECT_ALIAS_KEYS = Object.keys(DIRECT_ALIASES);
const DEVANAGARI_CONSONANT = /[क-हक़-य़]/u;
const DEVANAGARI_MARK = /[\u093a-\u094d\u0951-\u0957\u0962-\u0963]/u;

function isBoundary(text: string): boolean {
  return /^[\s,;:!?()\[\]{}\-–—/\\।॥०-९0-9]+$/u.test(text);
}

function normalizeTail(parts: string[], next: string) {
  const last = parts[parts.length - 1] ?? "";
  if (last === "अ" && next === "ा") { parts[parts.length - 1] = "आ"; return; }
  if (last === "ए" && next === "े") { parts[parts.length - 1] = "ऐ"; return; }
  if (last === "ा" && next === "े") { parts[parts.length - 1] = "ो"; return; }
  if (last === "ा" && next === "ै") { parts[parts.length - 1] = "ौ"; return; }
  if (last.endsWith("्") && next === "ा") return;
  parts.push(next);
}

export function preetiToUnicode(input: string, options: PreetiOptions = {}): string {
  const output: string[] = [];
  let syllable: string[] = [];
  let pendingShortI = false;
  let reph = false;

  const flush = () => {
    if (pendingShortI) {
      syllable.push("ि");
      pendingShortI = false;
    }
    if (syllable.length) {
      output.push((reph ? "र्" : "") + syllable.join(""));
    } else if (reph) {
      output.push("र्");
    }
    syllable = [];
    reph = false;
  };

  for (let i = 0; i < input.length;) {
    let alias: string | undefined;
    for (const key of DIRECT_ALIAS_KEYS) {
      if (input.startsWith(key, i)) { alias = key; break; }
    }
    if (alias) {
      normalizeTail(syllable, DIRECT_ALIASES[alias]);
      i += alias.length;
      continue;
    }

    const ch = input[i++];
    if (ch === "{") {
      reph = true;
      continue;
    }
    if (ch === "l" || (options.capitalIAsShortI && ch === "I")) {
      pendingShortI = true;
      continue;
    }

    const mapped = PREETI_MAP[ch] ?? ch;
    if (isBoundary(mapped)) {
      flush();
      output.push(mapped);
      continue;
    }

    normalizeTail(syllable, mapped);
    if (pendingShortI) {
      const current = syllable[syllable.length - 1] ?? "";
      if (!current.endsWith("्")) {
        syllable.push("ि");
        pendingShortI = false;
      }
    }
  }

  flush();
  return output.join("").normalize("NFC");
}

const REVERSE_ENTRIES = (() => {
  const preferred = new Map<string, string>();
  for (const [legacy, unicode] of Object.entries(PREETI_MAP)) {
    if (!preferred.has(unicode)) preferred.set(unicode, legacy);
  }
  preferred.set("क्ष", "kshe");
  preferred.set("त्र", "q");
  preferred.set("ज्ञ", "1");
  preferred.set("श्र", ">");
  return [...preferred.entries()].sort((a, b) => b[0].length - a[0].length);
})();

function splitOrthographicUnits(input: string): string[] {
  const cps = Array.from(input.normalize("NFC"));
  const units: string[] = [];
  let current = "";
  let lastWasVirama = false;

  const flush = () => {
    if (current) units.push(current);
    current = "";
    lastWasVirama = false;
  };

  for (const ch of cps) {
    if (/\s|[,:;!?()\[\]{}\-–—/\\।॥0-9०-९]/u.test(ch)) {
      flush();
      units.push(ch);
      continue;
    }

    const isConsonant = DEVANAGARI_CONSONANT.test(ch);
    if (isConsonant && current && !lastWasVirama) {
      const isRephPrefix = current === "र्";
      if (!isRephPrefix) flush();
    }
    current += ch;
    lastWasVirama = ch === "्";
    if (!isConsonant && !DEVANAGARI_MARK.test(ch) && ch !== "र") lastWasVirama = false;
  }
  flush();
  return units;
}

function encodeMapped(text: string): string {
  let out = "";
  for (let i = 0; i < text.length;) {
    let matched = false;
    for (const [unicode, legacy] of REVERSE_ENTRIES) {
      if (text.startsWith(unicode, i)) {
        out += legacy;
        i += unicode.length;
        matched = true;
        break;
      }
    }
    if (!matched) out += text[i++];
  }
  return out;
}

function encodeUnit(unit: string): string {
  if (isBoundary(unit)) return unit;
  let body = unit;
  let suffixReph = "";
  if (body.startsWith("र्") && body.length > 2) {
    body = body.slice(2);
    suffixReph = "{";
  }

  let shortI = "";
  const index = body.indexOf("ि");
  if (index >= 0) {
    body = body.slice(0, index) + body.slice(index + 1);
    shortI = "l";
  }

  return shortI + encodeMapped(body) + suffixReph;
}

export function unicodeToPreeti(input: string): string {
  return splitOrthographicUnits(input).map(encodeUnit).join("");
}

export const preetiKeyboardMap = PREETI_MAP;
