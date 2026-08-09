#!/usr/bin/env python3
import argparse, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
FILES = ['axes.json','parties.json','questions.json','positions.json','sources.json']
OUT = DATA / 'default-data.js'

def build_text():
    payload = {name[:-5]: json.loads((DATA/name).read_text(encoding='utf-8')) for name in FILES}
    return 'window.KALPI_DATA = ' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';\n'

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args=parser.parse_args()
    text=build_text()
    if args.check:
        if not OUT.exists() or OUT.read_text(encoding='utf-8') != text:
            raise SystemExit('data/default-data.js is out of date; run tools/build_data_bundle.py')
        print('data bundle is current')
    else:
        OUT.write_text(text, encoding='utf-8')
        print(f'wrote {OUT.relative_to(ROOT)}')
if __name__=='__main__': main()
