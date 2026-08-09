#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse, os, threading, webbrowser

ROOT = Path(__file__).resolve().parents[1]

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description='Serve the Kalpi prototype so data/*.json are loaded directly.')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    os.chdir(ROOT)
    url = f'http://127.0.0.1:{args.port}/'
    if not args.no_browser:
        threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    print(f'Kalpi: {url}')
    print('Ctrl+C to stop.')
    ThreadingHTTPServer(('127.0.0.1', args.port), NoCacheHandler).serve_forever()

if __name__ == '__main__':
    main()
