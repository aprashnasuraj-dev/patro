import {finite,round} from "../_vendor/validation";
export function calculate(i:any){
 const current=finite("Current-year tax",i.currentTax,0,1e10), prior=finite("Prior-year tax",i.priorTax,0,1e10), agi=finite("Prior AGI",i.priorAgi,0,1e10);
 const withholding=finite("Expected withholding",i.withholding,0,1e10), status=String(i.filingStatus);
 const high=agi>(status==="mfs"?75000:150000), priorPct=high?1.10:1.00;
 const currentTarget=.90*current, priorTarget=priorPct*prior, required=Math.min(currentTarget,priorTarget);
 const remaining=Math.max(0,required-withholding);
 return {"90% current-year target":round(currentTarget,2),`${Math.round(priorPct*100)}% prior-year target`:round(priorTarget,2),"Safe-harbor annual target":round(required,2),
 "Expected withholding":round(withholding,2),"Remaining estimated payments":round(remaining,2),"Equal quarterly amount":round(remaining/4,2),
 "High-income prior-year rule":high?"110% prior-year test used":"100% prior-year test used",
 "Scope":"General individual rule only; special farmer/fisher, household employer, nonresident, fiscal-year and short-year rules are not modeled."}
}
