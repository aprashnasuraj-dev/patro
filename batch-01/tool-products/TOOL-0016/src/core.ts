export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
const regex=/^(\S+) (\S+) (\S+) \[([^\]]+)\] "((?:\\.|[^"\\])*)" (\d{3}) (\d+|-) (?:"((?:\\.|[^"\\])*)" "((?:\\.|[^"\\])*)")?$/;
const csv=(v:string)=>{const safe=/^[=+@\-\t\r]/.test(v)?"'"+v:v;return '"'+safe.replace(/"/g,'""')+'"'};
const fields=['ip','ident','user','timestamp','request','status','bytes','referer','user_agent'];
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 const lines=input.split(/\r?\n/).filter(x=>x.trim());if(lines.length>10000)throw Error('Maximum 10,000 log entries');const out:string[]=[fields.join(',')];let invalid=0;
 for(const [i,line] of lines.entries()){if(line.length>16000)throw Error(`Line ${i+1} exceeds 16 KB`);const m=regex.exec(line);if(!m){invalid++;if(opts.strict!==false)throw Error(`Unsupported common/combined log line ${i+1}`);continue;}
  const vals=m.slice(1,10).map((x,j)=>x??'');if(+vals[5]<100||+vals[5]>599)throw Error(`Invalid status on line ${i+1}`);out.push(vals.map(csv).join(','));}
 return{text:out.join('\n')+'\n',details:{parsed:out.length-1,rejected:invalid},warnings:invalid?[`${invalid} malformed lines skipped: export is incomplete.`]:['Recognizes default common/combined logging layouts, not custom formats or JSON logs.']};
}
