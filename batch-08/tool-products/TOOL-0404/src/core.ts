import {finite,pct,round} from "../_vendor/validation";
export function calculate(i:any){
 const L=finite("Slab length",i.lengthFt,0.1,1000),W=finite("Slab width",i.widthFt,0.1,1000),s=finite("Rebar spacing",i.spacingIn,1,60)/12;
 const cover=finite("Edge cover",i.coverIn,0,12)/12, waste=pct("Waste",i.wastePct);
 const usableL=Math.max(0,L-2*cover), usableW=Math.max(0,W-2*cover);
 const barsAlongL=Math.floor(usableW/s)+1, barsAlongW=Math.floor(usableL/s)+1;
 const totalFt=(barsAlongL*usableL+barsAlongW*usableW)*(1+waste);
 const stock=finite("Stock bar length",i.stockBarFt,1,100), stockBars=Math.ceil(totalFt/stock);
 const area=L*W*(1+waste), sheetL=finite("Mesh sheet length",i.meshLengthFt,1,100),sheetW=finite("Mesh sheet width",i.meshWidthFt,1,100);
 return {"Bars parallel to length":barsAlongL,"Bars parallel to width":barsAlongW,"Rebar length with waste (ft)":round(totalFt,1),
 "Stock bars (cut-only estimate)":stockBars,"Mesh sheets by area":Math.ceil(area/(sheetL*sheetW)),"Important":"Does not design bar size, development/lap splice, support chairs, cover class, or structural reinforcement."}
}
