import tempfile,unittest
from pathlib import Path
from engine.ledger import transition,load,stable_id
from engine.discovery import candidate
from engine.seo import canonical
from engine.duplicate_checker import check
class PipelineTests(unittest.TestCase):
 def test_resume_and_duplicate(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/"article_ledger.jsonl"
   c=candidate("science","Why does metal feel cold?","answer")
   self.assertEqual(c["id"],stable_id("science","Why does metal feel cold?"))
   a=transition(p,c["id"],"discovered",intent=c["intent"],url=canonical("answer",c["primary_query"]))
   again=transition(p,c["id"],"discovered",intent=c["intent"],url=a["url"])
   self.assertEqual(a["revision"],again["revision"])
   self.assertTrue(check(c,load(p))["duplicate"])
   self.assertEqual(transition(p,c["id"],"researching")["status"],"researching")
   with self.assertRaises(ValueError):transition(p,c["id"],"published")
 def test_paths(self):
  for kind,prefix in [("article","articles"),("blog","blogs"),("fact","facts"),("answer","what")]:
   self.assertTrue(canonical(kind,"Why does metal feel cold?").startswith("https://aafnaipatro.com/"+prefix+"/"))
if __name__=="__main__":unittest.main()
