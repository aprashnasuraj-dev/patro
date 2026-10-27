export type Result={text:string;warnings?:string[];details?:Record<string,string|number>};
export function convert(input:string,opts:Record<string,string|boolean>={}):Result{
 if(new TextEncoder().encode(input).length>1200000)throw Error('NDJSON exceeds 1.2 MB local limit');
 const lines=input.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/);if(lines.length>15000)throw Error('Exceeds 15,000 lines');const ignore=opts.ignoreBlank!==false;const values:unknown[]=[];
 lines.forEach((line,i)=>{if(line.length>300000)throw Error(`Line ${i+1} exceeds 300,000 characters`);if(line.trim()===''){if(!ignore)throw Error(`Blank line ${i+1} forbidden`);return;}try{values.push(JSON.parse(line));}catch{throw Error(`Malformed JSON on line ${i+1}`)}});
 if(values.length>10000)throw Error('Exceeds 10,000 records');return{text:JSON.stringify(values,null,2)+'\n',details:{records:values.length,lines:lines.length},warnings:['Each line is parsed as a complete JSON value. Empty lines are'+(ignore?' skipped.':' forbidden.') ]};
}
