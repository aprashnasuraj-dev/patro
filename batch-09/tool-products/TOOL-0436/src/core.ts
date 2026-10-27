import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const regime=S(i,'regime',12),today=N(i,'driveToday',0,24),since=N(i,'sinceBreak',0,24),elapsed=N(i,'shiftElapsed',0,48),prior=N(i,'dutyCycleBefore',0,100),shift=N(i,'dutyThisShift',0,24),week=N(i,'weekDrive',0,100),two=N(i,'fortnightDrive',0,150);
let remain:number,other:string[]=[];
if(regime==='US'){remain=Math.max(0,Math.min(11-today,14-elapsed,70-prior-shift,8-since));other=[`Daily driving: ${Q(Math.max(0,11-today))} h`, `Consecutive 14-hour window: ${Q(Math.max(0,14-elapsed))} h`,`8-day 70-hour baseline remaining on-duty: ${Q(Math.max(0,70-prior-shift))} h`,`Until 30-minute qualifying interruption: ${Q(Math.max(0,8-since))} h`];}
else if(regime==='EU'||regime==='UK_EU'){remain=Math.max(0,Math.min(9-today,4.5-since,56-week,90-two));other=[`Usual 9-hour daily limit: ${Q(Math.max(0,9-today))} h`,`Before 45-minute qualifying break: ${Q(Math.max(0,4.5-since))} h`,`Week 56-hour limit: ${Q(Math.max(0,56-week))} h`,`Two-week 90-hour limit: ${Q(Math.max(0,90-two))} h`];}
else throw Error('Unknown driving regime');
return R([{label:'Conservative next uninterrupted driving window',value:Q(remain)+' h'},...other.map((x,j)=>({label:`Constraint ${j+1}`,value:x}))],['NOT dispatch clearance: historical logs, exceptions, sleeper splits, weekly rest, driving status and other jobs are not reconstructed.','UK domestic rules are not modeled; UK_EU assumes the relevant retained EU-style rules apply. UK/EU exceptions and US 60/7 versus 70/8 cycles differ. EU 10-hour extension eligibility is not assumed.'],[`Minimum of the entered rule-set ceilings, with negative headroom capped at zero.`]);

}
