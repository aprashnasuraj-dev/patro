import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {policyFor,policyHtml} from '../scripts/mm530/policy.mjs';
test('Tax rules change notice in English and Nepali',()=>{
 const t={title:'1099-K Reporting Tax Threshold Calculator'};
 assert.ok(policyFor(t).some(x=>x.kind==='tax'));
 const h=policyHtml(t);
 assert.match(h,/lang="ne"/);assert.match(h,/lang="en"/);assert.match(h,/rates can change/);
});
test('Legal tools retained with notice',()=>{
 const t={id:'TOOL-0479',title:'Commercial Invoice & Customs Forms Generator'};
 assert.ok(policyHtml(t).includes('data-mm530-policy'));
 assert.ok(policyFor(t).length>0);
});
test('Ordinary developer tools do not acquire notices',()=>assert.equal(policyHtml({title:'CSV to GraphQL Schema Generator'}),''));

test('employment-law calculators are preserved but classified for regulatory notice',()=>{
 const t={title:'Final Paycheck & PTO Payout Deadline Calculator',topic_group:'Health & Employment'};
 const kinds=policyFor(t).map(x=>x.kind);
 assert.ok(kinds.includes('regulatory'));
 assert.match(policyHtml(t),/not legal advice/i);
});
