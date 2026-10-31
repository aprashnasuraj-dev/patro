"""Protect published Mission Mangal calculator links across library re-renders."""
from __future__ import annotations

import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from render_source_bundle import ASSET_ORIGIN, MMG_CALCULATORS, article_body


class CalculatorPublicationLinks(unittest.TestCase):
    def render(self, topic_id, body):
        return article_body("# Example\n\n" + body, {"topic_id": topic_id}, {}, [])

    def test_all_thirteen_legacy_html_links_rewrite_to_existing_r2_layout(self):
        self.assertEqual(len(MMG_CALCULATORS), 13)
        for topic_id, files in MMG_CALCULATORS.items():
            for section in ("assets", "tools"):
                with self.subTest(topic_id=topic_id, section=section):
                    relative = "../../%s/%s/%s" % (section, topic_id, files[0])
                    actual = self.render(topic_id, "[Open calculator](%s)" % relative)
                    target = "%s/tools/%s/%s" % (ASSET_ORIGIN, topic_id, files[0])
                    self.assertIn('href="%s"' % target, actual)
                    self.assertEqual(actual.count(target), 1)
                    self.assertNotIn('href="%s"' % relative, actual)

    def test_code_only_descriptions_get_one_real_cta(self):
        for topic_id, files in MMG_CALCULATORS.items():
            with self.subTest(topic_id=topic_id):
                actual = self.render(topic_id, "Calculator source: `%s`." % files[0])
                target = "%s/tools/%s/%s" % (ASSET_ORIGIN, topic_id, files[0])
                self.assertIn('href="%s"' % target, actual)
                self.assertIn("Interactive calculator", actual)
                self.assertEqual(actual.count(target), 1)

    def test_secondary_script_links_rewrite_without_duplicate_html_cta(self):
        for topic_id, files in MMG_CALCULATORS.items():
            for filename in files[1:]:
                with self.subTest(topic_id=topic_id, filename=filename):
                    body = "[Module](../../assets/%s/%s)\n\n[Calculator](../../assets/%s/%s)" % (
                        topic_id, filename, topic_id, files[0])
                    actual = self.render(topic_id, body)
                    self.assertIn('href="%s/tools/%s/%s"' % (ASSET_ORIGIN, topic_id, filename), actual)
                    target = "%s/tools/%s/%s" % (ASSET_ORIGIN, topic_id, files[0])
                    self.assertEqual(actual.count(target), 1)

    def test_unrelated_links_unchanged(self):
        text = self.render("MMG-9999", "[External reference](https://example.org/reference) and [local appendix](../appendix.html)")
        self.assertIn('href="https://example.org/reference"', text)
        self.assertIn('href="../appendix.html"', text)
        self.assertNotIn("mmg-calculator-cta", text)


if __name__ == "__main__":
    unittest.main()
