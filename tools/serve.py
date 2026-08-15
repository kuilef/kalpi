#!/usr/bin/env python3
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse, gzip, io, mimetypes, os, threading, webbrowser

ROOT = Path(__file__).resolve().parents[1]

class KalpiHandler(SimpleHTTPRequestHandler):
    compressible_suffixes = {'.css', '.html', '.js', '.json', '.svg', '.txt'}

    def end_headers(self):
        self.send_header('Cache-Control', 'public, max-age=300, must-revalidate')
        super().end_headers()

    def send_head(self):
        path = Path(self.translate_path(self.path))
        accepts_gzip = 'gzip' in self.headers.get('Accept-Encoding', '').lower()
        if path.is_file() and accepts_gzip and path.suffix.lower() in self.compressible_suffixes:
            try:
                content = path.read_bytes()
            except OSError:
                return super().send_head()
            compressed = gzip.compress(content, compresslevel=6)
            if len(compressed) < len(content):
                self.send_response(200)
                self.send_header('Content-type', mimetypes.guess_type(path.name)[0] or 'application/octet-stream')
                self.send_header('Content-Encoding', 'gzip')
                self.send_header('Vary', 'Accept-Encoding')
                self.send_header('Content-Length', str(len(compressed)))
                self.send_header('Last-Modified', self.date_time_string(path.stat().st_mtime))
                self.end_headers()
                return io.BytesIO(compressed)
        return super().send_head()


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
    ThreadingHTTPServer(('127.0.0.1', args.port), KalpiHandler).serve_forever()

if __name__ == '__main__':
    main()
