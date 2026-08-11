import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'

class BundleTest(unittest.TestCase):
    def test_default_bundle_matches_canonical_json(self):
        text = (DATA / 'default-data.js').read_text(encoding='utf-8').strip()
        self.assertTrue(text.startswith('window.KALPI_DATA = '))
        self.assertTrue(text.endswith(';'))
        payload = json.loads(text[len('window.KALPI_DATA = '):-1])
        expected = {}
        for name in ['parties','questions','positions','sources']:
            expected[name] = json.loads((DATA / f'{name}.json').read_text(encoding='utf-8'))
        expected['scoringConfig'] = json.loads((DATA / 'scoring-config.json').read_text(encoding='utf-8'))
        self.assertEqual(payload, expected)

    def test_baseline_bundle_matches_frozen_baseline_json(self):
        text = (DATA / 'baseline-data.js').read_text(encoding='utf-8').strip()
        self.assertTrue(text.startswith('window.KALPI_BASELINE_DATA = '))
        self.assertTrue(text.endswith(';'))
        payload = json.loads(text[len('window.KALPI_BASELINE_DATA = '):-1])
        self.assertEqual(payload['positions'], json.loads((DATA / 'baseline-positions.json').read_text(encoding='utf-8')))
        self.assertEqual(payload['sources'], json.loads((DATA / 'baseline-sources.json').read_text(encoding='utf-8')))
        self.assertIn('label', payload)

if __name__ == '__main__':
    unittest.main()
