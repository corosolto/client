"""Prepare a hash-pinned SteamPipe preview from an existing native build. Never uploads."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import tempfile


def prepare(content, output, launch, platform, app_id, depot_id):
    if not all(re.fullmatch(r'[1-9][0-9]{0,9}', n) for n in (app_id, depot_id)):
        raise ValueError('AppID e DepotID precisam ser IDs positivos fornecidos pela conta Steamworks.')
    content, output = Path(content).resolve(), Path(output).resolve()
    if not content.is_dir() or output == content or content in output.parents:
        raise ValueError('Build deve existir; saída precisa ficar fora do conteúdo do depot.')
    if any(c in str(content) + str(output) + launch for c in '\n\r"\\'):
        raise ValueError('Paths com quebra de linha, aspas ou barra invertida não são aceitos no VDF.')
    relative = PurePosixPath(launch)
    if relative.is_absolute() or '..' in relative.parts or not relative.parts:
        raise ValueError('Executável precisa ser um path relativo dentro da build.')
    files = []
    for directory, dirs, names in os.walk(content, followlinks=False):
        for name in dirs + names:
            path = Path(directory) / name
            mode = os.lstat(path).st_mode
            if stat.S_ISLNK(mode):
                raise ValueError('Symlink no depot: forneça uma build desktop autocontida sem links.')
            if not (stat.S_ISDIR(mode) or stat.S_ISREG(mode)):
                raise ValueError('Arquivo especial (FIFO/socket/device) no depot é recusado antes da leitura.')
            if name.lower() == '.env' or name.lower().startswith('.env.') or name.lower() in ('credentials.json', 'auth.json', 'cookies.txt'):
                raise ValueError('Arquivo de credencial/configuração privada recusado no depot.')
        for name in names:
            path = Path(directory) / name
            if not stat.S_ISREG(os.lstat(path).st_mode):
                raise ValueError('Arquivo especial (FIFO/socket/device) no depot é recusado antes da leitura.')
            digest = hashlib.sha256()
            with path.open('rb') as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    digest.update(chunk)
            files.append({'path': path.relative_to(content).as_posix(), 'size': path.stat().st_size, 'sha256': digest.hexdigest()})
    executable = content / relative
    if not executable.is_file():
        raise ValueError('Executável desktop ausente. HTML/ZIP web não é build desktop.')
    with executable.open('rb') as stream:
        magic = stream.read(4)
    accepted = {'windows': magic[:2] == b'MZ', 'linux': magic == b'\x7fELF',
                'macos': magic in (b'\xcf\xfa\xed\xfe', b'\xfe\xed\xfa\xcf', b'\xca\xfe\xba\xbe', b'\xbe\xba\xfe\xca')}
    if platform not in accepted or not accepted[platform]:
        raise ValueError('Cabeçalho do executável não corresponde à plataforma. Não certifica execução ou assinatura.')
    if platform != 'windows' and not os.access(executable, os.X_OK):
        raise ValueError('Executável sem permissão de execução.')
    output.mkdir(parents=True, exist_ok=True)
    for name in ('manifest.json', 'app-preview.vdf'):
        target = output / name
        try:
            mode = os.lstat(target).st_mode
        except FileNotFoundError:
            continue
        if not stat.S_ISREG(mode):
            raise ValueError(f'Saída {name} precisa ser um arquivo comum: links ou destinos especiais são recusados para preservar o alvo apontado.')
    manifest = {'schema': 1, 'state': 'prepared_only', 'platform': platform, 'app_id': app_id,
                'depot_id': depot_id, 'launch_path': launch, 'files': sorted(files, key=lambda f: f['path']),
                'uploaded': False, 'live': False, 'native_runtime_tested': False,
                'limits': ['Header check is not a launch/signing/notarization test.', 'Steam account/AppID/depot ownership not verified.', 'No Steam login, upload or publication executed.']}
    _atomic_write(output / 'manifest.json', json.dumps(manifest, indent=2) + '\n')
    # Preview is pinned on purpose. Setting a branch live is not part of this tool.
    vdf = f'''"AppBuild" {{
 "AppID" "{app_id}"
 "Desc" "CORO SOLTO prepared preview"
 "Preview" "1"
 "ContentRoot" "{content}"
 "BuildOutput" "{output / 'steam-output'}"
 "Depots" {{ "{depot_id}" {{ "FileMapping" {{ "LocalPath" "*" "DepotPath" "." "recursive" "1" }} }} }}
}}
'''
    _atomic_write(output / 'app-preview.vdf', vdf)
    return manifest


def _atomic_write(path, text):
    handle, temporary = tempfile.mkstemp(dir=path.parent, prefix='.' + path.name + '.')
    try:
        with os.fdopen(handle, 'w') as stream:
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('content', 'output', 'launch', 'platform', 'app-id', 'depot-id'):
        parser.add_argument('--' + name, required=True)
    args = parser.parse_args()
    try:
        result = prepare(args.content, args.output, args.launch, args.platform, args.app_id, args.depot_id)
    except (OSError, ValueError) as error:
        parser.exit(1, f'STEAM PREFLIGHT BLOQUEADO: {error}\n')
    print(json.dumps({'state': result['state'], 'files': len(result['files']), 'uploaded': False}))
