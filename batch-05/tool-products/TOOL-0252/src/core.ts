import {finite,roundTo} from '../_vendor/business';
export type Group={role:string;count:number;hourlyCost:number};
export function meetingCost(groups:Group[],meetingRaw:number,prepRaw:number,followRaw:number,freqRaw:number){
 if(!Array.isArray(groups)||groups.length<1||groups.length>200)throw new Error('Use 1–200 attendee groups.');
 const meeting=finite(meetingRaw,'Meeting minutes',1,1440),prep=finite(prepRaw,'Prep minutes',0,1440),follow=finite(followRaw,'Follow-up minutes',0,1440),freq=finite(freqRaw,'Meetings/month',0,10000);
 const perPersonHours=(meeting+prep+follow)/60;
 const rows=groups.map((g,i)=>{const count=Math.floor(finite(g.count,`Group ${i+1} count`,1,100000)),hourly=finite(g.hourlyCost,`Group ${i+1} hourly cost`,0,1e9);return {role:String(g.role||`Group ${i+1}`).slice(0,100),count,hourlyCost:hourly,hoursPerPerson:roundTo(perPersonHours,2),costPerMeeting:roundTo(count*hourly*perPersonHours)}});
 const perMeeting=rows.reduce((s,r)=>s+r.costPerMeeting,0),attendees=rows.reduce((s,r)=>s+r.count,0);
 return {attendees,costPerMeeting:roundTo(perMeeting),costPerMonth:roundTo(perMeeting*freq),costPerYear:roundTo(perMeeting*freq*12),personHoursPerMeeting:roundTo(attendees*perPersonHours,2),rows};
}
