import {it,expect} from 'vitest'; import {planJoin} from '../src/core'; it('requires two files',()=>expect(()=>planJoin(1,['a'],'o')).toThrow());
