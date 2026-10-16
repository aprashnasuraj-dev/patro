import unittest
from engine.seo_opportunity import make_opportunity,rank_opportunities,score_opportunity
class SeoOpportunityTests(unittest.TestCase):
 def test_url_and_score(self):
  a=make_opportunity("Why does water look blue in deep oceans?","science","answer")
  self.assertEqual(a["url"],"https://aafnaipatro.com/what/why-does-water-look-blue-in-deep-oceans/")
  self.assertGreaterEqual(a["seo_score"],0)
  self.assertTrue(a["requires_semantic_review"])
 def test_duplicates_are_downranked(self):
  a=make_opportunity("How do rainbows form?","science")
  b={**a,"duplicate":True,"seo_score":score_opportunity(a["title"],"science",a["intent"],duplicate=True)}
  self.assertGreater(a["seo_score"],b["seo_score"])
 def test_rank_deduplicates(self):
  a=make_opportunity("How do rainbows form?","science")
  self.assertEqual(len(rank_opportunities([a,a])),1)
if __name__=="__main__":unittest.main()
