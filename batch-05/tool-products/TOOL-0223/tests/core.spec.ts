import {describe,it,expect} from 'vitest';
import {rsuEstimate} from '../src/core';
describe('TOOL-0223 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(rsuEstimate({shares:100,price:10,withholdingPct:20,otherWithholdingPct:0,wholeShareCover:false}).netShares).toBe(80);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
