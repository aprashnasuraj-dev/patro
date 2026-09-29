/** Patro Preeti profile v2. Conversion is code-based; no font file is required. */
export const keyboardMap = {
  "v":"ख","r":"च","\"":"ू","~":"ञ्","z":"श","ç":"ॐ","f":"ा","b":"द","n":"ल","j":"व",
  "V":"ख्","R":"च्","ß":"द्म","^":"६","Z":"श्","F":"ँ","B":"द्य","N":"ल्","Ë":"ङ्ग","J":"व्",
  "6":"ट","2":"द्द","¿":"रू",">":"श्र",":":"स्","§":"ट्ट","&":"७","£":"घ्","•":"ड्ड",".":"।",
  "«":"्र","*":"८","„":"ध्र","w":"ध","s":"क","g":"न","æ":"“","c":"अ","o":"य","k":"प",
  "W":"ध्","S":"क्","[":"ृ","G":"न्","C":"ऋ","O":"इ","Î":"ङ्ख","K":"प्","7":"ठ","¶":"ठ्ठ",
  "3":"घ","9":"ढ","?":"रु",";":"स","'":"ु","#":"३","¢":"द्घ","/":"र","+":"ं","ª":"ङ","t":"त",
  "p":"उ","|":"्र","x":"ह","å":"द्व","d":"म","\`":"ञ","h":"ज","T":"त्","P":"ए","X":"ह्",
  "D":"म्","@":"२","Í":"ङ्क","L":"ी","H":"ज्","4":"द्ध","0":"ण्","<":"?","8":"ड","¥":"र्‍",
  "$":"४","¡":"ज्ञ्",",":",","©":"र","(":"९","u":"ग","q":"त्र","}":"ै","y":"थ","e":"भ","a":"ब",
  "i":"ष्","‰":"झ्","U":"ग्","Q":"त्त","]":"े","Y":"थ्","Ø":"्य","E":"भ्","A":"ब्","M":"ः",
  "Ì":"न्न","I":"क्ष्","5":"छ","´":"झ","1":"ज्ञ","°":"ङ्ढ","=":".","‹":"ङ्घ","%":"५","¤":"झ्",
  "!":"१","-":"(","›":"द्र",")":"०","…":"‘","Æ":"”","Ú":"’","˜":"ऽ","÷":"/","±":"+"
};
const C = /[क-हक़-य़]/u;
const V = /[अ-औ]/u;
const MARK = /[\u0900-\u0903\u093a-\u094d\u0951-\u0957\u0962-\u0963]/u;
const HAL = '्';
const LIMIT = 1_000_000;
function guard(input) {
  if (typeof input !== 'string') throw new TypeError('Text must be a string');
  if (input.length > LIMIT) throw new RangeError('Maximum 1,000,000 UTF-16 code units');
}
function trie(entries) {
  const root = new Map();
  for (const [key, value] of entries) {
    let node = root;
    for (const ch of key) { if (!node.has(ch)) node.set(ch, new Map()); node = node.get(ch); }
    node.value = value;
  }
  return root;
}
function match(root, s, start) {
  let node = root, found;
  for (let i = start; i < s.length && node.has(s[i]); i++) {
    node = node.get(s[i]);
    if (node.value !== undefined) found = [node.value, i + 1];
  }
  return found || [s[start], start + 1];
}
const forward = {...keyboardMap, '\\':'्', 'l':'\uE000', '{':'\uE001', m:'फ',
  'cf]':'ओ','cf}':'औ','cf':'आ','cF':'अँ','c+':'अं', 'O{':'ई','pm':'ऊ','P]':'ऐ',
  'f]':'ो','f}':'ौ','km':'फ','em':'झ','qm':'क्र'};
for (const [key,value] of Object.entries(keyboardMap)) {
  if (value.endsWith(HAL)) forward[key+'f'] = value.slice(0,-1);
}
const ft = trie(Object.entries(forward));
export function preetiToUnicode(input) {
  guard(input);
  const out = [], warnings = [];
  let cluster = '', pendingI = false;
  const flush = () => { if(pendingI && cluster) { cluster += 'ि'; pendingI=false; } if(cluster) out.push(cluster); cluster=''; };
  const warn = (code,offset) => { if(warnings.length<100) warnings.push({code,offset}); };
  const finishI = () => { if(pendingI) {cluster += 'ि';pendingI=false;} };
  for (let i=0;i<input.length;) {
    const offset=i; const [mapped,end] = match(ft,input,i); i=end;
    if(mapped==='\uE000') {
      flush();
      if(pendingI) {out.push('ि');warn('ORPHAN_SHORT_I',offset);}
      pendingI=true;continue;
    }
    if(mapped==='\uE001') {
      if(cluster && C.test(cluster[0])) cluster='र्'+cluster;
      else {out.push('र्');warn('ORPHAN_REPH',offset);}
      continue;
    }
    for (const ch of mapped) {
      if(C.test(ch)) {
        if(cluster && !cluster.endsWith(HAL) && !cluster.endsWith('\u200d') && !cluster.endsWith('\u200c')) {finishI();flush();}
        cluster+=ch;
      } else if(MARK.test(ch)||ch==='\u200d'||ch==='\u200c') {
        if(ch!==HAL && pendingI) finishI();
        cluster+=ch;
      } else if(V.test(ch)) {finishI();flush();cluster=ch;}
      else {if(pendingI){finishI();warn('ORPHAN_SHORT_I',offset);}flush();out.push(ch);}
    }
  }
  if(pendingI){finishI();warn('ORPHAN_SHORT_I',input.length);}
  flush();
  return {text:out.join('').normalize('NFC'),warnings};
}
const preferred = new Map();
for(const [legacy,u] of Object.entries(keyboardMap)) if(!preferred.has(u)) preferred.set(u,legacy);
Object.entries({'आ':'cf','ओ':'cf]','औ':'cf}','ई':'O{','ऊ':'pm','ऐ':'P]','फ':'km','झ':'em','ष':'if','ण':'0f','क्ष':'If','क्ष्':'I','त्र':'q','ज्ञ':'1','श्र':'>','क्र':'s|','्र':'|','्':'\\','ो':'f]','ौ':'f}','ि':'l','र':'/','र्':'/\\'}).forEach(([u,p])=>preferred.set(u,p));
const rt=trie(preferred.entries());
function encode(s,warnings,offset) {
 let out='';
 for(let i=0;i<s.length;) {
   const [value,end]=match(rt,s,i);
   if(value===s[i] && /[\u0900-\u097f\u200c\u200d]/u.test(s[i]) && !preferred.has(s[i])) {
     if(warnings.length<100) warnings.push({code:'UNSUPPORTED_CHARACTER',offset:offset+i,character:s[i]});
   }
   out+=value;i=end;
 }
 return out;
}
export function unicodeToPreeti(input) {
 guard(input);input=input.normalize('NFC');
 const out=[],warnings=[];
 for(let i=0;i<input.length;) {
   const start=i;
   if(!C.test(input[i])) {out.push(encode(input[i++],warnings,start));continue;}
   let unit=input[i++];
   while(i<input.length) {
     const ch=input[i];
     if(MARK.test(ch)||ch==='\u200c'||ch==='\u200d') {unit+=ch;i++;continue;}
     if(C.test(ch) && (unit.endsWith('्')||unit.endsWith('्\u200c')||unit.endsWith('्\u200d'))) {unit+=ch;i++;continue;}
     break;
   }
   let reph='';
   if(unit.startsWith('र्') && C.test(unit[2]||'')) {unit=unit.slice(2);reph='{';}
   let shortI='';
   if(unit.includes('ि')) {unit=unit.replace('ि','');shortI='l';}
   out.push(shortI+encode(unit,warnings,start)+reph);
 }
 return {text:out.join(''),warnings};
}
export function convert(text,direction) {
 if(direction==='preeti-to-unicode') return preetiToUnicode(text);
 if(direction==='unicode-to-preeti') return unicodeToPreeti(text);
 throw new TypeError('Unknown conversion direction');
}
export function convertRuns(runs,target='unicode') {
 if(!Array.isArray(runs)||!['unicode','preeti'].includes(target))throw new TypeError('Invalid runs or target');
 const parts=[],warnings=[];let offset=0;
 for(const run of runs) {
  guard(run.text);if(!['literal','unicode','preeti'].includes(run.encoding))throw new TypeError('Invalid run encoding');
  const result=run.encoding==='literal'||run.encoding===target?{text:run.text,warnings:[]}:convert(run.text,target==='unicode'?'preeti-to-unicode':'unicode-to-preeti');
  parts.push(result.text);for(const w of result.warnings)if(warnings.length<100)warnings.push({...w,offset:w.offset+offset});offset+=run.text.length;
  if(offset>LIMIT)throw new RangeError('Combined runs exceed text limit');
 }
 return {text:parts.join(''),warnings};
}
