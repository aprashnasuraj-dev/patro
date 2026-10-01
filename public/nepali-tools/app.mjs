import {transliterateRoman} from './core/roman.mjs';
export function mountNepaliTools(root=document, options={}) {
const $=id=>root.querySelector('#'+id);
const editor=$('editor'),source=$('source'),output=$('output');
let mode='typing',composing=false,items=[],active=0,token=null,lastQuery='',request=0,suggestID=0,conversionID=0,timer,draftTimer,worker;
const undo=[],redo=[];let before='';
function status(s){$('status').textContent=s;}
function storageGet(k){try{return localStorage.getItem(k);}catch{return null;}}
function storageSet(k,v){try{localStorage.setItem(k,v);}catch{status('Browser storage unavailable. Download your draft instead.');}}
function storageRemove(k){try{localStorage.removeItem(k);}catch{status('Could not access browser storage.');}}
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
 status('Used phonetic spelling. Select dictionary suggestions for ambiguous words.');return true;
}
function startWorker(){
 try{worker=new Worker(new URL('./worker.mjs',import.meta.url),{type:'module'});
 worker.onmessage=({data:m})=>{
  if(m.type==='ready'){status(`${m.count.toLocaleString()} words ready · processing stays on this device`);return;}
  if(m.type==='load-error'){status('Dictionary unavailable. Phonetic typing and conversion still work. Reload to retry.');return;}
  if(m.type==='error'){if(m.id===conversionID){$('warnings').textContent=m.error;output.value='';}else status(m.error);return;}
  if(m.type==='suggest'&&m.id===suggestID&&!composing){const t=currentToken();if(t&&t.query===m.query&&token?.start===t.start){items=m.items;active=0;renderSuggestions();}}
  if(m.type==='convert'&&m.id===conversionID){output.value=m.text;$('warnings').textContent=m.warnings.length?`${m.warnings.length} warning(s), capped at 100: ${[...new Set(m.warnings.map(w=>w.code))].join(', ')}. Review rare or malformed characters.`:'Conversion complete. Review the output before using it in an official document.';}
 };
 worker.onerror=()=>{status('Worker failed. Reload the page; phonetic typing still works.');$('warnings').textContent='Conversion worker failed. Reload to retry.';};
 }catch{status('This browser could not start a worker. Serve this folder over HTTP(S), not file://.');}
}
function convertNow(){
 conversionID=++request;output.value='';$('warnings').textContent='Converting…';
 if(!worker){$('warnings').textContent='Conversion worker unavailable. Reload over HTTP(S).';return;}
 worker.postMessage({id:conversionID,type:'convert',text:source.value,direction:mode});
}
function setMode(next){
 if(!['typing','preeti-to-unicode','unicode-to-preeti'].includes(next))next='typing';mode=next;
 for(const b of root.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
 $('typing-panel').hidden=mode!=='typing';$('converter-panel').hidden=mode==='typing';
 const preeti=mode==='preeti-to-unicode';
 $('conversion-title').textContent=preeti?'आफ्नै Preeti → Unicode':'आफ्नै Unicode → Preeti';
 $('source-label').textContent=preeti?'Preeti input':'Unicode input';$('output-label').textContent=preeti?'Unicode output':'Preeti output';
 $('conversion-description').textContent=preeti?'Paste text originally typed using the Preeti font.':'Paste Unicode Nepali text for a legacy Preeti document.';
 source.classList.toggle('preeti-font',preeti);output.classList.toggle('preeti-font',!preeti);
 if(options.manageHistory){const u=new URL(location.href);u.searchParams.set('mode',mode);history.replaceState(null,'',u);}
 if(mode!=='typing')convertNow();
}
async function copy(text){try{await navigator.clipboard.writeText(text);status('Copied.');}catch{status('Copy unavailable. Select the text and use your device’s Copy command.');}}
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
$('forget').onclick=()=>{clearTimeout(draftTimer);$('save-draft').checked=false;storageRemove('patro-nepali-draft-v1');storageRemove('patro-nepali-save-v1');status('Saved draft deleted. Current text remains in the editor.');};
$('import-text').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>3_000_000){status('Maximum import size is 3 MB.');return;}try{const text=new TextDecoder('utf-8',{fatal:true}).decode(await f.arrayBuffer());if(text.length>1_000_000)throw Error('Text exceeds character limit');source.value=text;convertNow();}catch{status('Import failed. Select a UTF-8 .txt file under the size limit.');}e.target.value='';};
$('font-file').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5_000_000){status('Font must be under 5 MB.');return;}try{const font=new FontFace('UserPreeti',await f.arrayBuffer());await font.load();document.fonts.add(font);$('font-status').textContent='Your font is loaded for this tab.';}catch{$('font-status').textContent='Unable to load this font.';}};
$('offline').onclick=async()=>{try{if(!('serviceWorker'in navigator))throw Error('Unsupported');const reg=await navigator.serviceWorker.register(new URL('./sw.js',import.meta.url),{scope:new URL('./',import.meta.url).pathname});const w=reg.installing||reg.waiting||reg.active;if(w?.state==='activated')status('Offline files are ready. Reopen this tool once before going offline.');else{status('Preparing offline files…');w?.addEventListener('statechange',()=>{if(w.state==='activated')status('Offline files are ready.');if(w.state==='redundant')status('Offline setup failed. Try again while connected.');});}}catch{status('Offline setup unavailable. Use HTTPS or localhost and try again.');}};
const onPageHide=()=>{if($('save-draft').checked)storageSet('patro-nepali-draft-v1',editor.value);};
window.addEventListener('pagehide',onPageHide);
startWorker();counts();setMode(options.mode||(options.manageHistory?new URL(location.href).searchParams.get('mode'):null)||'typing');
return ()=>{worker?.terminate();clearTimeout(timer);clearTimeout(draftTimer);onPageHide();window.removeEventListener('pagehide',onPageHide);};
}
if(document.getElementById('editor'))mountNepaliTools(document,{manageHistory:true});
