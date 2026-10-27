import {finite,round} from "../_vendor/validation";
const joists:any={
 "southern-pine":{"2x6":[119,108,91],"2x8":[157,142,116],"2x10":[194,168,137],"2x12":[216,198,162]},
 "df-hf-spf":{"2x6":[114,100,82],"2x8":[150,133,109],"2x10":[188,163,133],"2x12":[216,189,154]},
 "cedar-redwood":{"2x6":[106,96,82],"2x8":[140,127,106],"2x10":[179,156,127],"2x12":[209,181,148]}
};
const beams:any={
 "2-2x6":[80,68,61,55,51,48,45],"2-2x8":[102,88,78,71,66,61,57],
 "2-2x10":[121,105,95,85,78,73,69],"2-2x12":[143,124,110,100,93,87,81],
 "3-2x6":[95,86,77,70,65,60,57],"3-2x8":[127,111,99,90,83,77,73],
 "3-2x10":[153,132,117,105,99,92,87],"3-2x12":[180,156,141,126,119,109,103]
};
function ftin(inches:number){const f=Math.floor(inches/12),inch=Math.round(inches-f*12);return `${f}'-${inch}"`}
export function calculate(i:any){
 const species=String(i.species),size=String(i.joistSize),spacing=Number(i.spacing), spanFt=finite("Joist span",i.joistSpanFt,0.1,30);
 const idx=[12,16,24].indexOf(spacing); if(idx<0) throw new Error("Spacing must be 12, 16, or 24 in o.c.");
 const allowed=joists[species]?.[size]?.[idx]; if(!allowed) throw new Error("No DCA 6 joist reference for that combination.");
 const joistOk=spanFt*12<=allowed;
 const beamSize=String(i.beamSize), beamFt=finite("Beam span",i.beamSpanFt,0.1,30);
 const cols=[6,8,10,12,14,16,18]; let c=cols.findIndex(x=>spanFt<=x); if(c<0)c=6;
 const beamAllowed=beams[beamSize]?.[c]; if(!beamAllowed) throw new Error("Beam table in this tool covers Southern Pine multi-ply beams only.");
 return {"Joist reference max":ftin(allowed),"Joist check":joistOk?"PASS under DCA 6 table assumptions":"OVER reference span",
 "Beam reference max":ftin(beamAllowed),"Beam check":beamFt*12<=beamAllowed?"PASS under DCA 6 table assumptions":"OVER reference span",
 "Reference assumptions":"AWC DCA 6-15: 40 psf live, 10 psf dead, No. 2 grade, wet service. Verify local code and all connections/footings."}
}
