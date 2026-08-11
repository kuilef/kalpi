#!/usr/bin/env python3
"""Keep the explicit party × question position matrix aligned with canonical JSON."""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'


def load(name):
    return json.loads((DATA / name).read_text(encoding='utf-8'))


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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--reset', action='store_true', help='replace every cell with an explicit missing-position record')
    args = parser.parse_args()

    parties = [party for party in load('parties.json') if party.get('active', True)]
    questions = sorted(load('questions.json'), key=lambda question: question['display_order'])
    existing = {} if args.reset else {
        (position['party'], position['question']): position
        for position in load('positions.json')
    }
    positions = [
        existing.get((party['id'], question['id']), empty_position(party['id'], question['id']))
        for party in parties
        for question in questions
    ]
    (DATA / 'positions.json').write_text(json.dumps(positions, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {len(positions)} explicit party-question cells')


if __name__ == '__main__':
    main()
