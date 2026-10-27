import { describe, it, expect } from 'vitest';
import { convert } from '../src/core';

describe('.env -> Kubernetes Secret',()=>{
 it('base64 encodes literal UTF-8 values',()=>{const r=convert('TOKEN=secret\n');expect(r.text).toContain('TOKEN: c2VjcmV0');expect(r.text).toContain('kind: Secret');});
 it('decodes quote escapes before encoding',()=>expect(convert('VALUE="hello\\nworld"').text).toContain('VALUE: aGVsbG8Kd29ybGQ='));
 it('rejects duplicate keys and interpolation',()=>{expect(()=>convert('A=1\nA=2')).toThrow();expect(()=>convert('A=${B}')).toThrow();});
 it('validates Kubernetes names',()=>expect(()=>convert('A=1',{name:'Bad_Secret'})).toThrow());
});
