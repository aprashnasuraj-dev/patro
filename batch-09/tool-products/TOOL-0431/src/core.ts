import {N,S,D,ODate,addDays,Q,M,P,R} from '../_vendor/guard';
import type {Result} from '../_vendor/guard';
/** Standalone deterministic estimator; no network, storage or DOM. */
export function calculate(i:Record<string,unknown>):Result {

const city=S(i,'city',100);if(city.toLowerCase().includes('city +'))throw Error('Enter a real city and independently verified rates.');
const nights=N(i,'nights',1,365);if(!Number.isInteger(nights))throw Error('Night count must be whole');const taxable=N(i,'rate',0,1e8)*nights+N(i,'fee',0,1e8),local=N(i,'localPct',0,100)/100,other=N(i,'otherPct',0,100)/100,already=N(i,'collected',0,1e8);
const due=taxable*(local+other);return R([{label:'Taxable lodging base',value:M(taxable)},{label:'Modeled total guest tax',value:M(due)},{label:'Net potentially due after platform remittance',value:M(Math.max(0,due-already))}],[`Rates are user-supplied for ${city}; the tool has not verified the location, exemption, stay length or taxability of fees.`,`Occupancy, tourism, VAT/sales taxes may have different bases and platform collection rules.`],[`Base × (${P(local)} + ${P(other)}) − known remitted tax.`]);

}
