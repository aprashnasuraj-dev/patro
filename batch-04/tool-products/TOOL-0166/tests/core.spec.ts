import {it,expect} from 'vitest'; import {planRemoveAudio} from '../src/core'; it('uses -an and copy',()=>expect(planRemoveAudio('i','o')).toEqual(expect.arrayContaining(['-an','copy'])));
