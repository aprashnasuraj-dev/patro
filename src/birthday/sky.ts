import * as A from 'astronomy-engine';
import type {BirthModel} from './birth-panchang';
export function birthSky(model:BirthModel){const obs=new A.Observer(model.place.lat,model.place.lon,model.place.height||0);return [A.Body.Moon,A.Body.Mercury,A.Body.Venus,A.Body.Mars,A.Body.Jupiter,A.Body.Saturn].map(body=>{const eq=A.Equator(body,model.instant,obs,true,true),h=A.Horizon(model.instant,obs,eq.ra,eq.dec,'normal');return {body,altitude:h.altitude,azimuth:h.azimuth,aboveHorizon:h.altitude>0};});}
