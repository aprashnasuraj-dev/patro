import {describe,it,expect} from 'vitest';
import {compareEmi} from '../src/core';
describe('TOOL-0227 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(compareEmi({principal:1200,annualRatePct:0,termYears:1}).reducing.monthly).toBe(100);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
