
export function bayesTest(prevalence:number,sensitivity:number,specificity:number,population=10000){
 for(const [v,n] of [[prevalence,"prevalence"],[sensitivity,"sensitivity"],[specificity,"specificity"]] as const)if(!(v>=0&&v<=1))throw new Error(`${n} must be a probability.`);
 if(!Number.isInteger(population)||population<100||population>1_000_000)throw new Error("Natural-frequency population must be an integer from 100 to 1,000,000.");
 const tp=prevalence*sensitivity,fn=prevalence*(1-sensitivity),fp=(1-prevalence)*(1-specificity),tn=(1-prevalence)*specificity;
 const pos=tp+fp,neg=tn+fn,ppv=pos?tp/pos:NaN,npv=neg?tn/neg:NaN;
 return {ppv,npv,positiveRate:pos,negativeRate:neg,naturalFrequencies:{truePositive:tp*population,falseNegative:fn*population,falsePositive:fp*population,trueNegative:tn*population,population},warning:"Predictive values depend on prevalence; changing prevalence can change PPV/NPV even when sensitivity and specificity stay fixed."};
}
