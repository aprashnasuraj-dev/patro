import {finite,roundTo} from '../_vendor/business';
export function marginMarkup(costRaw:number,priceRaw:number,targetMarginRaw:number,targetMarkupRaw:number){
 const cost=finite(costRaw,'Cost',0,1e12),price=finite(priceRaw,'Price',0,1e12),tm=finite(targetMarginRaw,'Target margin',-1000,99.999)/100,tmu=finite(targetMarkupRaw,'Target markup',-100,100000)/100;
 const profit=price-cost; const margin=price===0?null:profit/price*100; const markup=cost===0?(profit===0?null:Infinity):profit/cost*100;
 const priceFromMargin=cost/(1-tm),priceFromMarkup=cost*(1+tmu);
 return {cost,price,profit:roundTo(profit),marginPct:margin===null?null:roundTo(margin,4),markupPct:markup===null?null:(!Number.isFinite(markup)?Infinity:roundTo(markup,4)),priceFromMargin:roundTo(priceFromMargin),priceFromMarkup:roundTo(priceFromMarkup),formulas:['profit=price-cost','margin=profit/price','markup=profit/cost','price(target margin)=cost/(1-margin)','price(target markup)=cost*(1+markup)']};
}
