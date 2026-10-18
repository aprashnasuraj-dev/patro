// v2 topic classifier. Pure function, zero network. Routes decide the pipeline, the evidence floor and the quality gate.
//   ymyl       health/medicine/drugs/nutrition/legal/personal-finance advice (strict; needs allow_ymyl + disclaimer)
//   structured official-dataset topics (primary_api with a data adapter), including public demographics/economics statistics
//   general    plain explanatory questions with no dataset
//   research   everything else (scientific/historical analysis)
// v1 held "Demographics, Economics & Open Data" as YMYL because its category matched /econom/. Statistics pages are not advice.
import {adapterFor} from '../research/data-apis.mjs';
const YMYL_CAT=/health|medic|clinical|drug|fda|pharma|nutrition|legal|money|financ|invest|loan|insurance/i;
const OPEN_DATA=/open data|demograph|telemetry|seismic|geolog|astronom|exoplanet|climate|air particulate/i;
const YMYL_Q=/\b(diagnos\w*|treatment|medication|dosage|symptoms?|suicide|self.harm|weapon|explosive|poison|invest\w*|loan|tax|lawsuit|legal advice|side effects?)\b/i;
const QUESTION=/^(why|what|how|does|do|is|are|can|where|when|who)\b/i;
export function classify(record){
 const m=record.meta||{},cat=m.category||'',q=String(m.question||m.title||record.intent||'').trim();
 const structured=!!(m.primary_api&&adapterFor(m.primary_api));
 const catRisk=YMYL_CAT.test(cat)&&!(OPEN_DATA.test(cat)&&!/health|medic|clinical|drug|fda|pharma/i.test(cat));
 if(catRisk||YMYL_Q.test(q)&&!structured)return {route:'ymyl',structured};
 if(structured)return {route:'structured',structured};
 if(!m.primary_api&&QUESTION.test(q))return {route:'general',structured:false};
 return {route:'research',structured:false};
}
export const ROUTE_ORDER=['general','structured','research','ymyl'];
