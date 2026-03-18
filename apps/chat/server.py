from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import subprocess
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
CHAT_DIR = ROOT / 'apps' / 'chat'
PLAN_DIR = ROOT / 'operators' / 'desktop'

PROMPT_MAP = {
    '사파리 열어줘': 'demo-open-safari.json',
    '사파리 검색해줘': 'safari-search.json',
    '메모 적어줘': 'textedit-note.json',
    '단축키 테스트해줘': 'app-hotkeys.json'
}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _json(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/api/run':
            return self._json(404, {'ok': False, 'error': 'Not found'})

        length = int(self.headers.get('Content-Length', '0'))
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw or b'{}')
        except Exception:
            return self._json(400, {'ok': False, 'error': 'Invalid JSON'})

        prompt = (body.get('prompt') or '').strip()
        dry_run = bool(body.get('dryRun', True))
        plan_name = PROMPT_MAP.get(prompt)

        if not plan_name:
            return self._json(200, {
                'ok': False,
                'matched': False,
                'message': '아직 이 요청은 자동 실행에 연결되지 않았어. 현재는 미리 정의된 몇 개 명령만 연결돼 있어.',
                'knownPrompts': list(PROMPT_MAP.keys())
            })

        plan_path = PLAN_DIR / plan_name
        cmd = ['node', 'core/ui-operator.js', f'--plan={plan_path.relative_to(ROOT)}']
        if dry_run:
            cmd.append('--dry-run')

        try:
            result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, timeout=120)
            stdout = result.stdout.strip()
            stderr = result.stderr.strip()
            payload = {
                'ok': result.returncode == 0,
                'matched': True,
                'prompt': prompt,
                'plan': plan_name,
                'dryRun': dry_run,
                'stdout': stdout,
                'stderr': stderr,
                'returncode': result.returncode
            }
            return self._json(200, payload)
        except Exception as e:
            return self._json(500, {'ok': False, 'matched': True, 'error': str(e)})

if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 8002), Handler)
    print('ClawCore chat API running at http://127.0.0.1:8002')
    server.serve_forever()
