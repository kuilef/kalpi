import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / 'tools' / 'sync_position_matrix.py'
SPEC = importlib.util.spec_from_file_location('sync_position_matrix', MODULE_PATH)
sync_position_matrix = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(sync_position_matrix)


class CandidateImportTests(unittest.TestCase):
    def test_build_candidate_import_requires_complete_unique_matrix_and_known_evidence(self):
        parties = [{'id': 'p1', 'active': True}]
        questions = [{'id': 'q1', 'display_order': 1}]
        package = {
            'party_id': 'p1',
            'positions': [{
                'party': 'p1', 'question': 'q1', 'value': 1, 'confidence': 0.4,
                'status': 'mixed', 'entity_scope': 'LEADER', 'evidence': ['s1'],
                'explanation_ru': 'source-backed', 'last_verified': '2026-08-11',
            }],
            'sources': [{'id': 's1', 'title': 'Source', 'url': 'https://example.test'}],
        }

        result = sync_position_matrix.build_candidate_import(
            parties=parties,
            questions=questions,
            existing_sources=[],
            packages=[package],
        )

        self.assertEqual(result['summary']['positions'], 1)
        self.assertEqual(result['summary']['sources_added'], 1)
        self.assertEqual(result['positions'][0]['status'], 'mixed')
        self.assertEqual(result['sources'][0]['id'], 's1')

    def test_build_candidate_import_rejects_conflicting_source_ids(self):
        with self.assertRaisesRegex(ValueError, 'conflicting source id'):
            sync_position_matrix.build_candidate_import(
                parties=[{'id': 'p1', 'active': True}],
                questions=[{'id': 'q1', 'display_order': 1}],
                existing_sources=[{'id': 's1', 'title': 'Old'}],
                packages=[{
                    'party_id': 'p1',
                    'positions': [{
                        'party': 'p1', 'question': 'q1', 'value': 1, 'confidence': 0.5,
                        'status': 'known', 'entity_scope': 'PARTY', 'evidence': ['s1'],
                        'explanation_ru': 'x', 'last_verified': '2026-08-11',
                    }],
                    'sources': [{'id': 's1', 'title': 'New'}],
                }],
            )

    def test_build_candidate_import_namespaces_conflicts_and_rewrites_evidence(self):
        result = sync_position_matrix.build_candidate_import(
            parties=[{'id': 'p1', 'active': True}],
            questions=[{'id': 'q1', 'display_order': 1}],
            existing_sources=[{'id': 's1', 'title': 'Canonical'}],
            packages=[{
                'party_id': 'p1',
                'positions': [{
                    'party': 'p1', 'question': 'q1', 'value': 1, 'confidence': 0.5,
                    'status': 'known', 'entity_scope': 'PARTY', 'evidence': ['s1'],
                    'explanation_ru': 'x', 'last_verified': '2026-08-11',
                }],
                'sources': [{'id': 's1', 'title': 'Candidate'}],
            }],
            namespace_conflicts=True,
        )

        self.assertEqual(result['summary']['sources_namespaced'], 1)
        self.assertEqual(result['positions'][0]['evidence'], ['candidate_p1_s1'])
        self.assertEqual(result['sources'][-1]['id'], 'candidate_p1_s1')

    def test_build_candidate_import_prunes_unreferenced_canonical_sources(self):
        result = sync_position_matrix.build_candidate_import(
            parties=[{'id': 'p1', 'active': True}],
            questions=[{'id': 'q1', 'display_order': 1}],
            existing_sources=[
                {'id': 'used', 'title': 'Used'},
                {'id': 'orphan', 'title': 'Orphan'},
            ],
            packages=[{
                'party_id': 'p1',
                'positions': [{
                    'party': 'p1', 'question': 'q1', 'value': 1, 'confidence': 0.5,
                    'status': 'known', 'entity_scope': 'PARTY', 'evidence': ['used'],
                    'explanation_ru': 'x', 'last_verified': '2026-08-11',
                }],
                'sources': [{'id': 'used', 'title': 'Used'}],
            }],
        )

        self.assertEqual([source['id'] for source in result['sources']], ['used'])


if __name__ == '__main__':
    unittest.main()
