import {finite,round} from "../_vendor/validation";
const rates:any={
 "3":[.3333,.4445,.1481,.0741],
 "5":[.20,.32,.192,.1152,.1152,.0576],
 "7":[.1429,.2449,.1749,.1249,.0893,.0892,.0893,.0446],
 "10":[.10,.18,.144,.1152,.0922,.0737,.0655,.0655,.0656,.0655,.0328]
};
export function calculate(i:any){
 const basis=finite("Depreciable basis",i.basis,0,1e15), cls=String(i.propertyClass), bonus=finite("Bonus percentage",i.bonusPct,0,100)/100;
 const bonusAmt=basis*bonus, macrsBasis=basis-bonusAmt, arr=rates[cls]; if(!arr)throw new Error("This source-prep version supports 3-, 5-, 7-, and 10-year GDS half-year table classes.");
 let accum=bonusAmt; const rows=arr.map((r:number,idx:number)=>{const dep=macrsBasis*r;accum+=dep;return{year:idx+1,rate:(r*100).toFixed(2)+"%",macrs:round(dep,2),bonus:idx===0?round(bonusAmt,2):0,total_year:round(dep+(idx===0?bonusAmt:0),2),remaining_basis:round(Math.max(0,basis-accum),2)}})
 return {"Schedule":rows,"Total scheduled":round(rows.reduce((s:any,x:any)=>s+x.total_year,0),2),
 "Scope":"GDS table planner for selected half-year classes only. It does not determine class life, mid-quarter/mid-month convention, listed-property limits, section 179 eligibility, ADS, or real-property schedules."}
}
