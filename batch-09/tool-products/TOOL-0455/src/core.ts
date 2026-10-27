import {N,D,addDays,Q,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const start=D(i,'start'),n=N(i,'trays',1,60),days=N(i,'days',1,60),pause=N(i,'pause',0,90),wear=N(i,'wearHours',1,24);if(![n,days,pause].every(Number.isInteger))throw Error('Trays, change interval and pause must be whole days');
if(n*days+pause>1000)throw Error('Schedule beyond supported 1000-day horizon');const outs=[{label:'Last scheduled tray begins',value:addDays(start,(n-1)*days+pause)},{label:'Estimated end of final tray',value:addDays(start,n*days+pause)},{label:'Total calendar-day interval',value:`${Q(n*days+pause,0)} days`},{label:'Planned wear-time each day',value:`${Q(wear)} h`}];for(let tray=1;tray<=Math.min(n,24);tray++)outs.push({label:`Tray ${tray} start`,value:addDays(start,(tray-1)*days+(tray===n?pause:0))});
return R(outs,['Only a calendar plan. Pause days are placed just before the final tray for illustration; a real pause changes individual change dates and requires clinician confirmation.','Never accelerate tray changes or reduce wear time based on a calendar estimator; attachments, refinements and tooth tracking alter plans.'],[`Tray #k starts on start date + (k−1) × prescribed days. The total modeled duration adds pause days.`]);
}
