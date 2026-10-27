import {it,expect} from 'vitest'; import {planMovRemux} from '../src/core'; it('remuxes with copy',()=>expect(planMovRemux('i','o')).toContain('copy'));
