import {describe,it,expect} from 'vitest';
import {calculate} from '../src/core';
const sample={"number": "1Z999AA10123456784"} as Record<string,unknown>;
describe('TOOL-0481: deferred core checks',()=>{
 it('produces an explainable known-answer reference',()=>{const r=calculate(sample);expect(r.outputs.length).toBeGreaterThan(1);expect(r.steps.length).toBeGreaterThan(0);expect(r.warnings.length).toBeGreaterThan(0);expect(r.outputs.find(o=>o.label==='Plausible patterns')?.value).toBe('1');});
   it('rejects injection-shaped tracking text',()=>{expect(()=>calculate({...sample,number:'<script>bad</script>'})).toThrow();});

 it('keeps ambiguous numeric patterns as multiple candidates',()=>{const r=calculate({number:'123456789012'});expect(r.outputs[0].value).toMatch(/Multiple/);});
});
