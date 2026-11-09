import tempfile,unittest,json
from pathlib import Path
from engine.catalog_import import collect,extract_markdown,SOURCES
class CatalogTests(unittest.TestCase):
 def test_markdown_dedup(self):
  sample='* [Groq](https://console.groq.com/keys)\n* [Groq again](https://console.groq.com/keys)\n* [Guide](https://github.com/example/guide)'
  r=extract_markdown(sample,'test');self.assertEqual(len(r),2);self.assertTrue(all(x['enabled'] is False for x in r))
 def test_missing_submodule_fails_closed(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaises(FileNotFoundError):collect(Path(d))
 def test_import_three_pinned_sources(self):
  root=Path(__file__).resolve().parents[2]/'missionmangal'/'vendor'
  if not all((root/d).is_dir() for d,_ in SOURCES.values()):self.skipTest('Submodules require checkout --submodules recursive')
  r=collect(root);self.assertGreater(len(r),10);self.assertEqual(len({x['domain'] for x in r}),len(r));self.assertTrue(all(x['enabled'] is False for x in r))
if __name__=='__main__':unittest.main()
