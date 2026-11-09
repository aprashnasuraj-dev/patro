import os,unittest
from unittest.mock import patch
from engine.model_router import Router,TransientFailure,PermanentFailure,ExhaustedProviders,independent_review
def spec(id,capabilities=('draft','review'),limit=5):
 return dict(id=id,kind='groq',endpoint='https://example.org/chat',model='test',secret_env=id.upper()+'_KEY',capabilities=list(capabilities),daily_limit=limit,enabled=True,official_terms_verified=True,commercial_use_verified=True,max_retries=1)
class RouterTests(unittest.TestCase):
 def test_transient_fallback_and_no_secret_logging(self):
  calls=[]
  def fake(p,m,k):
   calls.append(p['id'])
   if p['id']=='a':raise TransientFailure('429',0)
   return 'An evidence-bound response'
  with patch.dict(os.environ,{'A_KEY':'private-secret-a','B_KEY':'private-secret-b'}):
   r=Router([spec('a'),spec('b')],fake,sleep=lambda _:None)
   out=r.complete('draft',[{'role':'user','content':'Evidence packet'}])
   self.assertEqual(out['provider'],'b')
   self.assertEqual(calls,['a','a','b'])
   self.assertNotIn('private-secret-a',repr(r.failures))
 def test_independent_review_uses_other_provider(self):
  with patch.dict(os.environ,{'A_KEY':'a','B_KEY':'b'}):
   r=Router([spec('a'),spec('b')],lambda p,m,k:'Review notes from '+p['id'])
   self.assertEqual(independent_review(r,{},'Draft','a')['provider'],'b')
 def test_exhaustion_fails_closed(self):
  with patch.dict(os.environ,{'A_KEY':'a'}):
   r=Router([spec('a',limit=1)],lambda p,m,k:(_ for _ in ()).throw(PermanentFailure('bad')))
   with self.assertRaises(ExhaustedProviders):r.complete('draft',[])
   self.assertEqual(r.usage['a'],1)
   with self.assertRaises(ExhaustedProviders):r.complete('draft',[])
 def test_unapproved_or_missing_key_never_selected(self):
  s=spec('a');s['official_terms_verified']=False
  r=Router([s],lambda p,m,k:'not called')
  with self.assertRaises(ExhaustedProviders):r.complete('draft',[])
if __name__=='__main__':unittest.main()
