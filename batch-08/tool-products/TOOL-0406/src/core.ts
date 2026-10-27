import {finite,pct,round} from "../_vendor/validation";
const defaults:any={straight:10,diagonal:12,herringbone:15};
export function calculate(i:any){
 const area=finite("Installed area",i.areaSqFt,0.01,1000000), pieceL=finite("Piece length",i.pieceLengthIn,0.1,240), pieceW=finite("Piece width",i.pieceWidthIn,0.1,240);
 const pattern=String(i.pattern), waste=i.useSuggested?defaults[pattern]:finite("Waste",i.wastePct,0,100);
 const required=area*(1+waste/100), each=(pieceL*pieceW)/144;
 return {"Pattern":pattern,"Waste factor used":waste+"%","Material area to buy (ft²)":round(required,2),"Whole pieces":Math.ceil(required/each),
 "Reminder":"Suggested waste percentages are planning heuristics, not standards. Room geometry, borders, batch matching, breakage and installer method can materially change waste."}
}
