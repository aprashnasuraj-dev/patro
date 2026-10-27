import {bsToAd,bsDateMetadata,BS_MIN_YEAR,BS_VALIDATED_THROUGH_YEAR,type BsDate} from '../../../../packages/core/src/bsDate';
export type BsDataset={startBs:{y:number,m:number,d:number};startAd:string;monthLengths:Record<string,number[]>;trustTier:(year:number)=>string};
function fromInjected(y:number,m:number,d:number,data:BsDataset){
 if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)||m<1||m>12)throw new Error('Invalid BS date fields.');
 const ml=data.monthLengths[String(y)];if(!ml||ml.length!==12)throw new Error('BS year is outside the injected dataset.');
 if(d<1||d>ml[m-1])throw new Error('BS day exceeds this month length in the injected dataset.');
 let days=0;for(let yy=data.startBs.y;yy<y;yy++){const a=data.monthLengths[String(yy)];if(!a)throw new Error('Dataset is not contiguous.');days+=a.reduce((p,n)=>p+n,0)}
 for(let mm=1;mm<m;mm++)days+=ml[mm-1];days+=d-data.startBs.d;const date=new Date(data.startAd+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+days);
 return{ad:date.toISOString().slice(0,10),trust:data.trustTier(y),source:'injected-test-dataset',note:'Converted with the explicitly injected dataset.'};
}
export function convertBs(y:number,m:number,d:number,data?:BsDataset){
 if(data)return fromInjected(y,m,d,data);
 const bs:BsDate={year:y,month:m,day:d};const ad=bsToAd(bs),meta=bsDateMetadata(bs);
 return{ad,trust:meta.confidence,source:meta.source,note:meta.note};
}
export const supportedRange={minYear:BS_MIN_YEAR,validatedThrough:BS_VALIDATED_THROUGH_YEAR};
