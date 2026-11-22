import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('boundary', Path(__file__).resolve().parents[1] / 'scripts/verify-production-boundary.py')
boundary = importlib.util.module_from_spec(spec)
spec.loader.exec_module(boundary)

class ProductionBoundaryTests(unittest.TestCase):
    def document(self):
        return {'on': {'workflow_dispatch': None}, 'jobs': {
            'test': {'runs-on': 'ubuntu-24.04', 'steps': [{'run': 'npm test'}]},
            'deploy': {'needs': 'test', 'environment': 'production', 'runs-on': 'ubuntu-24.04',
                       'if': "github.repository == 'aprashnasuraj-dev/patro' && github.ref == 'refs/heads/main' && vars.PATRO_PRODUCTION_APPROVAL_CONFIGURED == '1'",
                       'env': {'TOKEN': '${{ secrets.CLOUDFLARE_API_TOKEN }}'},
                       'steps': [{'uses': 'actions/checkout@v4', 'with': {'ref': '${{ github.sha }}', 'persist-credentials': False}}]}}}

    def check(self, doc):
        return boundary.validate({'release-gate.yml': doc})

    def test_approved_shape(self):
        self.assertEqual(self.check(self.document()), [])

    def test_rejects_secrets_in_test_job(self):
        doc = self.document()
        doc['jobs']['test']['env'] = {'TOKEN': '${{ secrets.R2_SECRET_ACCESS_KEY }}'}
        self.assertTrue(self.check(doc))

    def test_rejects_each_missing_gate(self):
        for key in ['environment', 'if', 'needs']:
            with self.subTest(key=key):
                doc = self.document()
                del doc['jobs']['deploy'][key]
                self.assertTrue(self.check(doc))

    def test_rejects_mutable_checkout_or_persisted_credentials(self):
        for settings in [{'ref': 'main', 'persist-credentials': False}, {'ref': '${{ github.sha }}'}]:
            doc = self.document()
            doc['jobs']['deploy']['steps'][0]['with'] = settings
            self.assertTrue(self.check(doc))

    def test_rejects_legacy_token_and_privileged_pr(self):
        doc = self.document()
        doc['jobs']['deploy']['env']['TOKEN'] = '${{ secrets.git }}'
        self.assertTrue(self.check(doc))
        doc = self.document()
        doc['on'] = {'pull_request_target': None}
        self.assertTrue(self.check(doc))

if __name__ == '__main__':
    unittest.main()
