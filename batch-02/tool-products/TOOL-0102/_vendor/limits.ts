export const MAX_TEXT_BYTES = 2_000_000;
export function textBytes(value:string){return new TextEncoder().encode(value).byteLength}
export function assertTextLimit(value:string,max=MAX_TEXT_BYTES){const n=textBytes(value);if(n>max)throw new Error(`Input is ${n.toLocaleString()} bytes; limit is ${max.toLocaleString()} bytes.`)}
export function safeFilename(name:string,fallback='output.txt'){const cleaned=name.replace(/[\\/:*?"<>\x00-\x1F|]+/g,'-').replace(/^\.+/,'').trim().slice(0,120);return cleaned||fallback}
