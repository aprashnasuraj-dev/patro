import {finite,pct,round} from "../_vendor/validation";
export function calculate(i:any){
 const area=finite("Area",i.areaSqFt,0.01,1000000), waste=pct("Waste",i.wastePct);
 const pL=finite("Paver length",i.paverLengthIn,0.1,120), pW=finite("Paver width",i.paverWidthIn,0.1,120);
 const netArea=area*(1+waste), paverArea=pL*pW/144;
 const baseDepth=finite("Base depth",i.baseDepthIn,0,48)/12, sandDepth=finite("Bedding depth",i.beddingDepthIn,0,12)/12;
 const jointRate=finite("Joint sand rate",i.jointSandLbPer100SqFt,0,1000);
 return {"Pavers":Math.ceil(netArea/paverArea),"Purchase area with waste (ft²)":round(netArea,2),
 "Compacted base volume (yd³)":round(area*baseDepth/27,3),"Bedding sand volume (yd³)":round(area*sandDepth/27,3),
 "Polymeric sand (lb)":round(netArea*jointRate/100,1),"Reminder":"Base thickness, compaction and joint-sand coverage depend on product, soil, climate and traffic loading."}
}
