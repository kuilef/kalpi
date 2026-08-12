#!/usr/bin/env python3
"""Keep the explicit party × question matrix aligned and import reviewed prototype packages."""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
CANDIDATES = DATA / 'candidates'


def load(name):
    return json.loads((DATA / name).read_text(encoding='utf-8'))


def stable_json(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def empty_position(party_id, question_id):
    return {
        'party': party_id,
        'question': question_id,
        'value': None,
        'confidence': 0,
        'status': 'insufficient_data',
        'entity_scope': 'PARTY',
        'evidence': [],
        'explanation_ru': '',
        'last_verified': None,
    }


def build_candidate_import(*, parties, questions, existing_sources, packages, namespace_conflicts=False):
    """Return a deterministic complete matrix and source union from candidate packages."""
    active_parties = [party for party in parties if party.get('active', True)]
    party_ids = {party['id'] for party in active_parties}
    question_ids = {question['id'] for question in questions}
    expected_keys = {(party['id'], question['id']) for party in active_parties for question in questions}

    sources = list(existing_sources)
    source_by_id = {source['id']: source for source in sources}
    sources_added = 0
    sources_namespaced = 0
    position_by_key = {}

    for package in packages:
        package_party = package['party_id']
        if package_party not in party_ids:
            raise ValueError(f'unknown candidate party {package_party}')
        evidence_id_map = {}
        for source in package['sources']:
            source_id = source.get('id')
            if not source_id:
                raise ValueError(f'candidate {package_party}: source without id')
            previous = source_by_id.get(source_id)
            if previous is not None:
                if stable_json(previous) != stable_json(source):
                    if not namespace_conflicts:
                        raise ValueError(f'conflicting source id {source_id}')
                    namespaced_id = f'candidate_{package_party}_{source_id}'
                    namespaced_source = {**source, 'id': namespaced_id}
                    namespaced_previous = source_by_id.get(namespaced_id)
                    if namespaced_previous is not None and stable_json(namespaced_previous) != stable_json(namespaced_source):
                        raise ValueError(f'conflicting namespaced source id {namespaced_id}')
                    if namespaced_previous is None:
                        source_by_id[namespaced_id] = namespaced_source
                        sources.append(namespaced_source)
                        sources_added += 1
                        sources_namespaced += 1
                    evidence_id_map[source_id] = namespaced_id
                    continue
                evidence_id_map[source_id] = source_id
                continue
            source_by_id[source_id] = source
            sources.append(source)
            sources_added += 1
            evidence_id_map[source_id] = source_id

        for position in package['positions']:
            key = (position.get('party'), position.get('question'))
            if key[0] != package_party:
                raise ValueError(f'candidate {package_party}: position belongs to {key[0]}')
            if key[0] not in party_ids or key[1] not in question_ids:
                raise ValueError(f'unknown candidate matrix key {key[0]}/{key[1]}')
            if key in position_by_key:
                raise ValueError(f'duplicate candidate matrix key {key[0]}/{key[1]}')
            position_by_key[key] = {
                **position,
                'evidence': [evidence_id_map.get(evidence_id, evidence_id) for evidence_id in position.get('evidence', [])],
            }

    missing = expected_keys - set(position_by_key)
    extra = set(position_by_key) - expected_keys
    if missing or extra:
        missing_text = ', '.join(f'{party}/{question}' for party, question in sorted(missing)[:5])
        extra_text = ', '.join(f'{party}/{question}' for party, question in sorted(extra)[:5])
        raise ValueError(f'candidate matrix is incomplete (missing: {missing_text or "none"}; extra: {extra_text or "none"})')

    for key, position in position_by_key.items():
        for evidence_id in position.get('evidence', []):
            if evidence_id not in source_by_id:
                raise ValueError(f'missing evidence source {evidence_id} for {key[0]}/{key[1]}')

    ordered_positions = [
        position_by_key[(party['id'], question['id'])]
        for party in active_parties
        for question in sorted(questions, key=lambda item: item['display_order'])
    ]
    used_evidence_ids = {
        evidence_id
        for position in ordered_positions
        for evidence_id in position.get('evidence', [])
    }
    sources = [source for source in sources if source['id'] in used_evidence_ids]
    return {
        'positions': ordered_positions,
        'sources': sources,
        'summary': {
            'positions': len(ordered_positions),
            'sources_total': len(sources),
            'sources_added': sources_added,
            'sources_namespaced': sources_namespaced,
        },
    }


def load_candidate_packages(candidates_dir=CANDIDATES):
    packages = []
    for directory in sorted(path for path in candidates_dir.iterdir() if path.is_dir()):
        positions_path = directory / 'positions.json'
        sources_path = directory / 'sources.json'
        if not positions_path.exists() or not sources_path.exists():
            raise ValueError(f'candidate {directory.name}: positions.json and sources.json are required')
        packages.append({
            'party_id': directory.name,
            'positions': json.loads(positions_path.read_text(encoding='utf-8')),
            'sources': json.loads(sources_path.read_text(encoding='utf-8')),
        })
    return packages


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--reset', action='store_true', help='replace every cell with an explicit missing-position record')
    parser.add_argument('--import-candidates', action='store_true', help='merge data/candidates packages into canonical runtime JSON')
    parser.add_argument('--check', action='store_true', help='validate and report without writing files')
    args = parser.parse_args()
    if args.reset and args.import_candidates:
        parser.error('--reset and --import-candidates cannot be combined')

    parties = [party for party in load('parties.json') if party.get('active', True)]
    questions = sorted(load('questions.json'), key=lambda question: question['display_order'])

    if args.import_candidates:
        result = build_candidate_import(
            parties=parties,
            questions=questions,
            existing_sources=load('sources.json'),
            packages=load_candidate_packages(),
            namespace_conflicts=True,
        )
        print(json.dumps(result['summary'], ensure_ascii=False, sort_keys=True))
        if not args.check:
            write_json(DATA / 'positions.json', result['positions'])
            write_json(DATA / 'sources.json', result['sources'])
        return

    existing = {} if args.reset else {
        (position['party'], position['question']): position
        for position in load('positions.json')
    }
    positions = [
        existing.get((party['id'], question['id']), empty_position(party['id'], question['id']))
        for party in parties
        for question in questions
    ]
    if args.check:
        print(json.dumps({'positions': len(positions)}, ensure_ascii=False, sort_keys=True))
        return
    write_json(DATA / 'positions.json', positions)
    print(f'wrote {len(positions)} explicit party-question cells')


if __name__ == '__main__':
    main()
