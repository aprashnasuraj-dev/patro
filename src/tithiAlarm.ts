export function tithiAlarmUtc(date:string,time:string,daysBefore:number):string {
 const safe=/^([01]\d|2[0-3]):[0-5]\d$/.test(time)?time:"07:00";
 const instant=new Date(date+"T"+safe+":00+05:45");instant.setUTCDate(instant.getUTCDate()-daysBefore);
 return instant.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");
}
