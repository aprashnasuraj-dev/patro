let apiPromise:Promise<any>|null=null;
const MAX_FONT_BYTES=30_000_000;
function limit(buf:ArrayBuffer){if(buf.byteLength<12)throw new Error('Font file is too small.');if(buf.byteLength>MAX_FONT_BYTES)throw new Error('Font file exceeds 30 MB browser-processing limit.');}
export function detectFontType(buf:ArrayBuffer,name=''){limit(buf);const v=new DataView(buf);const sig=String.fromCharCode(v.getUint8(0),v.getUint8(1),v.getUint8(2),v.getUint8(3));if(sig==='wOF2')return'woff2';if(sig==='OTTO')return'otf';if(v.getUint32(0,false)===0x00010000||sig==='true'||sig==='typ1')return'ttf';throw new Error(`Unsupported font container${name?` for ${name}`:''}.`)}
async function api(){if(!apiPromise)apiPromise=(async()=>{const mod:any=await import('fonteditor-core');await mod.woff2.init('/assets/vendor/fonteditor-core/woff2.wasm');return mod.woff2;})();return apiPromise}
export async function encodeWoff2(sfnt:ArrayBuffer){limit(sfnt);const w=await api();const out=w.woff2Enc(new Uint8Array(sfnt));if(!out||out.byteLength<16)throw new Error('WOFF2 encoder returned no usable output.');return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength)}
export async function decodeWoff2(buf:ArrayBuffer){limit(buf);const w=await api();const out=w.woff2Dec(new Uint8Array(buf));if(!out||out.byteLength<12)throw new Error('WOFF2 decoder returned no usable output.');return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength)}
export async function toSfnt(buf:ArrayBuffer,name=''){const t=detectFontType(buf,name);return t==='woff2'?decodeWoff2(buf):buf}
