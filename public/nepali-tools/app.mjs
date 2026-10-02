import {transliterateRoman} from './core/roman.mjs';
export function mountNepaliTools(root=document, options={}) {
const $=id=>root.querySelector('#'+id);
const editor=$('editor'),source=$('source'),output=$('output');
let mode='typing',composing=false,items=[],active=0,token=null,lastQuery='',request=0,suggestID=0,conversionID=0,timer,draftTimer,worker;
const undo=[],redo=[];let before='';
function status(s){$('status').textContent=s;}
function storageGet(k){try{return localStorage.getItem(k);}catch{return null;}}
function storageSet(k,v){try{localStorage.setItem(k,v);}catch{status('यो ब्राउजरमा draft सुरक्षित गर्न सकिएन। चाहनुहुन्छ भने text फाइल डाउनलोड गर्नुहोस्।');}}
function storageRemove(k){try{localStorage.removeItem(k);}catch{status('सुरक्षित draft अहिले खोल्न सकिएन।');}}
function snapshot(){before=editor.value;}
function remember(previous){if(previous!==editor.value){undo.push(previous);if(undo.length>50)undo.shift();redo.length=0;}}
function counts(){const s=editor.value.trim();$('counts').textContent=`${s?s.split(/\s+/u).length:0} words · ${Array.from(editor.value).length} characters`;}
function save(){clearTimeout(draftTimer);if($('save-draft').checked)draftTimer=setTimeout(()=>storageSet('patro-nepali-draft-v1',editor.value),400);}
function currentToken(){
 if(editor.selectionStart!==editor.selectionEnd)return null;
 const end=editor.selectionStart,prefix=editor.value.slice(0,end);
 const m=prefix.match(/([A-Za-z~]+|[\u0900-\u097f]+)$/u);
 if(!m)return null;
 const start=end-m[0].length, left=prefix[start-1]||'',right=editor.value[end]||'';
 if(/[A-Za-z0-9_@/:.\-]/.test(left)||/[A-Za-z0-9_@/:.\-\u0900-\u097f]/u.test(right))return null;
 return {query:m[0],start,end};
}
function hideSuggestions(){items=[];token=null;lastQuery='';suggestID=++request;$('suggestions').replaceChildren();}
function renderSuggestions(){
 const box=$('suggestions');box.replaceChildren();
 items.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.textContent=item.word;b.title=item.kind;b.className=i===active?'active':'';b.setAttribute('aria-label',`Insert ${item.word}`);b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',()=>commit(i,''));box.append(b);});
}
function query(){
 if(composing||!$('roman-enabled').checked){hideSuggestions();return;}
 token=currentToken();items=[];$('suggestions').replaceChildren();
 if(!token){hideSuggestions();return;}
 lastQuery=token.query;active=0;suggestID=++request;
 worker?.postMessage({id:suggestID,type:'suggest',query:token.query});
}
function replaceRange(start,end,text){snapshot();editor.setRangeText(text,start,end,'end');remember(before);counts();save();hideSuggestions();editor.focus();}
function commit(index,separator){
 const t=currentToken();if(!t||!token||t.query!==lastQuery||t.start!==token.start)return false;
 const choice=items[index]?.word;if(!choice)return false;
 replaceRange(t.start,t.end,choice+separator);return true;
}
function boundary(separator){
 if(composing||!$('roman-enabled').checked)return false;
 const t=currentToken();if(!t||!/[A-Za-z]/.test(t.query))return false;
 if(commit(active,separator))return true;
 replaceRange(t.start,t.end,transliterateRoman(t.query)+separator);
 status('Roman लेखाइबाट नजिकको नेपाली शब्द बनाइयो। अर्को हिज्जे चाहिएको भए सुझावबाट छान्नुहोस्।');return true;
}
function startWorker(){
 try{worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
 worker.onmessage=({data:m})=>{
  if(m.type==='ready'){status(`${m.count.toLocaleString()} शब्द तयार · तपाईंले लेखेको पाठ यही उपकरणमा रहन्छ`);return;}
  if(m.type==='load-error'){status('शब्द सुझाव अहिले लोड हुन सकेन। Roman typing र Preeti conversion अझै प्रयोग गर्न सकिन्छ।');return;}
  if(m.type==='error'){if(m.id===conversionID){$('warnings').textContent='रूपान्तरण अहिले पूरा हुन सकेन। पाठ जाँचेर फेरि प्रयास गर्नुहोस्।';output.value='';}else status('यो काम अहिले पूरा हुन सकेन। फेरि प्रयास गर्नुहोस्।');return;}
  if(m.type==='suggest'&&m.id===suggestID&&!composing){const t=currentToken();if(t&&t.query===m.query&&token?.start===t.start){items=m.items;active=0;renderSuggestions();}}
  if(m.type==='convert'&&m.id===conversionID){output.value=m.text;$('warnings').textContent=m.warnings.length?'रूपान्तरण पूरा भयो। केही दुर्लभ अक्षर स्वतः रूपान्तरण नभएको हुन सक्छ; औपचारिक कागजातमा प्रयोग गर्नुअघि एकपटक पढेर जाँच गर्नुहोस्।':'रूपान्तरण पूरा भयो। औपचारिक कागजातमा प्रयोग गर्नुअघि परिणाम एकपटक पढेर जाँच गर्नुहोस्।';}
 };
 worker.onerror=()=>{status('नेपाली टाइपिङ अहिले सुरु हुन सकेन। पृष्ठ फेरि खोल्नुहोस्।');$('warnings').textContent='रूपान्तरण अहिले उपलब्ध छैन। पृष्ठ फेरि खोल्नुहोस्।';};
 }catch{status('नेपाली टाइपिङ अहिले सुरु हुन सकेन। पृष्ठ फेरि खोल्नुहोस्।');}
}
function convertNow(){
 conversionID=++request;output.value='';$('warnings').textContent='रूपान्तरण हुँदैछ…';
 if(!worker){$('warnings').textContent='रूपान्तरण अहिले उपलब्ध छैन। पृष्ठ फेरि खोल्नुहोस्।';return;}
 worker.postMessage({id:conversionID,type:'convert',text:source.value,direction:mode});
}
function setMode(next){
 if(!['typing','preeti-to-unicode','unicode-to-preeti'].includes(next))next='typing';mode=next;
 for(const b of root.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
 $('typing-panel').hidden=mode!=='typing';$('converter-panel').hidden=mode==='typing';
 const preeti=mode==='preeti-to-unicode';
 $('conversion-title').textContent=preeti?'आफ्नै Preeti → Unicode':'आफ्नै Unicode → Preeti';
 $('source-label').textContent=preeti?'Preeti input':'Unicode input';$('output-label').textContent=preeti?'Unicode output':'Preeti output';
 $('conversion-description').textContent=preeti?'Preeti font मा टाइप गरिएको पाठ यहाँ paste गर्नुहोस्।':'Unicode नेपाली पाठलाई Preeti मा रूपान्तरण गर्नुहोस्।';
 source.classList.toggle('preeti-font',preeti);output.classList.toggle('preeti-font',!preeti);
 if(options.manageHistory){const u=new URL(location.href);u.searchParams.set('mode',mode);history.replaceState(null,'',u);}
 if(mode!=='typing')convertNow();
}
async function copy(text){try{await navigator.clipboard.writeText(text);status('कपी भयो।');}catch{status('कपी गर्न सकिएन। पाठ चयन गरेर आफ्नो उपकरणको Copy प्रयोग गर्नुहोस्।');}}
function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
editor.addEventListener('compositionstart',()=>{composing=true;hideSuggestions();});
editor.addEventListener('compositionend',()=>{composing=false;counts();save();query();});
editor.addEventListener('beforeinput',e=>{
 snapshot();
 if(!composing&&e.inputType==='insertText'&&e.data===' '&&boundary(' '))e.preventDefault();
 if(!composing&&e.inputType==='insertLineBreak'&&boundary('\n'))e.preventDefault();
});
editor.addEventListener('input',()=>{remember(before);counts();save();query();});
editor.addEventListener('click',query);
editor.addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key))query();});
editor.addEventListener('keydown',e=>{
 if(composing||e.isComposing||e.keyCode===229)return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();historyStep(e.shiftKey);return;}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();historyStep(true);return;}
 if(e.key==='Escape'){hideSuggestions();return;}
 if(items.length&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();active=(active+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;renderSuggestions();return;}
 if(e.key==='Tab'&&items.length&&commit(active,'')){e.preventDefault();return;}
 if(e.key==='Enter'&&boundary('\n'))e.preventDefault();
});
function historyStep(forward){const from=forward?redo:undo,to=forward?undo:redo;if(!from.length)return;to.push(editor.value);editor.value=from.pop();counts();save();hideSuggestions();editor.focus();}
$('undo').onclick=()=>historyStep(false);$('redo').onclick=()=>historyStep(true);
$('roman-enabled').onchange=query;
$('copy-typing').onclick=()=>copy(editor.value);$('download-typing').onclick=()=>download(editor.value,'nepali-text.txt');
$('clear-typing').onclick=()=>replaceRange(0,editor.value.length,'');
$('copy-conversion').onclick=()=>copy(output.value);$('download-conversion').onclick=()=>download(output.value,mode==='unicode-to-preeti'?'preeti-text.txt':'unicode-text.txt');
$('clear-conversion').onclick=()=>{source.value='';convertNow();};
source.oninput=()=>{clearTimeout(timer);output.value='';conversionID=++request;timer=setTimeout(convertNow,120);};
$('swap').onclick=()=>{const text=output.value;source.value=text;setMode(mode==='preeti-to-unicode'?'unicode-to-preeti':'preeti-to-unicode');};
for(const b of root.querySelectorAll('[data-mode]'))b.onclick=()=>setMode(b.dataset.mode);
$('save-draft').checked=storageGet('patro-nepali-save-v1')==='yes';
if($('save-draft').checked)editor.value=(storageGet('patro-nepali-draft-v1')||'').slice(0,100000);
$('save-draft').onchange=()=>{storageSet('patro-nepali-save-v1',$('save-draft').checked?'yes':'no');if(!$('save-draft').checked){clearTimeout(draftTimer);storageRemove('patro-nepali-draft-v1');}else save();};
$('forget').onclick=()=>{clearTimeout(draftTimer);$('save-draft').checked=false;storageRemove('patro-nepali-draft-v1');storageRemove('patro-nepali-save-v1');status('सुरक्षित draft हटाइयो। हालको पाठ editor मै रहन्छ।');};
$('import-text').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>3_000_000){status('अधिकतम file size 3 MB हो।');return;}try{const text=new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer());if(text.length>1_000_000)throw Error('Text exceeds character limit');source.value=text;convertNow();}catch{status('फाइल खोल्न सकिएन। 3 MB भन्दा सानो UTF-8 .txt फाइल छान्नुहोस्।');}e.target.value='';};
$('font-file').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5_000_000){status('Font file 5 MB भन्दा सानो हुनुपर्छ।');return;}try{const font=new FontFace('UserPreeti',await f.arrayBuffer());await font.load();document.fonts.add(font);$('font-status').textContent='यो tab मा font तयार भयो।';}catch{$('font-status').textContent='यो font खोल्न सकिएन।';}};
$('offline').onclick=async()=>{try{if(!('serviceWorker'in navigator))throw Error('Unsupported');const reg=await navigator.serviceWorker.register(new URL('./sw.js',import.meta.url),{scope:new URL('./',import.meta.url).pathname});const w=reg.installing||reg.waiting||reg.active;if(w?.state==='activated')status('अफलाइन फाइल तयार छन्। अफलाइन जानुअघि यो उपकरण एकपटक खोल्नुहोस्।');else{status('अफलाइन प्रयोगका लागि तयार हुँदैछ…');w?.addEventListener('statechange',()=>{if(w.state==='activated')status('अफलाइन फाइल तयार छन्।');if(w.state==='redundant')status('अफलाइन सुविधा सक्रिय हुन सकेन। इन्टरनेट जडान हुँदा फेरि प्रयास गर्नुहोस्।');});}}catch{status('अफलाइन सुविधा अहिले सक्रिय हुन सकेन। इन्टरनेट जडान भएपछि फेरि प्रयास गर्नुहोस्।');}};
const onPageHide=()=>{if($('save-draft').checked)storageSet('patro-nepali-draft-v1',editor.value);};
window.addEventListener('pagehide',onPageHide);
startWorker();counts();setMode(options.mode||(options.manageHistory?new URL(location.href).searchParams.get('mode'):null)||'typing');
return ()=>{worker?.terminate();clearTimeout(timer);clearTimeout(draftTimer);onPageHide();window.removeEventListener('pagehide',onPageHide);};
}
if(document.getElementById('editor'))mountNepaliTools(document,{manageHistory:true});