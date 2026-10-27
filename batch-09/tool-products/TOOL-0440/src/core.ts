import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const where=S(i,'jurisdiction',100),window=S(i,'window',32),glass=N(i,'original',0,100),film=N(i,'film',0,100),min=N(i,'minimum',0,100),tol=N(i,'tolerance',0,20);if(!['front-side','rear-side','rear-windshield','windshield'].includes(window))throw Error('Unsupported window position');
const net=glass*film/100,passed=net+tol>=min;
return R([{label:'Calculated net visible light transmission',value:Q(net)+'%'},{label:'Against entered minimum and tolerance',value:passed?'At/above input threshold':'Below input threshold'},{label:'Light blocked (approx)',value:Q(100-net)+'%'}],[`The ${where} legal threshold is user supplied, NOT verified here for ${window}.`,`Windshield tint bands, reflectivity, AS-1 markings, factory exemptions, medical exemptions and enforcement tolerances are omitted.`],[`Net VLT = ${Q(glass)}% × ${Q(film)}% / 100 = ${Q(net)}%.`]);

}
