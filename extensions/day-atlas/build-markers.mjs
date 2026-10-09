import {writeFileSync} from 'node:fs';
import * as A from 'astronomy-engine';
import cities from './cities.json' with {type:'json'};
import {midnight,DAY} from './astronomy.mjs';
// Compute sparse annual downloads offline, avoiding 365 astronomy calls/request.
const output={};
for(const c of cities){
  for(let y=2025;y<=2029;y++){
    const values=[];
    for(let time=Date.UTC(y,0,1),i=0;time<Date.UTC(y+1,0,1);time+=DAY,i++){
      const d=new Date(time).toISOString().slice(0,10),start=midnight(d,c.tz),end=midnight(new Date(time+DAY).toISOString().slice(0,10),c.tz);
      const rise=A.SearchRiseSet(A.Body.Sun,new A.Observer(c.lat,c.lon,0),1,start,(end-start)/DAY);
      if(!rise||rise.date>=end)continue;
      const index=Math.floor(A.MoonPhase(rise.date)/12)+1;
      if([11,26,15,30].includes(index))values.push([i,index]);
    }
    output[c.slug+'-'+y]=values;
  }
}
writeFileSync(new URL('./annual-markers.json',import.meta.url),JSON.stringify(output)+'\n');
console.log('Generated annual sunrise markers for '+Object.keys(output).length+' city/years.');
