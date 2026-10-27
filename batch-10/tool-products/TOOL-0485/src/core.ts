import {N,Q,S,R} from '../_vendor/guard';
const min:Record<string,number>={'Whole pork roast':145,'Whole beef brisket':145,'Ground meat':160,'Poultry':165};
export function calculate(x:Record<string,unknown>){
 const protein=S(x,'protein',40);if(!(protein in min))throw Error('Unsupported meat category.');
 const serve=S(x,'serve',32);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(serve))throw Error('Use valid local date and time.');
 const serveDate=new Date(serve);if(!Number.isFinite(+serveDate)||serveDate.getFullYear()<2020||serveDate.getFullYear()>2100||Number.isNaN(+serveDate)||serveDate.getMinutes()!==Number(serve.slice(14,16))||serveDate.getHours()!==Number(serve.slice(11,13)))throw Error('Invalid or daylight-saving-gap serving time.');
 const cookHours=N(x,'cookHours',0.25,72),prep=N(x,'prep',0,480),rest=N(x,'rest',3,1440),buffer=N(x,'buffer',0,720),target=N(x,'target',32,250);
 if(target<min[protein])throw Error(`Target is below the USDA minimum ${min[protein]}°F for this protein.`);
 const at=(before:number)=>new Date(serveDate.getTime()-before*60000).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
 const cook=cookHours*60,restAt=rest,finish=rest+buffer,startCook=finish+cook,startPrep=startCook+prep;
 return R([{label:'Start prep / warm-up',value:at(startPrep)},{label:'Start cooking',value:at(startCook)},{label:'Target finish (including buffer)',value:at(finish)},{label:'Start rest/hold',value:at(restAt)},{label:'Serve at',value:at(0)},{label:'USDA minimum internal temperature',value:`${min[protein]}°F`}],['Actual smoking times vary dramatically; the plan is only an estimate. Verify doneness using a food thermometer.','For whole pork/beef roasts, USDA specifies at least 3 minutes rest at 145°F; for all meats follow safe holding and cooling guidance.','The entered serving time uses your device time zone; travel and daylight-saving changes can change displayed times.'],['Back-subtract rest, contingency, cook and prep durations from requested serving time.','The target temperature is an operator choice and must meet the applicable USDA safety minimum.']);
}
