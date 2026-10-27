export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
type Location={type:'exact'|'prefix'|'priority-prefix'|'regex'|'regex-insensitive';pattern:string;line:number};
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 if(input.length>120000)throw Error('Configuration exceeds 120 KB');let locations:Location[]=[];
 // Extracts only top-level, nonnested location definitions from a supplied set of simple blocks.
 const rx=/\blocation\s+(=|\^~|~\*|~)?\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s{]+)\s*\{/g;let m:RegExpExecArray|null;
 while((m=rx.exec(input))){if(locations.length>=100)throw Error('Maximum 100 locations');const modifier=m[1]||'';const pattern=m[2].replace(/^['"]|['"]$/g,'');if(pattern.length>200)throw Error('Pattern too long');
 locations.push({type:modifier==='='?'exact':modifier==='^~'?'priority-prefix':modifier==='~'?'regex':modifier==='~*'?'regex-insensitive':'prefix',pattern,line:input.slice(0,m.index).split('\n').length});}
 if(!locations.length)throw Error('No supported location directives found');
 const raw=String(opts.uri||'/');if(!raw.startsWith('/')||raw.length>1024||/[\r\n]/.test(raw))throw Error('URI must start with / and be under 1,025 characters');const uri=raw.split('?')[0];if(/%|\/\.\.?\//.test(uri))throw Error('Encoded or dot-segment URIs need Nginx-specific normalization and are not simulated');
 const exact=locations.find(l=>l.type==='exact'&&l.pattern===uri);let chosen=exact||null;const trace:string[]=[];
 if(exact)trace.push(`Exact match at line ${exact.line} has highest precedence.`);else {
 const pref=locations.filter(l=>(l.type==='prefix'||l.type==='priority-prefix')&&uri.startsWith(l.pattern)).sort((a,b)=>b.pattern.length-a.pattern.length)[0];
 if(pref){trace.push(`Longest matching prefix: ${pref.pattern} on line ${pref.line}.`);if(pref.type==='priority-prefix'){chosen=pref;trace.push('^~ suppresses regular-expression checks.');}}
 if(!chosen){for(const l of locations){if(l.type!=='regex'&&l.type!=='regex-insensitive')continue;
 if(l.pattern.length>100||/\\[1-9]/.test(l.pattern)||/\([^)]*[+*}][^)]*\)\s*[+*{]/.test(l.pattern)||/\(\?/.test(l.pattern))throw Error('Complex or potentially expensive regex not simulated: '+l.pattern);
 let r:RegExp;try{r=new RegExp(l.pattern,l.type==='regex-insensitive'?'i':'')}catch{throw Error('Invalid Nginx regex in line '+l.line)}
 if(r.test(uri)){chosen=l;trace.push(`First matching regular expression on line ${l.line}.`);break;}}
 if(!chosen&&pref){chosen=pref;trace.push('No regular expression matched; prefix selected.');}}
 }
 return{text:JSON.stringify({uri,selected:chosen,trace,locationsConsidered:locations.length},null,2)+'\n',details:{locations:locations.length,selected:chosen?chosen.type:'none'},warnings:['This is a precedence simulator for simple location blocks, not a complete Nginx parser.','No processing of rewrite, internal redirects, named or nested locations. Regex is ECMAScript, not Nginx PCRE, and may differ on edge cases.']};
}
