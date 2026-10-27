import {it,expect} from 'vitest'; import {planTargetSize} from '../src/core'; it('allocates positive video bitrate',()=>expect(planTargetSize(60,25,'i','o').videoKbps).toBeGreaterThan(120));
