import {finite,round} from "../_vendor/validation";
const factors=[4,2.4,1.5,1], pct=[.225,.45,.675,.90];
const schedules:any={
 single:[[12400,.10],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[640600,.35],[Infinity,.37]],
 mfj:[[24800,.10],[100800,.12],[211400,.22],[403550,.24],[512450,.32],[768700,.35],[Infinity,.37]],
 mfs:[[12400,.10],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[384350,.35],[Infinity,.37]],
 hoh:[[17700,.10],[67450,.12],[105700,.22],[201750,.24],[256200,.32],[640600,.35],[Infinity,.37]]
};
function tax(x:number,status:string){let prev=0,t=0;for(const [cap,r] of schedules[status]){const amt=Math.max(0,Math.min(x,cap)-prev);t+=amt*r;if(x<=cap)break;prev=cap}return t}
export function calculate(i:any){
 const status=String(i.filingStatus), agi=String(i.cumulativeAgi).split(",").map(Number), ded=String(i.cumulativeDeductions).split(",").map(Number);
 if(agi.length!==4||ded.length!==4||agi.some(x=>!Number.isFinite(x))||ded.some(x=>!Number.isFinite(x))) throw new Error("Enter four comma-separated cumulative AGI and deduction amounts.");
 const standard=finite("Standard deduction",i.standardDeduction,0,200000), credits=String(i.annualizedCredits).split(",").map(Number);
 const other=String(i.annualizedOtherTaxes).split(",").map(Number); if(credits.length!==4||other.length!==4)throw new Error("Enter four credit and tax values.");
 const regularAnnual=finite("Required annual payment",i.requiredAnnualPayment,0,1e9);
 let prevTarget=0; const rows:any[]=[];
 for(let k=0;k<4;k++){
   const annAgi=agi[k]*factors[k], annItem=ded[k]*factors[k], taxable=Math.max(0,annAgi-Math.max(standard,annItem));
   const annTax=Math.max(0,tax(taxable,status)-credits[k])+other[k];
   const annualizedCum=annTax*pct[k], regularCum=regularAnnual*(k+1)/4;
   const target=Math.min(annualizedCum,regularCum);
   const installment=Math.max(0,target-prevTarget); prevTarget=target;
   rows.push({period:["Jan-Mar","Jan-May","Jan-Aug","Full year"][k],factor:factors[k],annualized_taxable:round(taxable,2),annualized_tax:round(annTax,2),annualized_cumulative_target:round(annualizedCum,2),regular_cumulative_target:round(regularCum,2),planned_installment:round(installment,2)});
 }
 return {"2026 planning schedule":rows,"Caution":"Planning model based on 2026 annualization periods and tax-rate schedules. Schedule AI has additional lines/rules for credits, SE tax, withholding, AMT and special items; verify against final Form 2210 before filing."}
}
