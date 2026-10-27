#!/usr/bin/env node
import fs from 'node:fs/promises';
const baseline=JSON.parse(await fs.readFile(new URL('../../config/mm530-phase1-baseline.json',import.meta.url),'utf8'));
const report=JSON.parse(await fs.readFile(new URL('../../reports/mm530-qa/all-tools.json',import.meta.url),'utf8'));
const s=report.summary||{},c=s.checks||{},problems=[];
const get=(stage,state)=>(c[stage]||{})[state]||0;
if(s.tested!==baseline.expected_tools)problems.push('tested '+s.tested+' != '+baseline.expected_tools);
if((s.globalErrors||[]).length>baseline.maximum_regression.global_errors)problems.push('globalErrors='+s.globalErrors.length);
const maxima=[
 ['failed_tools',s.failed,baseline.maximum_regression.failed_tools],
 ['metadata_failures',get('metadata','FAIL'),baseline.maximum_regression.metadata_failures],
 ['compile_failures',get('compile','FAIL'),baseline.maximum_regression.compile_failures],
 ['unit_failures',get('unit','FAIL'),baseline.maximum_regression.unit_failures],
 ['browser_source_failures',get('browser_source','FAIL'),baseline.maximum_regression.browser_source_failures]
];
for(const [name,got,max] of maxima)if((got||0)>max)problems.push(name+'='+got+' exceeds Phase-1 maximum '+max);
const exact=[
 ['registry_pass',get('registry','PASS'),baseline.exact_invariants.registry_pass],
 ['metadata_pass',get('metadata','PASS'),baseline.exact_invariants.metadata_pass],
 ['html_pass',get('html','PASS'),baseline.exact_invariants.html_pass],
 ['source_pass',get('source','PASS'),baseline.exact_invariants.source_pass]
];
for(const [name,got,want] of exact)if(got!==want)problems.push(name+'='+got+' != '+want);
const result={phase:'PHASE_1_CLOSURE',status:problems.length?'FAIL':'PASS',source_run_id:baseline.source_run_id,current:{tested:s.tested,failed:s.failed,metadata_failures:get('metadata','FAIL'),compile_failures:get('compile','FAIL'),unit_failures:get('unit','FAIL'),browser_source_failures:get('browser_source','FAIL'),global_errors:(s.globalErrors||[]).length},problems};
console.log(JSON.stringify(result,null,2));
if(problems.length)process.exitCode=1;
