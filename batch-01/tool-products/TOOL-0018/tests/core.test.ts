import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("Helm values.yaml to --set Flags",()=>{it('emits type-preserving set-json flags for nested values',()=>{const r=convert('image:\n  tag: "1.0"\nreplicas: 2');expect(r.text).toContain('--set-json');expect(r.text).toContain('image.tag');});it('rejects duplicate keys and anchors',()=>{expect(()=>convert('a: 1\na: 2')).toThrow();expect(()=>convert('x: &a one\ny: *a')).toThrow();});
});
