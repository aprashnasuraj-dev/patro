import {finite,roundTo} from './business';

export {finite};
export type LengthUnit='m'|'cm'|'mm'|'ft'|'in';
export const M_PER:Record<LengthUnit,number>={m:1,cm:.01,mm:.001,ft:.3048,in:.0254};
export function toM(v:number,u:LengthUnit,label='Length'){return finite(v,label,0,1e7)*M_PER[u]}
export function toM2(v:number,u:'m2'|'ft2',label='Area'){const n=finite(v,label,0,1e14);return u==='m2'?n:n*.09290304}
export const m2ToFt2=(v:number)=>v/0.09290304;
export const m3ToFt3=(v:number)=>v/0.028316846592;
export const m3ToYd3=(v:number)=>v/0.764554857984;
export const m3ToLiters=(v:number)=>v*1000;
export const litersToUsGal=(v:number)=>v/3.785411784;
export const litersToImpGal=(v:number)=>v/4.54609;
export function pct(v:number,label='Percent',max=100){return finite(v,label,0,max)/100}
export function int(v:number,label:string,min=0,max=1_000_000){const n=finite(v,label,min,max);if(!Number.isInteger(n))throw new Error(`${label} must be a whole number.`);return n}
export const r=(n:number,d=2)=>roundTo(n,d);
