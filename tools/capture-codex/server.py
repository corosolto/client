from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.parse import urlparse, parse_qs, unquote
import argparse, os, re

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument('--audio-root', required=True)
args = parser.parse_args()
output = Path(args.output).resolve()
base_saida = os.path.realpath(output)
runtime = Path(__file__).with_name('runtime.js')
audio_root = Path(args.audio_root).resolve()

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        try:
            if urlparse(self.path).path == '/__capture/runtime.js':
                data, mime = runtime.read_bytes(), 'text/javascript'
            elif urlparse(self.path).path.startswith('/audio/'):
                asset = (audio_root / unquote(urlparse(self.path).path.removeprefix('/audio/'))).resolve()
                if not asset.is_relative_to(audio_root):
                    self.send_error(400)
                    return
                import mimetypes
                data, mime = asset.read_bytes(), mimetypes.guess_type(asset.name)[0] or 'application/octet-stream'
            else:
                with urlopen('http://127.0.0.1:8779' + self.path, timeout=60) as response:
                    data, mime = response.read(), response.headers.get('Content-Type', '')
                if mime.startswith('text/html') and urlparse(self.path).path == '/':
                    data = data.replace(b'<head>', b'<head><script src="/__capture/runtime.js"></script>', 1)
                if urlparse(self.path).path == '/js/main.js':
                    source = data.decode()
                    begin = source.index("$('profile-ok').onclick = async")
                    end = source.index('// ESC no menu', begin)
                    profile = source[begin:end]
                    profile = profile.replace('if (!testMode) {', 'if (!testMode && !window.__captureOffline) {', 1)
                    profile = profile.replace('    saveSettings();', '    if (window.__captureOffline) { registeredNick = nick; localStorage.setItem(NICK_KEY, nick); renderPlayerPlate(); }\n    saveSettings();', 1)
                    data = (source[:begin] + profile + source[end:]).encode()
            self.send_response(200)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as error:
            self.send_error(502, str(error))

    def do_POST(self):
        parsed = urlparse(self.path)
        size = int(self.headers.get('Content-Length', '0'))
        if parsed.path != '/__capture/save' or not 0 < size < 1000000000:
            self.send_error(400)
            return
        name = re.sub(r'[^a-zA-Z0-9_-]', '_', parse_qs(parsed.query).get('name', ['take'])[0])[:100]
        # o nome vira arquivo: caminho absoluto tem de continuar dentro do diretório de saída
        target = os.path.realpath(output / (name + '.webm'))
        if not target.startswith(base_saida + os.sep):
            self.send_error(400, 'invalid take name')
            return

        if os.path.exists(target):
            self.send_error(409, 'Take already exists')
            return
        with open(target, 'xb') as file:
            remaining = size
            while remaining:
                chunk = self.rfile.read(min(remaining, 1048576))
                if not chunk:
                    break
                file.write(chunk)
                remaining -= len(chunk)
        if remaining:
            os.unlink(target)
            self.send_error(400, 'Incomplete recording')
            return
        self.send_response(200)
        self.end_headers()
        self.wfile.write(('SALVO: ' + target + ' (' + str(os.path.getsize(target)) + ' bytes)').encode())

ThreadingHTTPServer(('127.0.0.1', 8778), Handler).serve_forever()
