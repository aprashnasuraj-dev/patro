import {it,expect} from 'vitest'; import {planLosslessTrim} from '../src/core'; it('uses stream copy',()=>expect(planLosslessTrim(1,3,'i.mp4','o.mp4')).toContain('copy'));
