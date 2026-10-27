import {it,expect} from 'vitest'; import {planExtract} from '../src/core'; it('maps first audio',()=>expect(planExtract('mp3','i','o')).toContain('0:a:0'));
