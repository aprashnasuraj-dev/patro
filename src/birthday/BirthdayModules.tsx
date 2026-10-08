import {useEffect,useState} from 'react';
import {birthPanchang,type BirthModel} from './birth-panchang';
import type {BirthdayProfile} from './storage';
import type {BirthdayYear} from './three-birthdays';
import {NAKSHATRAS,RASHIS,YOGAS,KARANA_NAMES,LUNAR_MONTHS,tithiName} from '../patro-tools/core/names';
import {formatPlaceInstant} from '../place/timing';
export default function BirthdayModules({profile,rows,language}:{profile:BirthdayProfile;rows:BirthdayYear[];language:'ne'|'en'}) {
 const [model,setModel]=useState<BirthModel|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setModel(null);setError('');birthPanchang(profile).then(m=>{if(active)setModel(m);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[profile]);
 if(error)return <p role="status">{error}</p>;if(!model)return <p role="status">जन्म पञ्चाङ्ग / Birth panchang…</p>;
 const p=model.p,t=(date:Date|null)=>formatPlaceInstant(date,model.place.tz);
 const fields=[['Tithi / तिथि',`${p.paksha} ${tithiName(p.tithi)}`],['Start / सुरु',t(model.tithiStart)],['End / अन्त',t(model.tithiEnd)],['Nakshatra / नक्षत्र',NAKSHATRAS[p.nakshatra]],['Pada / चरण',String(p.nakshatraPada)],['Yoga / योग',YOGAS[p.yoga]],['Karana / करण',KARANA_NAMES[p.karana]],['Moon rashi / चन्द्र राशि',RASHIS[p.moonRashi]],['Sun rashi / सूर्य राशि',RASHIS[p.sunRashi]],['Ritu / ऋतु',model.ritu],['Ayana / अयन',model.ayana],['Purnimanta month',LUNAR_MONTHS[model.month]],['Amanta month',LUNAR_MONTHS[model.amantaMonth]],['Adhik / अधिक',String(model.lunar.adhik)],['Sunrise / सूर्योदय',t(model.sunrise)],['Sunset / सूर्यास्त',t(model.sunset)],['Moonrise / चन्द्रोदय',t(model.moonrise)],['Moonset / चन्द्रास्त',t(model.moonset)],['Moon illumination',`${(model.illumination*100).toFixed(1)}%`],['Saka / शक',model.saka],['Name syllable / नामाक्षर',model.syllable]];
 return <><section className="patro-tool-card"><h2>{language==='ne'?'जन्म पञ्चाङ्ग':'Birth panchang'} · {profile.date}</h2><p>{profile.time?'दिइएको समय / Given birth time':'समय नदिँदा सूर्योदयको आधारमा / At local sunrise without a time'} · {model.place.name} ({model.place.tz}){model.ambiguous?' · Repeated DST time: earlier instant selected.':''}</p>
 <details open><summary>मूल काठमाडौं अभिलेख / Original Kathmandu archive</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify({bs:model.row.bs,ns:model.row.ns,panchang:model.row.panchang},null,2)}</pre></details><p>तल छुटेका fields वा दिएको जन्म instant का खगोलीय supplements हुन् / Computed supplements; archived values above remain unchanged. Ritu/ayana use the existing sidereal convention.</p><table><caption>Computed instant: {model.instant.toISOString()}</caption><tbody>{fields.map(([label,value])=><tr key={label}><th>{label}</th><td>{value}</td></tr>)}</tbody></table></section></>;
}
