"""Resumable, source-constrained multi-model editorial orchestration. Never auto-publishes."""
import json
from .ledger import transition,load
from .research import source_pack
from .writer import brief
from .model_router import ExhaustedProviders,independent_review
from .fact_checker import structural_verify
def advance(article,ledger_path,router,sources,claims):
 id_=article['id']
 current=load(ledger_path).get(id_)
 if current is None:current=transition(ledger_path,id_,'discovered',intent=article['intent'],url=article['url'],type=article['type'],primary_query=article['primary_query'])
 if current['status']=='blocked':current=transition(ledger_path,id_,'researching')
 if current['status']=='discovered':current=transition(ledger_path,id_,'researching')
 if current['status']=='researching':
  try:
   source_pack(sources)
   current=transition(ledger_path,id_,'sourced',source_ids=[s['id'] for s in sources])
  except ValueError as e:return transition(ledger_path,id_,'blocked',failure='Research evidence incomplete: '+str(e))
 if current['status']=='sourced':
  packet=brief(article,sources,claims)
  try:
   result=router.complete('draft',[{'role':'system','content':'Write detailed fluent English. Use only evidence in user brief, do not invent citations, quotes or expertise. Source identifiers must be preserved.'},{'role':'user','content':json.dumps(packet)}])
  except ExhaustedProviders:return transition(ledger_path,id_,'blocked',failure='All drafting providers exhausted')
  current=transition(ledger_path,id_,'draft',draft=result['text'],draft_provider=result['provider'],model=result['model'])
 if current['status']=='draft':
  current=transition(ledger_path,id_,'editing')
 if current['status']=='editing':
  try:
   result=router.complete('edit',[{'role':'system','content':'Improve clarity and natural English. Keep all source IDs and do not add any external facts.'},{'role':'user','content':current['draft']}])
  except ExhaustedProviders:return transition(ledger_path,id_,'blocked',failure='All editing providers exhausted')
  current=transition(ledger_path,id_,'verifying',edited_draft=result['text'],editor_provider=result['provider'])
 if current['status']=='verifying':
  try:
   # Independent model review is advisory, NOT evidence itself.
   result=independent_review(router,{'sources':sources,'claims':claims},current['edited_draft'],current['draft_provider'])
  except ExhaustedProviders:return transition(ledger_path,id_,'blocked',failure='No independent review provider')
  current=transition(ledger_path,id_,'verified',review_notes=result['text'],review_provider=result['provider'],verification_note='Advisory model review; source passages and media rights still need editorial audit')
 if current['status']=='verified':
  current=transition(ledger_path,id_,'review',publish_approved=False)
 return current
