const DAY=86400000,OFFSET=345*60000;
/** Civil day and exact remaining cache lifetime in Asia/Kathmandu. */
export function nepalDayBoundary(now=Date.now()) {
 const date=new Date(now+OFFSET).toISOString().slice(0,10);
 const next=Date.parse(date+"T00:00:00Z")+DAY-OFFSET;
 return {date,seconds:Math.max(1,Math.ceil((next-now)/1000))};
}
