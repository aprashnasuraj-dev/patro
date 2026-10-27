import {describe,it,expect} from 'vitest';
import {employerMatch} from '../src/core';
describe('TOOL-0240 known-answer and boundary plan',()=>{it('matches a simple known answer',()=>{expect(employerMatch({salary:100000,employeePct:5,tiers:[{fromPct:0,toPct:3,matchPct:100},{fromPct:3,toPct:5,matchPct:50}],annualEmployerCap:null,vestingPct:100}).employerMatch).toBe(4000);});it.todo('rejects malformed and out-of-domain inputs');it.todo('covers zero/near-zero and upper bounds');it.todo('verifies output formatting and rounding semantics');});
