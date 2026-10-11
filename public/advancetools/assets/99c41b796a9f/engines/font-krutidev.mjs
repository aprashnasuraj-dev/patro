import {validate,replaceMap} from './font-common.mjs';
import {pairs as krutiPairs} from '../vendor/kruti-map.mjs';
function kruti(text){for(const [from,to] of krutiPairs)text=text.split(from).join(to);text=text.replaceAll('±','Zं').replaceAll('Æ','र्f').replaceAll('Ç','fa').replaceAll('É','र्fa').replaceAll('Ê','ीZ');text=text.replace(/fa(.)/gu,'$1िं').replace(/f(.)/gu,'$1ि');let previous;do{previous=text;text=text.replace(/ि्([\u0915-\u0939])/g,'्$1ि');}while(previous!==text);
// Reph follows the visually preceding consonant cluster in Kruti Dev.
text=text.replace(/([\u0915-\u0939\u0958-\u095f](?:्[\u0915-\u0939\u0958-\u095f])*(?:[\u093c-\u094c\u0901-\u0903])*)Z/g,'र्$1');return text;}
export function convert(text){validate(text);const output=kruti(text);const warnings=/[fZ]/.test(output)?['Unresolved i/reph markers remain; review the original font run.']:[];return {output,warnings};}
