import{mortgageRecast,refinanceBreakEven,pmiRemoval,armAdjust,helocVsRefi,mortgagePoints,houseHack}from"./finance350-mortgage.mjs";
import{baristaFire,rothConversion,rule55,rmd,socialSecurityBreakEven}from"./finance350-retirement.mjs";
import{freelancerTax,rsuSellToCover,isoAmt,contractorVsW2}from"./finance350-tax.mjs";
import{hourlyBenefits,leaseVsBuy,balanceTransfer,inflationSalary}from"./finance350-consumer.mjs";
export{payment,num}from"./finance350-mortgage.mjs";
export{taxFromBrackets}from"./finance350-tax-utils.mjs";
export const money=n=>Number.isFinite(n)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n):"—";
export const pct=n=>Number.isFinite(n)?(n*100).toFixed(2)+"%":"—";
const calculators={
"mortgage-recast":mortgageRecast,"refinance-break-even":refinanceBreakEven,"pmi-removal-date":pmiRemoval,"arm-payment-adjustment":armAdjust,"heloc-vs-cash-out-refinance":helocVsRefi,
"barista-fire":baristaFire,"roth-conversion-tax":rothConversion,"rule-55-withdrawal-penalty":rule55,"required-minimum-distribution":rmd,"social-security-break-even":socialSecurityBreakEven,
"freelancer-quarterly-tax":freelancerTax,"hourly-to-salary-benefits":hourlyBenefits,"lease-vs-buy-car":leaseVsBuy,"balance-transfer-fee":balanceTransfer,
"mortgage-points-break-even":mortgagePoints,"house-hacking-rent-offset":houseHack,"rsu-sell-to-cover":rsuSellToCover,"iso-amt-estimator":isoAmt,
"inflation-adjusted-salary":inflationSalary,"1099-vs-w2-take-home":contractorVsW2};
export function calculate(op,values,cfg){const fn=calculators[op];if(!fn)throw new Error("Unsupported finance operation: "+op);const result=fn(values,cfg);for(const value of Object.values(result))if(typeof value==="number"&&!Number.isFinite(value))throw new Error("Calculation produced a non-finite result.");return result}
