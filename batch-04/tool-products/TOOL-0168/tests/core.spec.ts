import {it,expect} from 'vitest'; import {atempoChain} from '../src/core'; it('chains >2x tempo',()=>expect(atempoChain(4)).toContain('atempo=2'));
