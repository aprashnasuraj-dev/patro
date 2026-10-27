import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const miles=N(i,'miles',0,2000),use=N(i,'vehicleKwh100',1,150),eff=N(i,'effPct',50,100)/100,price=N(i,'price',0,20),kw=N(i,'chargerKw',.1,50),volt=N(i,'voltage',100,500),breaker=N(i,'breakerAmps',1,500);
const stored=miles*use/100,grid=stored/eff,current=kw*1000/volt,capacity=breaker*.8,charging=stored/kw;
return R([{label:'Grid electricity per day',value:Q(grid)+' kWh'},{label:'Electricity cost per month (30 days)',value:M(grid*price*30)},{label:'Minimum ideal delivery time',value:Q(charging)+' h'},{label:'Calculated EVSE AC current',value:Q(current)+' A'},{label:'Continuous-load envelope (80% input)',value:Q(capacity)+' A'},{label:'Sizing status',value:current<=capacity?'Within entered 80% assumption':'Above entered 80% envelope'}],['Do not size or install wiring from this calculator. An electrician must confirm panel capacity, derating, conductor, protection and local electrical code.','Charging time ignores temperature, charge taper and vehicle onboard charger caps; efficiency input is an estimate.'],[`Vehicle energy ${Q(stored)} kWh/day; grid energy = vehicle energy / ${P(eff)}.`]);

}
