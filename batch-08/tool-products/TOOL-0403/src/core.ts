import {finite,round} from "../_vendor/validation";
export function calculate(i:any){
 const rise=finite("Total rise",i.totalRiseIn,1,400), tread=finite("Target tread",i.treadDepthIn,1,30);
 const maxR=finite("Maximum riser",i.maxRiserIn,1,20), minT=finite("Minimum tread",i.minTreadIn,1,30);
 const risers=Math.ceil(rise/maxR), actual=rise/risers, treads=Math.max(1,risers-1), run=treads*tread;
 const headroom=finite("Headroom",i.headroomIn,0,200), minHead=finite("Minimum headroom",i.minHeadroomIn,0,200);
 return {"Risers":risers,"Actual riser (in)":round(actual,3),"Treads":treads,"Total horizontal run (in)":round(run,2),
 "Riser compliance":actual<=maxR?"PASS":"FAIL","Tread compliance":tread>=minT?"PASS":"FAIL","Headroom check":headroom>=minHead?"PASS":"FAIL",
 "Preset note":"Default limits are 2021 IRC model-code values; jurisdictions may amend them."}
}
