import { lazy, Suspense, useState } from "react";
import { l } from "../useUiLanguage";
const Notes=lazy(()=>import("./HomeQuickNote").then(module=>({default:module.HomeQuickNote})));
export function HomeNotesDisclosure({language}:{language:"ne"|"en"}){
 const [opened,setOpened]=useState(false);
 return <details className="home-notes" onToggle={event=>{if(event.currentTarget.open)setOpened(true);}}><summary>{l(language,"मेरो टिपोट लेख्नुहोस्","Write a private note")}</summary>{opened?<Suspense fallback={<p role="status">{l(language,"टिपोट खोल्दैछ…","Opening notes…")}</p>}><Notes language={language}/></Suspense>:null}</details>;
}
