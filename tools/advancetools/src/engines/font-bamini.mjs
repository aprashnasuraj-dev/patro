import {validate,replaceMap} from './font-common.mjs';
import {pairs as baminiPairs} from '../vendor/bamini-map.mjs';
const bm={},ambiguous={};for(const [from,to] of baminiPairs){if(bm[from]&&bm[from]!==to){ambiguous[from]=[...new Set([...(ambiguous[from]||[bm[from]]),to])];}else bm[from]=to;}for(const key of Object.keys(ambiguous))delete bm[key];
export {ambiguous as baminiAmbiguities};
export function convert(text){validate(text);const output=replaceMap(text,bm),warnings=[];for(const key of Object.keys(ambiguous))if(output.includes(key))warnings.push(`Ambiguous symbol ${JSON.stringify(key)}: ${ambiguous[key].join(' / ')}. Kept unchanged.`);return {output,warnings};}
