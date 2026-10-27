import { describe,it,expect } from 'vitest';
import { convert } from '../src/core';
describe("Semantic JSON Diff (Ignore Key and Array Order)",()=>{it('ignores object and multiset array order while respecting multiplicity',()=>{expect(convert('{"x":[1,2,1]}\n---JSON-DIFF---\n{"x":[1,1,2]}').details?.equal).toBe('yes');expect(convert('[1,1]\n---JSON-DIFF---\n[1,2]').details?.equal).toBe('no');});it('rejects a missing divider',()=>expect(()=>convert('{} {}')).toThrow());
});
