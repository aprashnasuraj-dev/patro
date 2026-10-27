import {finite,round} from "../_vendor/validation";
const rules:any={
 UK:{threshold:90000,currency:"GBP",inclusive:false,window:"rolling 12 months / expected next 30 days",basis:"taxable turnover",asOf:"2026-10"},
 CA:{threshold:30000,currency:"CAD",inclusive:false,window:"single quarter or four consecutive quarters",basis:"worldwide taxable supplies for most businesses",asOf:"2026-10"},
 AU:{threshold:75000,currency:"AUD",inclusive:true,window:"current or projected 12 months",basis:"GST turnover for businesses",asOf:"2026-10"},
 NZ:{threshold:60000,currency:"NZD",inclusive:true,window:"last or next 12 months",basis:"taxable activity turnover",asOf:"2026-10"},
 SG:{threshold:1000000,currency:"SGD",inclusive:false,window:"retrospective calendar year / prospective next 12 months",basis:"taxable turnover",asOf:"2026-10"},
 IN:{threshold:2000000,currency:"INR",inclusive:false,window:"financial year",basis:"general CGST Act threshold; state/category exceptions exist",asOf:"2026-10"}
};
export function calculate(i:any){
 const code=String(i.jurisdiction).toUpperCase(), turnover=finite("Turnover",i.turnover,0,1e15);
 const r=rules[code]||{threshold:finite("Custom threshold",i.customThreshold,0,1e15),currency:String(i.currency||"LOCAL"),window:"custom",basis:"custom",asOf:"custom"};
 const hit=r.inclusive===true?turnover>=r.threshold:turnover>r.threshold; return {"Jurisdiction":code,"Turnover":round(turnover,2),"Threshold":r.threshold+" "+r.currency,"Status":hit?"OVER / AT registration trigger":"Below reference threshold",
 "Measurement window":r.window,"Threshold basis":r.basis,"Snapshot":r.asOf,
 "Warning":"Registration can be mandatory below a headline threshold for specific activities, non-residents, cross-border supplies or special categories. Confirm current local rules."}
}
