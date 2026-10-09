import subprocess,concurrent.futures,json,xml.etree.ElementTree as E,pathlib
base=pathlib.Path(__file__).resolve().parent
paths=['/','/tools','/convert','/tools/astro','/time-machine','/on-this-day','/samudaya','/fm','/tv','/samachar','/atlas/','/atlas/dictionary','/atlas/kathmandu/1927-10-09','/atlas/kathmandu/2037-04-13','/atlas/tokyo/2026-10-09','/atlas/new-york/2026-03-08','/atlas/kathmandu/2026-10-09/calendar.ics','/sitemap-atlas.xml','/sitemap-atlas-0.xml','/sitemap-atlas-1999.xml','/robots.txt','/sitemap.xml','/atlas/fake/2026-10-09','/atlas/kathmandu/2026-02-29']
def get(p):
 r=subprocess.run(['curl','-sS','-L','--max-time','25','-w','\n%{http_code}','https://aafnaipatro.com'+p],capture_output=True,text=True)
 body,code=r.stdout.rsplit('\n',1);return p,int(code),body
rows=list(concurrent.futures.ThreadPoolExecutor(max_workers=6).map(get,paths));bodies={p:b for p,s,b in rows};summary=[{'path':p,'status':s,'bytes':len(b.encode())} for p,s,b in rows];print(json.dumps(summary),flush=True)
for p,s,b in rows:assert s==(404 if '/fake/' in p or '2026-02-29' in p else 200),(p,s)
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
old=E.fromstring((base/'../../public/sitemap.xml').resolve().read_text());new=E.fromstring(bodies['/sitemap.xml']);oldurls={x.text for x in old.findall('.//s:loc',ns)};newurls={x.text for x in new.findall('.//s:loc',ns)};assert oldurls<=newurls;assert len([x for x in newurls if '/sitemap-atlas-' in x])==2000
assert len(E.fromstring(bodies['/sitemap-atlas.xml']).findall('s:sitemap',ns))==2000
for p in ['/sitemap-atlas-0.xml','/sitemap-atlas-1999.xml']:assert len(E.fromstring(bodies[p]).findall('s:url',ns))==1000
assert 'Sitemap: https://aafnaipatro.com/sitemap.xml' in bodies['/robots.txt'];assert 'Sitemap: https://aafnaipatro.com/sitemap-atlas.xml' in bodies['/robots.txt'];assert '2,000,000' in bodies['/atlas/'];assert 'On this calendar date across history' in bodies['/atlas/tokyo/2026-10-09'];assert 'Nepali calendar date' in bodies['/atlas/tokyo/2026-10-09'];assert 'BEGIN:VCALENDAR' in bodies['/atlas/kathmandu/2026-10-09/calendar.ics']
report={'routes':summary,'preservedSitemapEntries':len(oldurls),'atlasSitemaps':2000,'passed':True};(base/'live-verification.json').write_text(json.dumps(report,indent=2)+'\n');print('PASSED',json.dumps({k:v for k,v in report.items() if k!='routes'}),flush=True)
