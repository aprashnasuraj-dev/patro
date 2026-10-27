import {N,Q,M,R} from '../_vendor/guard';
export function calculate(x:Record<string,unknown>){
 const spend=N(x,'spend',0,1e9),sales=N(x,'sales',0,1e10),margin=N(x,'margin',0,100),fees=N(x,'fees',0,100),fixed=N(x,'fixed',0,1e9);
 if(margin<fees)throw Error('Additional variable fees exceed the gross margin; adjust costs or use a loss-making margin scenario separately.');
 const cm=(margin-fees)/100,contribution=sales*cm,profit=contribution-spend-fixed;
 const acos=sales>0?`${Q(spend/sales*100)}%`:'Undefined (no sales)';const roas=spend>0?`${Q(sales/spend)}×`:'Undefined (no ad spend)';
 return R([{label:'ACoS',value:acos},{label:'ROAS',value:roas},{label:'Break-even ACoS before fixed costs',value:`${Q(cm*100)}%`},{label:'Attributed contribution before advertising',value:M(contribution)},{label:'Campaign contribution after ads and fixed costs',value:M(profit)},{label:'Break-even attributed sales for given spend',value:cm>0?M((spend+fixed)/cm):'Not achievable at 0% margin'}],['A product gross margin and additional fees must not duplicate the same costs.','Attributed revenue is not necessarily incremental revenue; cannibalization, refunds, taxes and attribution windows may change real profits.'],['ACoS = spend ÷ attributed sales; ROAS = sales ÷ spend, undefined for zero denominators.','Available contribution margin = gross margin − variable fees.','Break-even revenue = (ad spend + fixed costs) ÷ contribution margin.']);
}
