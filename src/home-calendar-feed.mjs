/** RFC 5545 text escaping and UTF-8-aware folding; shared by build and tests. */
export function escapeIcs(value){return String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
export function foldIcs(line){
  let result='',part='',bytes=0;
  for(const char of line){const size=new TextEncoder().encode(char).length;if(bytes+size>75){result+=part+'\r\n';part=' ';bytes=1;}part+=char;bytes+=size;}
  return result+part;
}
export function festivalFeed(events,buildDate){
  const stamp=buildDate.slice(0,10).replaceAll('-','')+'T000000Z';
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Aafnai Patro//Festivals and Holidays//NE','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:आफ्नै पात्रो चाडपर्व र बिदा','REFRESH-INTERVAL;VALUE=DURATION:P1D'];
  const seen=new Set();
  for(const event of [...events].sort((a,b)=>`${a.date}|${a.id}`.localeCompare(`${b.date}|${b.id}`))){
    if(seen.has(event.id)||!/^\d{4}-\d{2}-\d{2}$/.test(event.date))continue;
    seen.add(event.id);
    const end=new Date(Date.parse(event.date+'T00:00:00Z')+86400000).toISOString().slice(0,10).replaceAll('-','');
    lines.push('BEGIN:VEVENT',`UID:${escapeIcs(event.id)}@aafnaipatro.com`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${event.date.replaceAll('-','')}`,`DTEND;VALUE=DATE:${end}`,`SUMMARY:${escapeIcs(event.name)}`,`URL:https://aafnaipatro.com/date/${event.date}`,'END:VEVENT');
  }
  lines.push('END:VCALENDAR');return lines.map(foldIcs).join('\r\n')+'\r\n';
}
