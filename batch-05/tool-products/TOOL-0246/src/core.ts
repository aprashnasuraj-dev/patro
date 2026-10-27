import {finite,roundTo} from '../_vendor/business';
export type SaaSInput={startCustomers:number;lostCustomers:number;newCustomers:number;acqSpend:number;arpa:number;grossMarginPct:number;startMrr:number;churnMrr:number;contractionMrr:number;expansionMrr:number;newMrr:number};
export function saasMetrics(x:SaaSInput){
 const sc=finite(x.startCustomers,'Starting customers',1,1e12),lost=finite(x.lostCustomers,'Lost customers',0,1e12),newc=finite(x.newCustomers,'New customers',1,1e12);
 if(lost>sc)throw new Error('Lost customers cannot exceed starting customers.');
 const spend=finite(x.acqSpend,'Acquisition spend',0,1e15),arpa=finite(x.arpa,'ARPA',0,1e12),gm=finite(x.grossMarginPct,'Gross margin',-100,100)/100;
 const sm=finite(x.startMrr,'Starting MRR',0,1e15),cm=finite(x.churnMrr,'Churned MRR',0,1e15),con=finite(x.contractionMrr,'Contraction MRR',0,1e15),ex=finite(x.expansionMrr,'Expansion MRR',0,1e15),nm=finite(x.newMrr,'New MRR',0,1e15);
 const churn=lost/sc,cac=spend/newc,monthlyGrossProfit=arpa*gm;
 const ltv=churn>0?monthlyGrossProfit/churn:null,payback=monthlyGrossProfit>0?cac/monthlyGrossProfit:null,nrr=sm>0?(sm-cm-con+ex)/sm:null,ending=sm-cm-con+ex+nm;
 return {customerChurnPct:roundTo(churn*100,4),cac:roundTo(cac),simplifiedLtv:ltv===null?null:roundTo(ltv),cacPaybackMonths:payback===null?null:roundTo(payback,2),nrrPct:nrr===null?null:roundTo(nrr*100,4),endingMrr:roundTo(ending),arr:roundTo(ending*12),definitions:{ltv:'monthly ARPA × gross-margin fraction ÷ monthly customer-churn fraction',payback:'CAC ÷ monthly gross profit per customer',nrr:'(starting MRR − churned MRR − contraction MRR + expansion MRR) ÷ starting MRR'}};
}
