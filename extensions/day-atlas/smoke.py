import subprocess, concurrent.futures, json, xml.etree.ElementTree as E, pathlib, hashlib, sys, re
base=pathlib.Path(__file__).resolve().parent
core=['/','/tools','/convert','/tools/astro','/time-machine','/on-this-day','/samudaya','/fm','/tv','/samachar','/janmapatro','/festivals','/robots.txt','/sitemap.xml']
paths=core+['/date/1940-01-01','/date/1995-03-12','/date/2026-10-10','/date/2029-10-10','/atlas/','/atlas/dictionary','/atlas/publishers','/atlas/widget/tokyo','/atlas/kathmandu/1927-10-09','/atlas/kathmandu/2037-04-13','/atlas/kathmandu/2026-10-10','/atlas/tokyo/2026-10-10','/atlas/tokyo/1931-10-09','/atlas/tokyo/2025-10-10','/atlas/tokyo/2029-10-10','/atlas/tokyo/2029-10-11','/atlas/new-york/2026-03-08','/atlas/tokyo/2026-10-10/calendar.ics','/atlas/tokyo/2026-10-10/data.csv','/atlas/sydney/tithi-calendar/2026.ics','/sitemap-atlas.xml','/sitemap-atlas-0.xml','/sitemap-atlas-104.xml','/sitemap-atlas-1999.xml','/atlas/fake/2026-10-10','/atlas/kathmandu/2026-02-29']
def get(p):
 r=subprocess.run(['curl','-sS','-L','--max-time','25','-w','\n%{http_code}','https://aafnaipatro.com'+p],capture_output=True,text=True)
 body,_,code=r.stdout.rpartition('\n')
 if not code.isdigit():raise RuntimeError((p,r.stderr))
 return p,int(code),body
capture='--capture-baseline' in sys.argv
rows=list(concurrent.futures.ThreadPoolExecutor(max_workers=6).map(get,core if capture else paths))
bodies={p:b for p,s,b in rows}
hashes={p:hashlib.sha256(b.encode()).hexdigest() for p,s,b in rows if p in core}
if capture:
 for p,s,b in rows:assert s==200,(p,s)
 (base/'core-baseline.json').write_text(json.dumps(hashes,indent=2)+'\n')
 print('Captured original core content for',len(hashes),'routes',flush=True)
 sys.exit(0)
summary=[{'path':p,'status':s,'bytes':len(b.encode())} for p,s,b in rows]
for p,s,b in rows:
 expected=410 if p=='/sitemap-atlas-1999.xml' else 404 if '/fake/' in p or '2026-02-29' in p else 200
 assert s==expected,(p,s)
baseline=json.loads((base/'core-baseline.json').read_text())
for p in core:assert hashes[p]==baseline[p],('Core content changed',p)
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
main=[x.text for x in E.fromstring(bodies['/sitemap.xml']).findall('.//s:loc',ns)]
assert not any('/sitemap-atlas' in x for x in main)
assert '/sitemap-atlas' not in bodies['/robots.txt']
assert len(E.fromstring(bodies['/sitemap-atlas.xml']).findall('s:sitemap',ns))==105
assert len(E.fromstring(bodies['/sitemap-atlas-0.xml']).findall('s:url',ns))==1000
assert len(E.fromstring(bodies['/sitemap-atlas-104.xml']).findall('s:url',ns))==429
for d in ['1931-10-09','2029-10-11']:assert 'content="noindex,follow"' in bodies['/atlas/tokyo/'+d]
for d in ['2025-10-10','2029-10-10']:assert 'content="index,follow' in bodies['/atlas/tokyo/'+d]
assert 'href="https://aafnaipatro.com/date/2026-10-10"' in bodies['/atlas/kathmandu/2026-10-10']
for p in ['/date/1940-01-01','/date/1995-03-12','/date/2026-10-10','/date/2029-10-10']:assert 'id="local-panchang"' in bodies[p]
assert 'id="birth-date-reference"' in bodies['/date/1995-03-12']
for s in ['Tithi at local sunrise','Tithi ends','Paksha','Rahu Kaal','Time difference']:assert s in bodies['/atlas/tokyo/2026-10-10']
assert 'On this calendar date across history' not in bodies['/atlas/tokyo/2026-10-10']
assert 'tithi_end_utc' in bodies['/atlas/tokyo/2026-10-10/data.csv']
assert 'licenses/by/4.0' in bodies['/atlas/tokyo/2026-10-10/data.csv']
assert 'BEGIN:VCALENDAR' in bodies['/atlas/sydney/tithi-calendar/2026.ics']
report={'verifiedAt':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'routes':summary,'mainSitemapEntries':len(main),'atlasSitemaps':105,'atlasSitemapUrls':104429,'coreRoutesByteIdentical':len(core),'passed':True}
(base/'live-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2),flush=True)
