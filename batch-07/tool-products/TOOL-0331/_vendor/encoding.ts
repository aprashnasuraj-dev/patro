export const te=new TextEncoder(),td=new TextDecoder('utf-8',{fatal:false});
export function hex(b:Uint8Array){return [...b].map(x=>x.toString(16).padStart(2,'0')).join('')}
export function unhex(s:string){const x=s.trim().replace(/\s+/g,'');if(!/^[0-9a-f]*$/i.test(x)||x.length%2)throw new Error('Invalid hexadecimal input.');const o=new Uint8Array(x.length/2);for(let i=0;i<o.length;i++)o[i]=parseInt(x.slice(i*2,i*2+2),16);return o}
export function b64(b:Uint8Array){let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode(...b.subarray(i,i+0x8000));return btoa(s)}
export function unb64(s:string){const x=s.replace(/\s+/g,'');let raw:string;try{raw=atob(x)}catch{throw new Error('Invalid base64 input.')}const o=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)o[i]=raw.charCodeAt(i);return o}
export function b64u(b:Uint8Array){return b64(b).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')}
export function unb64u(s:string){const x=s.trim().replace(/-/g,'+').replace(/_/g,'/');if(!/^[A-Za-z0-9+/]*={0,2}$/.test(x))throw new Error('Invalid base64url input.');return unb64(x+'='.repeat((4-x.length%4)%4))}
export function concat(...xs:Uint8Array[]){const n=xs.reduce((a,b)=>a+b.length,0),o=new Uint8Array(n);let p=0;for(const x of xs){o.set(x,p);p+=x.length}return o}
export function u32(n:number){const b=new Uint8Array(4);new DataView(b.buffer).setUint32(0,n,false);return b}
export function readU32(b:Uint8Array,o=0){return new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(o,false)}
export function randomBytes(n:number){if(!Number.isInteger(n)||n<1||n>1_048_576)throw new Error('Invalid random byte request.');const out=new Uint8Array(n);for(let i=0;i<n;i+=65536)crypto.getRandomValues(out.subarray(i,Math.min(out.length,i+65536)));return out}
export function safeName(s:string,f='output'){const x=s.normalize('NFKC').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/\s+/g,' ').trim().slice(0,100);return (x||f).replace(/^\.+/,'')}
export function asBytes(x:ArrayBuffer|Uint8Array){return x instanceof Uint8Array?x:new Uint8Array(x)}
