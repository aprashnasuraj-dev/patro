export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
export function convert(input:string,opts:Record<string,string|boolean>={}):Result {
 const parts=input.trim().split(/\s+/); if(parts.length!==5)throw Error('Provide exactly five POSIX cron fields.');
 const ranges:[[number,number],[number,number],[number,number],[number,number],[number,number]]=[[0,59],[0,23],[1,31],[1,12],[0,7]];
 const check=(token:string,min:number,max:number,field:number)=>{
  for(const seg of token.split(',')) {if(!seg||seg.length>30)throw Error(`Invalid cron field ${field}`);
   const m=seg.match(/^(\*|\d+|\d+-\d+)(?:\/(\d+))?$/); if(!m)throw Error(`Unsupported cron expression in field ${field}: ${seg}`);
   const range=m[1]==='*'?[min,max]:m[1].includes('-')?m[1].split('-').map(Number):[Number(m[1]),Number(m[1])];
   if(range[0]<min||range[1]>max||range[0]>range[1])throw Error(`Field ${field} outside ${min}–${max}`);
   if(m[2]&&(+m[2]<1||+m[2]>max-min+1))throw Error(`Invalid step in field ${field}`);
  }
 };
 parts.forEach((p,i)=>check(p,...ranges[i],i+1));
 // A narrow, provable fast repetition check. Other cron interactions require scheduler review.
 if(/^\*\/[1-4]$/.test(parts[0]))throw Error('GitHub schedules cannot run more often than once every five minutes.');
 const tz=String(opts.timezone||'UTC').trim(); if(!/^(UTC|[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)$/.test(tz)||tz.length>64)throw Error('Use a valid-looking IANA time zone (verify its name during integration).');
 const name=String(opts.workflowName||'Scheduled task').trim();if(!name||name.length>80||/[\r\n]/.test(name))throw Error('Workflow name must be a single line under 80 characters.');
 const yaml= `name: ${JSON.stringify(name)}\non:\n  schedule:\n    - cron: '${parts.join(' ')}'\n      timezone: '${tz}'\n  workflow_dispatch:\npermissions:\n  contents: read\njobs:\n  scheduled-task:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Verify schedule trigger\n        run: echo "Scheduled action launched"\n`;
 return {text:yaml,details:{'cron':parts.join(' '),'timezone':tz,'fields':5},warnings:['Scheduled runs can be delayed or skipped; default branch only.','The sample step only prints an acknowledgment. Replace it with reviewed steps; do not embed secrets.','IANA timezone identifier syntax checked but not database existence; confirm using official zone database.']};
}
