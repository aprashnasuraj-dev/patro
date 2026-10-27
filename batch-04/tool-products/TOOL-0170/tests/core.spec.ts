import {it,expect} from 'vitest'; import {planWebmToMp4} from '../src/core'; it('targets yuv420p',()=>expect(planWebmToMp4({quality:22,audioKbps:160},'i','o')).toContain('yuv420p'));
