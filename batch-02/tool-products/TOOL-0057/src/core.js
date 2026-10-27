import {requireText} from '../_vendor/guards.js';
export async function compute(x,ctx={}){
 let raw=requireText(x.mac,64).replace(/[-:.\s]/g,'').toUpperCase();if(!/^[0-9A-F]+$/.test(raw)||![12,16].includes(raw.length))throw Error('Expected 48-bit (12 hex digits) or 64-bit (16 digits) EUI.');const bytes=raw.match(/../g),n=parseInt(bytes[0],16);
 const o={colons:bytes.join(':'),hyphens:bytes.join('-'),plain:raw,cisco:raw.match(/.{1,4}/g).join('.'),type:bytes.length===6?'EUI-48':'EUI-64',multicast:!!(n&1),locallyAdministered:!!(n&2),vendor:'No local registry loaded'};
 const warnings=[];
 if(o.locallyAdministered)warnings.push('Locally administered bit set: assigned manufacturer cannot be reliably inferred.');
 if(x.registry){const file=x.registry;if(file.size>8*1024*1024)throw Error('Registry CSV exceeds 8 MiB local limit.');if(!/\.csv$/i.test(file.name))throw Error('Choose an IEEE vendor CSV file.');const csv=await file.text(),lines=csv.split(/\r?\n/);if(lines.length>120000)throw Error('Vendor CSV exceeds 120,000 rows.');const matches=[];
 for(let i=0;i<lines.length;i++){if(ctx.signal?.aborted)throw Error('Cancelled.');const line=lines[i];if(i===0||!line.trim())continue; // IEEE RA public files: Registry,Assignment,Organization Name,Organization Address
  const items=line.match(/(?:"(?:[^"]|"")*"|[^,])+/g)||[];if(items.length<3)continue;const prefix=items[1].replace(/"/g,'').trim().replace(/[^0-9a-fA-F]/g,'').toUpperCase();if(![6,7,9].includes(prefix.length)||!raw.startsWith(prefix))continue;const vendor=items[2].replace(/^"|"$/g,'').replace(/""/g,'"').trim();if(vendor)matches.push({bits:prefix.length*4,prefix,vendor});
 }matches.sort((a,b)=>b.bits-a.bits);if(matches.length&&!o.locallyAdministered)o.vendor=matches[0].vendor+' ('+matches[0].prefix+'/'+matches[0].bits+')';else if(!o.locallyAdministered)o.vendor='No match in imported registry';
 o.registryFile=file.name;o.registryMatchingAssignments=matches.length;
 }else warnings.push('To identify a vendor, import an IEEE MA-L/MA-M/MA-S CSV locally; none is bundled.');
 return {summary:o.colons,text:JSON.stringify(o,null,2),warnings};
}
