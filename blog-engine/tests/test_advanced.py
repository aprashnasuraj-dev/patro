import unittest
from engine.semantic_gate import gate
from engine.internal_links import suggest
from engine.verify_content import excessive_copy
class AdvancedTests(unittest.TestCase):
 def test_similarity_review(self):
  self.assertFalse(gate([1,0],{"old":[1,0]})["passed"])
  self.assertTrue(gate([0,1],{"old":[1,0]})["passed"])
 def test_links_are_real(self):
  ledger={str(i):dict(id=str(i),status="published",cluster="physics",url="https://aafnaipatro.com/blogs/item-"+str(i)+"/",title="Thermal physics item "+str(i)) for i in range(5)}
  x=suggest(dict(id="new",cluster="physics",intent="Heat transfer",title="Thermal physics"),ledger)
  self.assertEqual(len(x["links"]),5)
  self.assertFalse(x["needs_review"])
 def test_copy_gate(self):
  self.assertTrue(excessive_copy("one two three four five six seven eight nine ten eleven twelve thirteen",["one two three four five six seven eight nine ten eleven twelve thirteen"]))
  self.assertFalse(excessive_copy("completely original prose here",["different independent source excerpt"]))
if __name__=="__main__":unittest.main()
