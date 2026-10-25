#!/usr/bin/env python3
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import posixpath
import re
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
ASSET_DIRS = {'_astro', 'ak', 'audio', 'css', 'fonts', 'img', 'js', 'models',
              'posters', 'private-assets', 'sprites', 'textures', 'vendor', 'video', 'wasm'}
TEXT_EXT = {'.html', '.js', '.mjs', '.css', '.json'}
ROOT_EXT = {'.css', '.png', '.webp', '.jpg', '.svg', '.ico', '.webmanifest'}
REQUIRED = {'index.html', 'js/main.js', 'js/version.js', 'vendor/three.module.js'}
SOURCES = {
    'itch': 'https://itch.io/docs/creators/html5',
    'crazygames': 'https://docs.crazygames.com/requirements/technical/',
}
LIMITS = {
    'itch': {'files': 1000, 'bytes': 500_000_000, 'file_bytes': 200_000_000, 'path_chars': 240},
    'crazygames': {'files': 1500, 'bytes': 250_000_000, 'initial_bytes_without_sdk': 50_000_000},
}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def selected(name):
    path = Path(name)
    return (name in {'index.html', 'LICENSE', 'SOURCE.txt'} or path.parts[0] in ASSET_DIRS
            or len(path.parts) == 1 and path.suffix in ROOT_EXT)


def paths(source):
    if source.is_symlink() or not source.is_dir():
        raise ValueError('build deve ser diretório real, sem symlink')
    found = []
    for directory, dirs, files in os.walk(source, followlinks=False):
        if Path(directory) == source and '.well-known' in dirs:
            dirs.remove('.well-known')
        for name in dirs + files:
            child = Path(directory, name)
            if child.is_symlink():
                raise ValueError(f'symlink recusado no build: {child.relative_to(source)}')
        for name in files:
            child = Path(directory, name)
            rel = child.relative_to(source).as_posix()
            if (selected(rel) or '/' not in rel) and any(p.startswith('.') for p in child.relative_to(source).parts):
                raise ValueError(f'arquivo oculto recusado no build: {rel}')
            if selected(rel):
                found.append(rel)
    return sorted(found)


def root_pattern(names):
    roots = sorted(ASSET_DIRS | {n for n in names if '/' not in n}, key=len, reverse=True)
    return re.compile(r'(?P<lead>[\x22\x27`(=\s])/(?P<path>(?:' + '|'.join(re.escape(r) for r in roots) + r')(?=[/\x22\x27`?#)\s]|$))')


def portable(data, name, pattern):
    text = data.decode('utf-8')
    if Path(name).suffix in {'.js', '.mjs'} and re.search(r'(?:from\s*|import\s*(?:\(\s*)?)[\x22\x27`]/', text):
        raise ValueError(f'import absoluto exige adaptação explícita: {name}')
    explicit_urls = re.finditer(r'new\s+URL\s*\(\s*[\x22\x27`]/[^\x22\x27`]*[\x22\x27`]', text)
    if Path(name).suffix in {'.js', '.mjs'} and any(pattern.search(m[0]) for m in explicit_urls):
        raise ValueError(f'URL absoluta com base explícita exige revisão: {name}')
    if name == 'index.html':
        text = re.sub(r'<base\b[^>]*>', '<base href="./">', text, flags=re.I)
    prefix = posixpath.relpath('.', posixpath.dirname(name) or '.') + '/'
    if Path(name).suffix != '.css':
        prefix = './'
    text = pattern.sub(lambda m: m['lead'] + prefix + m['path'], text)
    if pattern.search(text):
        raise ValueError(f'asset absoluto restante: {name}')
    return text.encode('utf-8')


def eligibility(files):
    total = sum(f['bytes'] for f in files)
    checks = {}
    for portal, limits in LIMITS.items():
        failures = []
        if len(files) > limits['files']:
            failures.append(f"{len(files)} arquivos > {limits['files']}")
        if total > limits['bytes']:
            failures.append(f"{total} bytes totais > {limits['bytes']}")
        if 'initial_bytes_without_sdk' in limits and total > limits['initial_bytes_without_sdk']:
            failures.append(f"sem SDK validado, tamanho inicial = total: {total} > {limits['initial_bytes_without_sdk']}")
        for f in files:
            if f['bytes'] > limits.get('file_bytes', float('inf')):
                failures.append(f"arquivo excede limite: {f['path']}")
            if len(f['path']) > limits.get('path_chars', float('inf')):
                failures.append(f"caminho excede limite: {f['path']}")
        checks[portal] = {'upload_budget_pass': not failures, 'failures': failures,
                          'source': SOURCES[portal], 'limits': limits}
    return checks


def bundle(source, output, identity):
    source, output = Path(source).absolute(), Path(output).absolute()
    if source == output or source in output.parents or output in source.parents:
        raise ValueError('saída e build precisam ser diretórios separados')
    names = paths(source)
    if REQUIRED - set(names):
        raise ValueError(f'build incompleto: {sorted(REQUIRED - set(names))}')
    if output.exists():
        raise ValueError('saída já existe; use outra pasta para evitar pacote misturado')
    output.mkdir(parents=True)
    site = output / 'site'
    site.mkdir()
    pattern = root_pattern(names)
    files, transformed = [], []
    for name in names:
        original = (source / name).read_bytes()
        data = portable(original, name, pattern) if Path(name).suffix in TEXT_EXT else original
        target = site / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        row = {'path': name, 'bytes': len(data), 'sha256': digest(data)}
        files.append(row)
        if data != original:
            transformed.append({'path': name, 'source_sha256': digest(original), 'sha256': row['sha256']})
    notices = {'LICENSE': (ROOT / 'LICENSE').read_bytes(),
               'SOURCE.txt': ('Fonte: https://github.com/corosolto/client/tree/' + identity['git_sha']
                              + '\nEmpacotador: tools/distribution-web/package.py\n'
                              + 'Candidato local; QA de portal e publicacao pendentes.\n').encode()}
    for name, data in notices.items():
        if name in names:
            raise ValueError(f'build contém aviso reservado: {name}')
        (site / name).write_bytes(data)
        files.append({'path': name, 'bytes': len(data), 'sha256': digest(data)})
    files.sort(key=lambda row: row['path'])
    archive = output / 'corosolto-web.zip'
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for row in files:
            info = zipfile.ZipInfo(row['path'], (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, (site / row['path']).read_bytes(), compresslevel=6)
    report = {'schema': 1, 'identity': identity, 'files_count': len(files),
              'extracted_bytes': sum(f['bytes'] for f in files),
              'archive': {'path': archive.name, 'bytes': archive.stat().st_size, 'sha256': digest(archive.read_bytes())},
              'profiles': eligibility(files), 'transformed': transformed,
              'runtime_qa': 'pending', 'publish_ready': False,
              'limits': ['QA real de subpasta, partida, pointer lock e áudio pendente.',
                         'APIs /api, login, multiplayer e links do site não são portados por este empacotador.',
                         'Assets privados e áudio ausentes do build não são inventados nem baixados.',
                         'Orçamento de upload não comprova aceite editorial, licença ou SDK de portal.']}
    save_json(output / 'manifest.json', {'schema': 1, 'files': files})
    save_json(output / 'report.json', report)
    return report


def verify(directory, extract_to=None):
    directory = Path(directory)
    manifest = json.loads((directory / 'manifest.json').read_text())
    report = json.loads((directory / 'report.json').read_text())
    archive = directory / 'corosolto-web.zip'
    archive_bytes = archive.read_bytes()
    if digest(archive_bytes) != report['archive']['sha256']:
        raise ValueError('SHA-256 do ZIP divergiu')
    files = manifest['files']
    expected = {row['path']: row for row in files}
    if len(expected) != len(files):
        raise ValueError('manifesto contém caminho duplicado')
    if REQUIRED - set(expected):
        raise ValueError('manifesto perdeu entrada obrigatória do jogo')
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as z:
        if sorted(z.namelist()) != sorted(expected):
            raise ValueError('ZIP diverge do manifesto de arquivos')
        for name, row in expected.items():
            p = Path(name)
            if p.is_absolute() or '..' in p.parts or '\\' in name or not selected(name):
                raise ValueError(f'caminho inválido: {name}')
            data = z.read(name)
            if (z.getinfo(name).external_attr >> 16) & 0o170000 != 0o100000:
                raise ValueError(f'entrada ZIP não é arquivo regular: {name}')
            if len(data) != row['bytes'] or digest(data) != row['sha256']:
                raise ValueError(f'conteúdo divergiu: {name}')
    if report['profiles'] != eligibility(files):
        raise ValueError('limites do relatório divergem dos bytes do ZIP')
    if (report['files_count'] != len(files) or report['extracted_bytes'] != sum(f['bytes'] for f in files)
            or report['archive']['bytes'] != len(archive_bytes) or report['publish_ready'] is not False):
        raise ValueError('metadados do candidato divergem ou alegam publicação pronta')
    if extract_to is not None:
        target = Path(extract_to)
        target.mkdir(parents=True, exist_ok=False)
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as z:
            for name in expected:
                file = target / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(z.read(name))
    return report


def main():
    parser = argparse.ArgumentParser(description='Pacote candidato de portal; nunca publica.')
    parser.add_argument('command', choices=['build', 'verify', 'extract'])
    parser.add_argument('--source', type=Path, default=ROOT / 'dist/client')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/portal')
    parser.add_argument('--require-profile', choices=LIMITS)
    parser.add_argument('--extract-to', type=Path)
    args = parser.parse_args()
    if (args.command == 'extract') != bool(args.extract_to):
        parser.error('extract exige --extract-to; outras operações não extraem')
    if args.command == 'build':
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
        version = json.loads((ROOT / 'package.json').read_text())['version']
        report = bundle(args.source, args.output, {'git_sha': head, 'version': version})
    else:
        report = verify(args.output, args.extract_to)
    print(json.dumps({k: report[k] for k in ['identity', 'archive', 'files_count', 'extracted_bytes', 'profiles', 'runtime_qa', 'publish_ready']}, ensure_ascii=False, indent=2))
    if args.require_profile and not report['profiles'][args.require_profile]['upload_budget_pass']:
        raise SystemExit(2)


if __name__ == '__main__':
    main()
