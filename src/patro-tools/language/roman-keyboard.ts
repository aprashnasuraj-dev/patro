// Typed voice adapter of the existing public Roman keyboard; preserve mapping parity.
/** Deterministic Roman keyboard, not semantic translation or a language model. */
const consonants: Record<string,string>={k:'क',kh:'ख',g:'ग',gh:'घ',ng:'ङ',ch:'च',chh:'छ',c:'च',j:'ज',jh:'झ',ny:'ञ',T:'ट',Th:'ठ',D:'ड',Dh:'ढ',N:'ण',t:'त',th:'थ',d:'द',dh:'ध',n:'न',p:'प',ph:'फ',f:'फ',b:'ब',bh:'भ',m:'म',y:'य',r:'र',l:'ल',v:'व',w:'व',sh:'श',Sh:'ष',s:'स',h:'ह',ksh:'क्ष',gy:'ज्ञ',jn:'ज्ञ',tr:'त्र',shr:'श्र'};
const vowels: Record<string,[string,string]>={a:['अ',''],aa:['आ','ा'],A:['आ','ा'],i:['इ','ि'],ii:['ई','ी'],I:['ई','ी'],ee:['ई','ी'],u:['उ','ु'],uu:['ऊ','ू'],U:['ऊ','ू'],oo:['ऊ','ू'],e:['ए','े'],ai:['ऐ','ै'],o:['ओ','ो'],au:['औ','ौ'],ri:['ऋ','ृ']};
const special: Record<string,string>={'.':'।','~':'ँ',M:'ं',H:'ः',x:'्'};
const keys=[...Object.keys(consonants),...Object.keys(vowels),...Object.keys(special)].sort((a,b)=>b.length-a.length);
export function transliterateRoman(text: string) {
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
