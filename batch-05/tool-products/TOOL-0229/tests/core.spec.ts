import {describe,it,expect} from 'vitest';
import {trueApr} from '../src/core';
describe('TOOL-0229 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(trueApr({principal:10000,noteRatePct:0,termMonths:10,upfrontFees:0,financedFees:0}).cashFlowAprPct).toBeCloseTo(0,6);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
