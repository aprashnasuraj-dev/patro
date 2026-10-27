import {it,expect} from 'vitest'; import {planCut} from '../src/core'; it('contains fades',()=>expect(planCut({start:0,end:10,fadeIn:1,fadeOut:1,format:'mp3'},'i','o').join(' ')).toContain('afade'));
