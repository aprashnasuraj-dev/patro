export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
type Finding={line:number;severity:'info'|'warning'|'critical';code:string;message:string;reference:string};
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 if(input.length>200000)throw Error('Dockerfile exceeds 200 KB');const physical=input.split(/\r?\n/);if(physical.length>3000)throw Error('Too many lines');
 let logical:Array<{line:number;command:string}>=[];for(let i=0;i<physical.length;i++){const s=physical[i].trim();if(!s||s.startsWith('#'))continue;let cmd=s,start=i+1;while(/\\$/.test(cmd)&&i+1<physical.length){cmd=cmd.slice(0,-1)+' '+physical[++i].trim()}logical.push({line:start,command:cmd});}
 const findings:Finding[]=[];const add=(line:number,severity:Finding['severity'],code:string,message:string)=>findings.push({line,severity,code,message,reference:'https://docs.docker.com/build/cache/optimize/'});
 let stage=0,copyAll=-1,explicitUser=false,hasFrom=false;const seen=new Set<string>();
 for(const item of logical){const m=item.command.match(/^([A-Za-z]+)\s+(.*)$/);if(!m){add(item.line,'warning','PARSE','Cannot parse directive');continue;}const directive=m[1].toUpperCase(),rest=m[2];
 if(directive==='FROM'){hasFrom=true;stage++;copyAll=-1;explicitUser=false;if(/(?:^|:)latest(?:\s|$)/i.test(rest)||!rest.includes(':')&&!rest.includes('@sha256:'))add(item.line,'warning','FLOATING_IMAGE','Pin a reviewed base image version or digest for reproducible builds.');}
 if(directive==='COPY'&&/^(?:--[^ ]+\s+)*\.\s+[^\s]+/.test(rest))copyAll=item.line;
 if(directive==='RUN'){if(copyAll>=0&&/\b(?:npm (?:install|ci)|pip install|poetry install|yarn install|pnpm install)\b/.test(rest))add(item.line,'warning','LATE_INSTALL','COPY . . appears before package installation; isolate dependency manifest copy to improve cache reuse.');
  if(/\b(?:apt-get|apk|dnf)\s+(?:upgrade|dist-upgrade)\b/.test(rest))add(item.line,'info','UPGRADE','Unpinned OS upgrades can reduce build reproducibility.');
  if(/\bcurl\b.*\|\s*(?:sh|bash)\b/.test(rest))add(item.line,'critical','REMOTE_SHELL','Piping downloaded content into a shell requires strong provenance and integrity review.');
  if(/\b(?:npm install)\b/.test(rest))add(item.line,'info','NPM_CI','Prefer npm ci with a committed lockfile where appropriate.');}
 if(directive==='ADD'&&/\bhttps?:\/\//i.test(rest))add(item.line,'warning','REMOTE_ADD','Remote ADD has external acquisition semantics; verify checksums and caching.');
 if(directive==='USER'&&rest.trim()!=='root'&&rest.trim()!=='0')explicitUser=true;
 if(directive==='ENV'&&/(?:password|secret|token|api[_-]?key)/i.test(rest))add(item.line,'critical','SECRET_ENV','Never bake credentials into image ENV or ARG; use secure build secrets.');
 seen.add(directive);}
 if(!hasFrom)throw Error('No FROM directive found');if(!explicitUser)add(logical[logical.length-1]?.line||1,'warning','ROOT_USER','No non-root USER directive found in scanned stages.');
 if(!seen.has('HEALTHCHECK'))add(1,'info','HEALTHCHECK','Consider application-specific health signaling if orchestrator does not supply it.');
 return{text:JSON.stringify({stages:stage,findings},null,2)+'\n',details:{stages,findings:findings.length,critical:findings.filter(x=>x.severity==='critical').length},warnings:['Advisory heuristics only: parser does not implement all Dockerfile grammar or full multi-stage scope.','Not a vulnerability scanner; pinning alone does not prove an image is safe.']};
}
