import {describe,it,expect} from 'vitest';
import {coastFire} from '../src/core';
describe('TOOL-0224 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(coastFire({annualSpending:40000,withdrawalRatePct:4,currentInvestments:0,currentAge:40,retirementAge:40,nominalReturnPct:7,inflationPct:2}).fireNumberToday).toBe(1000000);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
