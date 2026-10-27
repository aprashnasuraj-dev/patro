import {finite,round} from "../_vendor/validation";
const rules:any={
 AL:{sales:250000,tx:null,salesInclusive:false,basis:"TPP sales, prior year",asOf:"2026-10"},
 AK:{sales:100000,tx:null,salesInclusive:true,basis:"statewide gross remote sales, previous/current year",asOf:"2026-10"},
 AZ:{sales:100000,tx:null,salesInclusive:false,basis:"gross retail/online sales",asOf:"2026-10"},
 AR:{sales:100000,tx:200,salesInclusive:false,txInclusive:true,basis:"sales OR transactions",asOf:"2026-10"},
 CA:{sales:500000,tx:null,salesInclusive:false,basis:"combined sales",asOf:"2026-10"},
 CO:{sales:100000,tx:null,salesInclusive:false,basis:"taxable sales",asOf:"2026-10"},
 IL:{sales:100000,tx:null,salesInclusive:true,basis:"gross receipts from Illinois TPP sales; transaction test removed 2026",asOf:"2026-10"},
 IN:{sales:100000,tx:null,salesInclusive:false,basis:"gross revenue; transaction test removed 2024",asOf:"2026-10"},
 MA:{sales:100000,tx:null,salesInclusive:false,basis:"Massachusetts sales",asOf:"2026-10"},
 NC:{sales:100000,tx:null,salesInclusive:false,basis:"gross sales; transaction test removed 2024",asOf:"2026-10"},
 NY:{sales:500000,tx:100,salesInclusive:false,txInclusive:false,basis:"gross receipts > $500,000 AND >100 sales in preceding four quarters",asOf:"2026-10",logic:"and"},
 SD:{sales:100000,tx:null,salesInclusive:false,basis:"gross revenue; transaction test removed 2023",asOf:"2026-10"},
 TX:{sales:500000,tx:null,salesInclusive:true,basis:"total Texas revenue, preceding 12 months",asOf:"2026-10"},
 UT:{sales:100000,tx:null,salesInclusive:false,basis:"gross revenue; transaction test removed 2025",asOf:"2026-10"},
 WI:{sales:100000,tx:null,salesInclusive:false,basis:"gross sales",asOf:"2026-10"},
 WY:{sales:100000,tx:null,salesInclusive:false,basis:"gross revenue; transaction test removed 2024",asOf:"2026-10"}
};
export function calculate(i:any){
 const state=String(i.state).toUpperCase(), sales=finite("Sales",i.sales,0,1e15), tx=finite("Transactions",i.transactions,0,1e9);
 let r=rules[state];
 if(!r){const cs=finite("Custom sales threshold",i.customSalesThreshold,0,1e15),ct=finite("Custom transaction threshold",i.customTransactionThreshold,0,1e9);r={sales:cs||null,tx:ct||null,basis:"custom user-entered rule",logic:String(i.customLogic||"or"),asOf:"custom"}}
 const salesHit=r.sales!==null?(r.salesInclusive===false?sales>r.sales:sales>=r.sales):false, txHit=r.tx!==null?(r.txInclusive===false?tx>r.tx:tx>=r.tx):false;
 const hit=r.logic==="and"?(salesHit&&txHit):(salesHit||txHit);
 return {"Jurisdiction":state,"Status":hit?"THRESHOLD MET / REVIEW REGISTRATION":"Below encoded threshold","Sales":round(sales,2),"Transactions":tx,
 "Sales threshold":r.sales??"none","Transaction threshold":r.tx??"none","Threshold basis":r.basis,"Snapshot":r.asOf,
 "Legal warning":"Physical presence can create nexus regardless of economic threshold. Marketplace, product, local-jurisdiction and counting rules vary; confirm with the state."}
}
