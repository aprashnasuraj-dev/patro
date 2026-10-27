import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample = {
  "minutes": 12,
  "seconds": 30,
  "videoMbps": 8,
  "audioKbps": 192,
  "overhead": 2,
  "targetMB": 1000
};
describe('TOOL-0445 — deferred source acceptance',()=>{
 it('has the independently specified reference metric',()=>{ const result=calculate(sample);const actual=result.outputs.find(x=>x.label==="Estimated decimal file size");expect(actual?.value).toBe("783.36 MB"); });
 it('rejects NaN, infinities and overflow',()=>{ const k="minutes";for(const x of ['NaN',Number.POSITIVE_INFINITY,'1e309'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects missing or invalid mandatory numeric input',()=>{const k="minutes";for(const x of ['',null,{},'abc'])expect(()=>calculate({...sample,[k]:x})).toThrow(); });
 it('rejects zero duration',()=>expect(()=>calculate({...sample,minutes:0,seconds:0})).toThrow());
 it('retains method and limitation explanation',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(0);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);});
});
