import {it,expect} from 'vitest'; import {filterFor} from '../src/core'; it('maps clockwise rotation',()=>expect(filterFor({rotation:90,flipH:false,flipV:false})).toContain('transpose=clock'));
