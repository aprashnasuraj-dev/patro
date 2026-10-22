/**
 * Source-audited *candidate classification*, not an observance or personalized verdict.
 * Nakshatra numbers are one-based (Ashwini = 1, Revati = 27).
 * Source references and limitations: docs/panchang-jyotish-integration/08_RULE_SOURCE_AUDIT.md
 */
export const SOURCE_REVIEWED_NAKSHATRA_RULES = Object.freeze({
  panchak: [23,24,25,26,27],
  gandaMoola: [1,9,10,18,19,27],
  pushya: 8
} as const);
export type CandidateNakshatraRule = "panchak" | "gandaMoola" | "raviPushya" | "guruPushya";
export function classifyNakshatraCandidate(rule: CandidateNakshatraRule, nakshatraOneBased: number, weekday: number): boolean {
  if (!Number.isInteger(nakshatraOneBased) || nakshatraOneBased < 1 || nakshatraOneBased > 27 || !Number.isInteger(weekday) || weekday < 0 || weekday > 6) return false;
  if (rule === "panchak") return SOURCE_REVIEWED_NAKSHATRA_RULES.panchak.includes(nakshatraOneBased as 23);
  if (rule === "gandaMoola") return SOURCE_REVIEWED_NAKSHATRA_RULES.gandaMoola.includes(nakshatraOneBased as 1);
  if (rule === "raviPushya") return weekday === 0 && nakshatraOneBased === SOURCE_REVIEWED_NAKSHATRA_RULES.pushya;
  return weekday === 4 && nakshatraOneBased === SOURCE_REVIEWED_NAKSHATRA_RULES.pushya;
}
/** Convert a UTC instant to the Kathmandu civil weekday (Sunday=0). This is not a sunrise-to-sunrise Vara. */
export function kathmanduCivilWeekday(instant: Date): number {
  const localDate = new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kathmandu",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(instant);
  const val = (type: string) => localDate.find(p=>p.type===type)?.value ?? "";
  const year=Number(val("year")),month=Number(val("month")),day=Number(val("day"));
  return new Date(Date.UTC(year,month-1,day)).getUTCDay();
}


export type NakshatraRuleWindow = {
  start: Date;
  end: Date;
  entryNakshatra: number;
  lastNakshatra: number;
  rule: "panchak" | "gandaMoola";
  confidence: "candidate-unverified";
  timezone: "Asia/Kathmandu";
};
const DAY_MS = 86_400_000;
const SIX_HOURS_MS = 6 * 60 * 60_000;
function validIsoDate(value:string):boolean {
  if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(value))return false;
  const [year,month,day]=value.split("-").map(Number);
  const candidate=new Date(Date.UTC(year,month-1,day,12));
  return candidate.getUTCFullYear()===year&&candidate.getUTCMonth()===month-1&&candidate.getUTCDate()===day;
}
function nakshatraRuleMember(rule:"panchak"|"gandaMoola",at:Date):boolean {
  const oneBased=panchangAt(at).nakshatra+1;
  return rule==="panchak"
    ? SOURCE_REVIEWED_NAKSHATRA_RULES.panchak.includes(oneBased as 23)
    : SOURCE_REVIEWED_NAKSHATRA_RULES.gandaMoola.includes(oneBased as 1);
}
function firstMembershipChange(rule:"panchak"|"gandaMoola",leftMs:number,rightMs:number,leftMember:boolean):number {
  let lo=leftMs,hi=rightMs;
  for(let iteration=0;iteration<32&&hi-lo>1_000;iteration++){
    const mid=Math.floor((lo+hi)/2);
    if(nakshatraRuleMember(rule,new Date(mid))===leftMember)lo=mid;
    else hi=mid;
  }
  return hi;
}
/**
 * Find continuous Nakshatra membership intervals inside a Nepal-local date range.
 * The output is always a candidate with unverified confidence, never an observance verdict.
 * A 6-hour bracket is narrower than even the shortest practical Nakshatra transit and
 * prevents a same-day fast Moon crossing from being silently skipped.
 */
export async function findNakshatraRuleWindows(
  startDate:string,
  days=30,
  rule:"panchak"|"gandaMoola"="panchak",
  cancelled:()=>boolean=()=>false
):Promise<NakshatraRuleWindow[]|null>{
  if(!validIsoDate(startDate)||!Number.isInteger(days)||days<1||days>90)throw new Error("invalid_nakshatra_rule_window_range");
  const rangeStart=new Date(startDate+"T00:00:00+05:45").getTime();
  const rangeEnd=rangeStart+days*DAY_MS;
  // Look sufficiently far backward to complete any interval overlapping the requested range.
  const scanStart=rangeStart-45*DAY_MS;
  let previousMs=scanStart;
  let previousMember=nakshatraRuleMember(rule,new Date(previousMs));
  let intervalStart:number|null=null;
  let entryNakshatra=0;
  const found:NakshatraRuleWindow[]=[];
  const steps=Math.ceil((rangeEnd-scanStart)/SIX_HOURS_MS);
  for(let step=1;step<=steps;step++){
    if(cancelled())return null;
    const currentMs=Math.min(scanStart+step*SIX_HOURS_MS,rangeEnd);
    const currentMember=nakshatraRuleMember(rule,new Date(currentMs));
    if(currentMember!==previousMember){
      const boundary=firstMembershipChange(rule,previousMs,currentMs,previousMember);
      if(!previousMember&&currentMember){
        intervalStart=boundary;
        entryNakshatra=panchangAt(new Date(boundary+1_000)).nakshatra+1;
      }else if(previousMember&&!currentMember&&intervalStart!==null){
        const lastNakshatra=panchangAt(new Date(Math.max(intervalStart,boundary-1_000))).nakshatra+1;
        if(boundary>=rangeStart&&intervalStart<rangeEnd){
          found.push({
            start:new Date(intervalStart),end:new Date(boundary),entryNakshatra,lastNakshatra,rule,
            confidence:"candidate-unverified",timezone:"Asia/Kathmandu"
          });
        }
        intervalStart=null;
      }
    }
    previousMs=currentMs;
    previousMember=currentMember;
    if(step%12===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  return found.sort((a,b)=>a.start.getTime()-b.start.getTime());
}
