import { VoiceHelp } from "../patro-tools/language/react/VoiceHelp";
import { InlineDictationPreview, useDictationEditor } from '../patro-tools/language/react/DictationEditor';
import { useNepaliDictation } from "../patro-tools/language/react/useNepaliDictation";
import { GoogleAuthButton } from "../auth/GoogleAuthButton";
import { formatNeDate } from "../nepaliDate";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ListChecks, Receipt, Cake, FileClock, Sparkles, Trash2, Mic, MicOff, Languages, Save } from "lucide-react";
import { readLife, syncLifeTools, updateLife, type LifeState, type StoredNote } from "../patro-tools-integration/storage";

const TABS=[
  {id:"today",label:"आफ्नै नोट",icon:ListChecks,key:null},
  {id:"due",label:"आफ्नै नियमित म्याद",icon:Receipt,key:"due"},
  {id:"family",label:"आफ्नै परिवार मितिहरू",icon:Cake,key:"family"},
  {id:"documents",label:"आफ्नै कागजात म्याद",icon:FileClock,key:"docs"},
  {id:"festival",label:"आफ्नै चाडपर्व तयारी",icon:Sparkles,key:"festivalPlans"}
] as const;
type TabId=typeof TABS[number]["id"];
type ListKey="due"|"family"|"docs"|"festivalPlans";
type NoteMode=StoredNote["inputMode"];
type Suggestion={word:string;kind?:string};

function initialTab():TabId{
  const value=new URLSearchParams(location.search).get("tab") as TabId|null;
  return TABS.some(x=>x.id===value)?value!:"today";
}
function rowLabel(row:Record<string,unknown>){return String(row.title||row.name||row.label||row.document||row.description||"व्यक्तिगत मिति")}
function rowDate(row:Record<string,unknown>){return String(row.date||row.dueDate||row.due_date||row.expiry||row.eventDate||row.event_date||"")}
function modeLabel(mode:NoteMode){return mode==="nepali"?"नेपाली":mode==="voice"?"बोलेर":"English"}
function currentToken(text:string,caret:number){
  const prefix=text.slice(0,caret),match=prefix.match(/([A-Za-z~]+|[\u0900-\u097f]+)$/u);
  if(!match)return null;
  return {query:match[0],start:caret-match[0].length,end:caret};
}

function NoteComposer({life,onLife,onSync}:{life:LifeState;onLife:(next:LifeState)=>void;onSync:(text:string)=>void}){
  const[text,setText]=useState("");
  const[mode,setMode]=useState<NoteMode>("nepali");
  const[voiceLang,setVoiceLang]=useState<"ne-NP"|"en-US">("ne-NP");
  const[spokenNumbers,setSpokenNumbers]=useState(false);
  const[transliterateLatin,setTransliterateLatin]=useState<((text:string)=>string)|undefined>();
  const[cleanupError,setCleanupError]=useState("");
  const[suggestions,setSuggestions]=useState<Suggestion[]>([]);
  const[status,setStatus]=useState("नेपाली शब्द सुझाव तयार हुँदैछन्…");
  const [noteDate,setNoteDate]=useState(new URLSearchParams(location.search).get("date")||new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu"}).format(new Date()));
 const textarea=useRef<HTMLTextAreaElement>(null);
 const insertFinal = useDictationEditor(text, setText, textarea);
 // Reuse the main Voice Typing recognizer and its identical cleanup options.
 const dictation=useNepaliDictation({language:voiceLang,onFinal:insertFinal,spokenNumbers,transliterateLatin});const listening=dictation.listening;
  const worker=useRef<Worker|null>(null);
  const requestId=useRef(0);

  useEffect(()=>{
    try{
      const w=new Worker("/nepali-tools/worker.mjs",{type:"module"});
      worker.current=w;
      w.onmessage=({data}:MessageEvent<any>)=>{
        if(data?.type==="ready")setStatus(`${Number(data.count||0).toLocaleString()} नेपाली शब्दका सुझाव तयार छन्।`);
        if(data?.type==="load-error")setStatus("नेपाली शब्द सुझाव अहिले उपलब्ध छैनन्। पूर्ण नेपाली टाइपिङ एकपटक अनलाइन खोल्नुहोस्।");
        if(data?.type==="suggest"&&data.id===requestId.current)setSuggestions(Array.isArray(data.items)?data.items.slice(0,7):[]);
      };
      w.onerror=()=>setStatus("नेपाली शब्द सुझाव अहिले उपलब्ध छैनन्; English र voice notes अझै काम गर्छन्।");
      navigator.serviceWorker?.ready.then(r=>r.active?.postMessage({type:"WARM_LANGUAGE_TOOLS"})).catch(()=>undefined);
      return()=>w.terminate();
    }catch{return;}
  },[]);

  useEffect(()=>{
    if(mode!=="nepali"){setSuggestions([]);return;}
    const el=textarea.current;if(!el)return;
    const token=currentToken(text,el.selectionStart??text.length);
    if(!token||token.query.length<2){setSuggestions([]);return;}
    const id=++requestId.current;
    worker.current?.postMessage({id,type:"suggest",query:token.query});
  },[text,mode]);

  function useSuggestion(word:string){
    const el=textarea.current;if(!el)return;
    const caret=el.selectionStart??text.length,token=currentToken(text,caret);if(!token)return;
    const next=text.slice(0,token.start)+word+text.slice(token.end);setText(next);setSuggestions([]);
    requestAnimationFrame(()=>{el.focus();const p=token.start+word.length;el.setSelectionRange(p,p)});
  }
  async function save(){
    const value=text.trim();if(!value)return;
    const row:StoredNote={id:crypto.randomUUID(),text:value,date:noteDate,inputMode:mode,createdAt:new Date().toISOString(),updatedAt:Date.now()};
    const next=updateLife(current=>({...current,notes:[row,...current.notes]}));onLife(next);setText("");setSuggestions([]);onSync("नोट यस उपकरणमा सुरक्षित भयो। खातासँग जोडिएको भए त्यहाँ पनि अद्यावधिक हुँदैछ…");
    const result=await syncLifeTools();onLife(result.life);onSync(result.synced?"नोट खातासँग पनि सुरक्षित भयो।":"नोट यस ब्राउजरमा सुरक्षित छ; साइन इन गरेपछि खातासँग पनि सुरक्षित हुन्छ।");
  }
  function removeNote(id:string){const next=updateLife(current=>({...current,notes:current.notes.filter(n=>n.id!==id)}));onLife(next);void syncLifeTools();}
  function chooseMode(next:"english"|"nepali"){setVoiceLang(next==="english"?"en-US":"ne-NP");setMode(next);}
  function startVoice(){if(listening){dictation.stop();return;}if(dictation.mode==="unsupported")return;setMode("voice");void dictation.start();}
  async function toggleTransliteration(enabled:boolean){
    if(!enabled){setTransliterateLatin(undefined);return;}
    try{
      const engine=await import("../patro-tools/language/roman-keyboard");
      setTransliterateLatin(()=>engine.transliterateRoman);setCleanupError("");
    }catch{setCleanupError("Roman लिप्यन्तरण उपलब्ध छैन; English शब्द जस्ताको तस्तै रहन्छन्।");}
  }

  return <section className="mp-card mp-diary-native mp-note-composer">
    <header><div><p className="eyebrow">निजी · अफलाइनमा पनि उपयोगी</p><h2>आफ्नै नोट लेख्नुहोस्</h2><p>English, नेपाली शब्द सुझाव वा voice typing प्रयोग गरेर सहज रूपमा लेख्नुहोस्।</p></div><a className="community-button secondary" href="/tools/nepali-typing"><Languages size={16}/> पूर्ण नेपाली टाइपिङ / Preeti</a></header>
    <div className="mp-note-modes" role="group" aria-label="नोट लेख्ने तरिका"><button type="button" className={mode==="english"?"active":""} onClick={()=>chooseMode("english")}>English</button><button type="button" className={mode==="nepali"?"active":""} onClick={()=>chooseMode("nepali")}>नेपाली</button><button type="button" className={mode==="voice"||listening?"active":""} onClick={startVoice} disabled={dictation.mode==="unsupported" || (dictation.processing && !listening)} aria-pressed={listening} title={dictation.mode==="unsupported"?"आवाज उपलब्ध छैन; तल सहायता हेर्नुहोस्।":undefined}>{listening?<MicOff size={16}/>:<Mic size={16}/>} {listening?"■ रोक्नुहोस्":"🎙 बोलेर"}</button></div>
    <div className="mp-note-voice-settings" aria-label="मुख्य Voice Typing सँग मिलेको आवाज सेटिङ">
      <div className="mp-note-voice-languages" role="group" aria-label="बोल्ने भाषा">
        <button type="button" aria-pressed={voiceLang==="ne-NP"} onClick={()=>setVoiceLang("ne-NP")}>नेपाली बोल्ने</button>
        <button type="button" aria-pressed={voiceLang==="en-US"} onClick={()=>setVoiceLang("en-US")}>Speak English</button>
      </div>
      <p role="status" aria-live="polite">{listening?"🎙 सुन्दैछ · Live Browser recognition":dictation.mode==="browser"?"आवाज तयार · Live Browser recognition":dictation.capabilitiesChecked?"यो ब्राउजरमा आवाज टाइपिङ उपलब्ध छैन":"Browser recognition जाँच हुँदैछ…"}</p>
      {dictation.localStatus==="downloadable"&&<button type="button" onClick={()=>void dictation.installLocalRecognition()} disabled={dictation.localInstalling||listening}>{dictation.localInstalling?"अफलाइन आवाज डाउनलोड हुँदैछ…":"अफलाइन आवाज डाउनलोड गर्नुहोस्"}</button>}
      {dictation.localStatus==="available"&&<label><input type="checkbox" checked={dictation.localEnabled} onChange={e=>dictation.selectLocalRecognition(e.target.checked)} disabled={listening}/> यस उपकरणमै आवाज पहिचान · On-device</label>}
      {voiceLang==="ne-NP"&&<div className="mp-note-voice-cleanup">
        <label><input type="checkbox" checked={spokenNumbers} onChange={e=>setSpokenNumbers(e.target.checked)}/> बोलेका सामान्य अंक बदल्नुहोस्</label>
        <label><input type="checkbox" checked={!!transliterateLatin} onChange={e=>void toggleTransliteration(e.target.checked)}/> Roman अक्षर देवनागरीमा</label>
      </div>}
      {cleanupError&&<p role="alert">{cleanupError}</p>}
    </div>
    <div className="mp-note-account"><GoogleAuthButton language="ne"/></div>
    <label className="mp-note-editor"><span>नोट</span><textarea ref={textarea} value={text} onChange={e=>setText(e.target.value)} rows={7} maxLength={20000} placeholder={mode==="nepali"?"nepa वा नेपा लेखेर शब्द सुझाव हेर्नुहोस्…":mode==="voice"?"बोलेर लेख्न ‘बोलेर’ बटन थिच्नुहोस्…":"Write your note…"} lang={voiceLang==="ne-NP"?"ne":"en"} spellCheck={voiceLang==="en-US"}/><InlineDictationPreview textarea={textarea} interim={dictation.interim}/></label>
    {mode==="nepali"&&suggestions.length>0&&<div className="mp-note-suggestions" role="listbox" aria-label="नेपाली शब्द सुझाव">{suggestions.map((item,index)=><button type="button" key={`${item.word}-${index}`} onClick={()=>useSuggestion(item.word)}>{item.word}</button>)}</div>}
    <label>मितिमा सुरक्षित गर्नुहोस्<input type="date" value={noteDate} onChange={e=>setNoteDate(e.target.value)} required/></label>{dictation.error&&<p role="alert">{dictation.error}</p>}<div className="mp-note-actions"><small role="status">{status}</small><button type="button" onClick={save} disabled={!text.trim()||!noteDate||listening||dictation.processing}><Save size={16}/> नोट सुरक्षित गर्नुहोस्</button></div>
    <VoiceHelp unsupported={dictation.mode==="unsupported"} checked={dictation.capabilitiesChecked} browserFailure={dictation.browserFailure} language={dictation.language}/>
    {life.notes.length>0&&<div className="mp-note-list"><h3>{noteDate} · सुरक्षित नोटहरू</h3>{life.notes.filter(note=>(note.date||note.createdAt.slice(0,10))===noteDate).map(note=><article key={note.id}><div><small>{formatNeDate(note.createdAt,{time:true})} · {modeLabel(note.inputMode)}</small><p>{note.text}</p></div><button type="button" aria-label="नोट हटाउनुहोस्" onClick={()=>removeNote(note.id)}><Trash2 size={16}/></button></article>)}</div>}
  </section>;
}

export function MyDiary(){
  const [tab,setTab]=useState<TabId>(initialTab);
  const [life,setLife]=useState<LifeState>(readLife);
  const [sync,setSync]=useState("यो ब्राउजरमा सुरक्षित हुन्छ।");
  const [title,setTitle]=useState("");
  const [date,setDate]=useState("");
  const active=useMemo(()=>TABS.find(x=>x.id===tab)!,[tab]);

  useEffect(()=>{const url=new URL(location.href);url.searchParams.set("tab",tab);history.replaceState(null,"",url.pathname+"?"+url.searchParams.toString())},[tab]);
  useEffect(()=>{
    let alive=true;syncLifeTools().then(({life:next,synced})=>{if(!alive)return;setLife(next);setSync(synced?"खातासँग पनि सुरक्षित भयो।":"यस ब्राउजरमा सुरक्षित छ; साइन इन गरेपछि खातासँग पनि सुरक्षित हुन्छ।")});
    const refresh=()=>setLife(readLife());window.addEventListener("patro:life-updated",refresh);window.addEventListener("patro:sync-personal",refresh);
    return()=>{alive=false;window.removeEventListener("patro:life-updated",refresh);window.removeEventListener("patro:sync-personal",refresh)};
  },[]);

  function add(event:FormEvent){event.preventDefault();if(!active.key||!title.trim())return;const key=active.key as ListKey;const row={id:crypto.randomUUID(),title:title.trim(),date:date||undefined,updatedAt:Date.now()};const next=updateLife(current=>({...current,[key]:[...(current[key] as Array<Record<string,unknown>>),row]}));setLife(next);setTitle("");setDate("");void syncLifeTools().then(({life:merged,synced})=>{setLife(merged);if(synced)setSync("खातासँग पनि सुरक्षित भयो।")})}
  function remove(key:ListKey,id:string){const next=updateLife(current=>({...current,[key]:(current[key] as Array<Record<string,unknown>>).filter(row=>String(row.id)!==id)}));setLife(next);void syncLifeTools()}
  const rows=active.key?(life[active.key] as Array<Record<string,unknown>>):[];

  return <main className="mp-page mp-diary">
    <div className="mp-page-hero"><p className="eyebrow">आफ्नै नोट</p><h1>आफ्नै काम, नोट, म्याद र व्यक्तिगत मितिहरू</h1><p>डाटा पहिले यस उपकरणमा सुरक्षित हुन्छ; साइन इन गरेपछि खातासँग पनि सुरक्षित गर्न सकिन्छ।</p><small>{sync}</small></div>
    <div className="mp-diary-tabs" role="tablist" aria-label="आफ्नै नोटका खण्डहरू">{TABS.map(x=>{const Icon=x.icon;return <button key={x.id} role="tab" aria-selected={tab===x.id} onClick={()=>setTab(x.id)}><Icon size={18}/>{x.label}</button>})}</div>
    {tab==="today" ? <><NoteComposer life={life} onLife={setLife} onSync={setSync}/><section className="mp-card mp-diary-native"><h2>आफ्नै आजको सारांश</h2><div className="mp-diary-summary"><a href="?tab=due"><strong>{life.due.length}</strong><span>आफ्नै नियमित म्याद</span></a><a href="?tab=family"><strong>{life.family.length}</strong><span>आफ्नै परिवार मिति</span></a><a href="?tab=documents"><strong>{life.docs.length}</strong><span>आफ्नै कागजात म्याद</span></a><a href="?tab=festival"><strong>{life.festivalPlans.length}</strong><span>आफ्नै चाडपर्व तयारी</span></a></div><div className="community-actions"><a className="community-button" href="/tools/tithi-reminder">आफ्नै तिथि रिमाइन्डर</a><a className="community-button secondary" href="/settings/community">आफ्नै समुदाय</a></div></section></> : <section className="mp-card mp-diary-native"><header><div><p className="eyebrow">निजी · व्यक्तिगत</p><h2>{active.label}</h2></div></header><form className="mp-diary-add" onSubmit={add}><label>शीर्षक<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="जस्तै: पासपोर्ट म्याद / आमाको जन्मदिन" required/></label><label>मिति<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><button type="submit">थप्नुहोस्</button></form>{rows.length?<div className="mp-diary-list">{rows.map(row=><article key={String(row.id)}><div><strong>{rowLabel(row)}</strong>{rowDate(row)&&<small>{rowDate(row)}</small>}</div><button type="button" aria-label="हटाउनुहोस्" onClick={()=>remove(active.key as ListKey,String(row.id))}><Trash2 size={16}/></button></article>)}</div>:<p className="community-note">अहिलेसम्म कुनै विवरण छैन।</p>}</section>}
  </main>;
}
