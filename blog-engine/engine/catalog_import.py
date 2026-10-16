"""Read all three pinned catalog repositories into an offline, deduplicated candidate inventory.
Never run or trust arbitrary catalog-provided code, URLs, keys or advertised quotas.
"""
import argparse,json,re
from pathlib import Path
from urllib.parse import urlsplit,urlunsplit
ROOT=Path(__file__).resolve().parents[2]/"missionmangal"/"vendor"
SOURCES={
 "mnfst":("awesome-free-llm-apis","cf97c32fec1b2e96e9936746e2731a81bd5ea33f"),
 "freellm":("awesome-freellm-apis","9f78c9c4de978a0ca5fe4e0f93fd3cd0040036f8"),
 "hidden":("Awesome-Hidden-AI-Credits-Free","ca5b17dcb87024b3e4b9561aaec7730b7e5a36d4"),
}
LINK=re.compile(r'\[([^\]]{2,100})\]\((https?://[^\s)]+)\)')
SKIP={"github.com","raw.githubusercontent.com","awesome.re","shields.io","freellm.net","youtube.com","www.youtube.com"}
def canonical_domain(url):
 try:
  u=urlsplit(url.strip());h=(u.hostname or "").lower().removeprefix("www.")
  if u.scheme!='https' or not h or h in SKIP:return None
  return h
 except ValueError:return None
def extract_markdown(content,source):
 out=[]
 for label,url in LINK.findall(content):
  h=canonical_domain(url)
  if h and not any(bad in label.lower() for bad in ("guide","docs","contributing","readme","benchmark","quick start","free api key list")):
   out.append({"name":re.sub(r'[ *`]+',' ',label).strip(),"homepage":url,"domain":h,"catalog":source,"review_status":"candidate_unverified","enabled":False})
 return out
def collect(base=ROOT):
 results=[]
 for key,(directory,sha) in SOURCES.items():
  folder=Path(base)/directory
  if not folder.is_dir():raise FileNotFoundError(f"Submodule not initialized: {folder}. Run git submodule update --init --recursive")
  if key=='mnfst':
   data=json.loads((folder/'data.json').read_text(encoding='utf-8'))
   for p in data.get('providers',[]):
    domain=canonical_domain(p.get('url',''))
    if domain:results.append(dict(name=p['name'],homepage=p['url'],domain=domain,catalog=key,review_status='candidate_unverified',enabled=False,advertised_models=[m.get('id') for m in p.get('models',[]) if m.get('id')],advertised_base_url=p.get('baseUrl'),advertised_description=p.get('description',''),catalog_sha=sha))
   # The README and machine-readable provider table overlap: retain table as canonical for this source.
  else:
   for item in extract_markdown((folder/'README.md').read_text(encoding='utf-8'),key):
    item['catalog_sha']=sha;results.append(item)
 merged={}
 for item in results:
  # Domain dedupe produces discoverable candidates; manual reviewer resolves aggregators and aliases.
  k=item['domain']
  if k not in merged:merged[k]={**item,"catalogs":[item['catalog']]}
  else:
   v=merged[k];v['catalogs']=sorted(set(v['catalogs']+[item['catalog']]))
   if item.get('advertised_models'):v['advertised_models']=sorted(set(v.get('advertised_models',[])+item['advertised_models']))
 return sorted(merged.values(),key=lambda x:x['domain'])
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--output',default='blog-engine/data/api_candidates.json');parser.add_argument('--root',type=Path,default=ROOT);args=parser.parse_args()
 records=collect(args.root);path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True)
 path.write_text(json.dumps({"provenance":{key:sha for key,(_,sha) in SOURCES.items()},"notice":"UNVERIFIED catalog candidates; no service calls authorized","raw_entry_count":sum(1 for _ in records),"providers":records},indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
 print('Imported',len(records),'deduplicated candidates to',path,'(none activated)')
if __name__=='__main__':main()
