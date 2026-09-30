/** Deterministic Roman keyboard, not semantic translation or a language model. */
const consonants={k:'क',kh:'ख',g:'ग',gh:'घ',ng:'ङ',ch:'च',chh:'छ',c:'च',j:'ज',jh:'झ',ny:'ञ',T:'ट',Th:'ठ',D:'ड',Dh:'ढ',N:'ण',t:'त',th:'थ',d:'द',dh:'ध',n:'न',p:'प',ph:'फ',f:'फ',b:'ब',bh:'भ',m:'म',y:'य',r:'र',l:'ल',v:'व',w:'व',sh:'श',Sh:'ष',s:'स',h:'ह',ksh:'क्ष',gy:'ज्ञ',jn:'ज्ञ',tr:'त्र',shr:'श्र'};
const vowels={a:['अ',''],aa:['आ','ा'],A:['आ','ा'],i:['इ','ि'],ii:['ई','ी'],I:['ई','ी'],ee:['ई','ी'],u:['उ','ु'],uu:['ऊ','ू'],U:['ऊ','ू'],oo:['ऊ','ू'],e:['ए','े'],ai:['ऐ','ै'],o:['ओ','ो'],au:['औ','ौ'],ri:['ऋ','ृ']};
const special={'.':'।','~':'ँ',M:'ं',H:'ः',x:'्'};
const keys=[...Object.keys(consonants),...Object.keys(vowels),...Object.keys(special)].sort((a,b)=>b.length-a.length);
export function transliterateRoman(text) {
 let out='', pending=false;
 for(let i=0;i<text.length;) {
  const key=keys.find(k=>text.startsWith(k,i));
  if(!key) {out+=text[i++];pending=false;continue;}
  i+=key.length;
  if(consonants[key]) {out+=(pending?'्':'')+consonants[key];pending=true;}
  else if(vowels[key]) {out+=vowels[key][pending?1:0];pending=false;}
  else {out+=special[key];pending=false;}
 }
 return out.normalize('NFC');
}
const reverseC=Object.fromEntries(Object.entries(consonants).filter(([k])=>!['c','f','w','jn'].includes(k)).map(([k,v])=>[v,k]));
const reverseV=Object.fromEntries(Object.entries(vowels).filter(([k])=>!['A','I','U','ee','oo'].includes(k)).map(([k,v])=>[v[0],k]));
const matras=Object.fromEntries(Object.entries(vowels).filter(([k,v])=>v[1]&&!['A','I','U','ee','oo'].includes(k)).map(([k,v])=>[v[1],k]));
export function romanize(word) {
 let out='';const chars=Array.from(word.normalize('NFC'));
 for(let i=0;i<chars.length;i++) {
  const ch=chars[i],next=chars[i+1];
  if(reverseC[ch]) {out+=reverseC[ch];if(next!=='्'&&!matras[next]) out+='a';}
  else if(matras[ch]) out+=matras[ch];
  else if(reverseV[ch]) out+=reverseV[ch];
  else if(ch==='ं'||ch==='ँ') out+='n';
  else if(ch==='ः') out+='h';
 }
 if(chars.length>1&&reverseC[chars.at(-1)]&&out.endsWith('a')) out=out.slice(0,-1);
 return out;
}
export function foldRoman(text) {return text.toLowerCase().replace(/aa/g,'a').replace(/ee|ii/g,'i').replace(/oo|uu/g,'u').replace(/sh/g,'s').replace(/w/g,'v');}
