import {S,D,ODate,addDays,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Domain-guarded deterministic core; does not call network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {
const end=D(i,'coverageEnd'),notice=D(i,'notice'),e=ODate(i,'elect'),app=S(i,'noticeRule',10);if(app!=='yes')throw Error('This model only supports confirmed federal COBRA applicability');const start=end>notice?end:notice,deadline=addDays(start,60),outs=[{label:'Election window begins',value:start},{label:'60-day election deadline',value:deadline}];
if(e){if(e<start)throw Error('Election precedes later of loss of coverage and notice: verify dates');outs.push({label:'45-day initial premium deadline',value:addDays(e,45)},{label:'Election timing',value:e<=deadline?'Within modeled election window':'Outside modeled election window'});}else outs.push({label:'First payment deadline',value:'Enter election date'});
return R(outs,['Calendar-date model; the applicable clock may be affected by plan rules, disability, extensions, tolling, notice problems, legal relief or special coverage provisions.','Do not use this calculator to infer an employer notice-mailing deadline or monthly premium grace date.'],[`Election deadline = later of ${end} and ${notice} + 60 calendar days. Initial payment deadline = actual election + 45 days.`]);
}
