import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const trailer=N(i,'loadedTrailer',0,2e5),pct=N(i,'tonguePct',0,40)/100,payload=N(i,'truckPayload',0,1e5),occupants=N(i,'occupants',0,1e5),hitch=N(i,'hitchLimit',0,1e5),tow=N(i,'towRating',0,3e5),gcwr=N(i,'gcwr',0,4e5),truck=N(i,'truckGVWWithoutTongue',0,1.5e5);
const tongue=trailer*pct,payloadLeft=payload-occupants-tongue,combined=truck+trailer;const violations=[payloadLeft<0?'payload':'',tongue>hitch?'hitch tongue rating':'',trailer>tow?'tow limit':'',combined>gcwr?'GCWR':''].filter(Boolean);
return R([{label:'Estimated tongue load',value:Q(tongue)+' lb'},{label:'Payload headroom',value:Q(payloadLeft)+' lb'},{label:'Combined estimated weight',value:Q(combined)+' lb'},{label:'Rating check',value:violations.length?`CHECK: ${violations.join(', ')}`:'Within entered rating ceilings'}],['Confirm tire/axle/GVWR, actual scale tickets, trailer braking and hitch weight distribution. These checks do not certify safe towing.','The combined weight uses truck actual weight excluding tongue plus total trailer weight to avoid double-counting.'],[`Payload remaining = ${Q(payload)} – passengers/cargo ${Q(occupants)} – tongue ${Q(tongue)}.`]);

}
