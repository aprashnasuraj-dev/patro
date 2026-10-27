import {finite,parseLines,round} from "../_vendor/validation";
export function calculate(i:any){
 const L=finite("Wall length",i.wallLengthFt,0.1,500)*12, H=finite("Wall height",i.wallHeightFt,1,240), s=finite("Stud spacing",i.spacingIn,6,48);
 const base=Math.floor(L/s)+1;
 const lines=parseLines(String(i.openings||""),50);
 let kings=0,jacks=0,cripples=0; const openings:any[]=[];
 for(const line of lines){
  const m=line.match(/^\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*$/i); if(!m) throw new Error(`Opening "${line}" must be widthxheight in inches.`);
  const w=+m[1],h=+m[2]; if(w<=0||h<=0||w>=L||h>=H) throw new Error(`Opening "${line}" is out of range.`);
  kings+=2;jacks+=2; const c=Math.max(0,Math.floor(w/s)-1);cripples+=c; openings.push({opening:line,king_studs:2,jack_studs:2,header_cripples:c,jack_cut_in:round(h,2)});
 }
 const platesFt=(L/12)*3;
 return {"Layout studs before openings":base,"Opening king studs":kings,"Opening jack studs":jacks,"Estimated header cripples":cripples,
 "Three-plate stock length (ft)":round(platesFt,1),"Opening detail":openings,
 "Scope":"Materials/cut-list planning only. Header sizing, shear/bracing, fire blocking and local framing rules are not designed."}
}
