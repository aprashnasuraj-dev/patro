import {toSfnt} from './woff2Runtime';
const MAX_FONT_BYTES=30_000_000;
export async function parseOpenType(buf:ArrayBuffer,name=''){if(buf.byteLength>MAX_FONT_BYTES)throw new Error('Font exceeds 30 MB browser-processing limit.');const sfnt=await toSfnt(buf,name);const mod:any=await import('opentype.js');const parse=mod.parse||mod.default?.parse;if(!parse)throw new Error('opentype.js parser is unavailable.');return parse(sfnt,{lowMemory:false})}
