import {bounded} from '../_vendor/guards.js';
// Do not compile or execute the candidate regex: all checks below are conservative static heuristics.
export function compute(x){const source=bounded(x.pattern,2000);if(!source)throw Error('Enter a regex source pattern.');const flags=bounded(x.flags||'',10);if(!/^[dgimsuvy]*$/.test(flags)||new Set(flags).size!==flags.length||flags.includes('u')&&flags.includes('v'))throw Error('Invalid or conflicting JavaScript regex flags.');
 const problems=[];const check=(rule,kind,reason)=>{if(rule.test(source))problems.push({severity:kind,finding:reason});};
 check(/\([^()]*[+*][^()]*\)[+*{]/,'high','Nested repetition can produce combinatorial backtracking, e.g. (a+)+.');
 check(/\((?:[^()]*\|){1,}[^()]*\)[+*{]/,'medium','Repeated alternatives may overlap; inspect shared prefixes.');
 check(/\((?:[^()]*\.\*|[^()]*\.\+)[^()]*\)[+*{]/,'high','Wildcards repeated inside repeated groups are prone to explosive search.');
 check(/\\[1-9]|\\k</,'medium','Backreferences can magnify matching complexity.');
 check(/\([^()]*(?:\w\+|\w\*)[^()]*\)[+*{]/,'high','Nested quantified tokens need a linear-time proof.');
 if(source.length>500)problems.push({severity:'info',finding:'Long expression: review generated branches and untrusted input bounds.'});
 const risk=problems.some(v=>v.severity==='high')?'HIGH HEURISTIC':problems.length?'REVIEW REQUIRED':'NO KNOWN HEURISTIC HIT';return {summary:`${risk} · ${problems.length} findings`,metrics:[['Static findings',problems.length],['Pattern length',source.length],['Executed samples',0]],rows:problems,visual:{type:'bars',label:'Static heuristic findings by severity',items:['high','medium','info'].map(s=>({label:s,value:problems.filter(v=>v.severity===s).length,max:Math.max(1,problems.length)}))},text:problems.map(v=>`${v.severity.toUpperCase()}: ${v.finding}`).join('\n')||'No implemented heuristic matched. This is not a safety certificate.',warnings:['No candidate regular expression was executed. The checker may produce false negatives and false positives.','Use a proven linear-time engine (such as RE2), input limits, and separate timeout-controlled load tests for security assurance.']};}
