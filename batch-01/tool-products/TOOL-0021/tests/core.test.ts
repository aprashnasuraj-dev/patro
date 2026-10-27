import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("Kubernetes CPU and Memory Units Converter",()=>{it('converts millicores and IEC byte quantities',()=>{const v=JSON.parse(convert('cpu=250m\nmemory=1Gi').text);expect(v[0].detail).toContain('250 millicores');expect(v[1].detail).toContain('1073741824 bytes');});it('rejects binary CPU and unknown suffixes',()=>{expect(()=>convert('cpu=1Gi')).toThrow();expect(()=>convert('memory=3Zi')).toThrow();});
});
