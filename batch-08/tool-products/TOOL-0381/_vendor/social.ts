const urlRe=/https?:\/\/[^\s<>()]+/giu;
const xRanges:[[number,number],...Array<[number,number]>]=[[0,4351],[8192,8205],[8208,8223],[8242,8247]];
export function graphemes(s:string){const Seg=(Intl as any).Segmenter;if(Seg)return [...new Seg(undefined,{granularity:'grapheme'}).segment(s)].map((x:any)=>x.segment);return [...s]}
function xCpWeight(cp:number){return xRanges.some(([a,b])=>cp>=a&&cp<=b)?1:2}
export function xWeightedApprox(text:string){let total=0,urls=0,emojiClusters=0,last=0;for(const m of text.matchAll(urlRe)){const i=m.index||0;total+=weightPlain(text.slice(last,i));total+=23;urls++;last=i+m[0].length}total+=weightPlain(text.slice(last));return{weighted:total,urls,emojiClusters}}
function weightPlain(s:string){let n=0;for(const g of graphemes(s.normalize('NFC'))){const cps=[...g].map(c=>c.codePointAt(0)!);const isEmoji=/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g);if(isEmoji)n+=2;else for(const cp of cps)n+=xCpWeight(cp)}return n}
export function basicCounts(s:string){return{utf16:s.length,codePoints:[...s].length,graphemes:graphemes(s).length,utf8:new TextEncoder().encode(s).length,lines:s===''?0:s.split(/\r?\n/).length}}
export function weightedLength(s:string,mode:'plain'|'x'){return mode==='x'?xWeightedApprox(s).weighted:graphemes(s).length}
