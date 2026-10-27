import {it,expect} from 'vitest'; import {planSpeedPitch} from '../src/core'; it('builds resample pipeline',()=>expect(planSpeedPitch(1,-2,'i','o').join(' ')).toContain('asetrate'));
