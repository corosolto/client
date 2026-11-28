#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
import re
from package import verify


def plan(directory, target, version):
    if not re.fullmatch(r'[a-z0-9][a-z0-9_-]*/[a-z0-9][a-z0-9_-]*:[a-z0-9][a-z0-9_-]*', target):
        raise ValueError('destino deve ser usuario/jogo:canal, sem espaços ou opções')
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9._+-]{0,99}', version):
        raise ValueError('versão inválida')
    report = verify(directory)
    if report['portal'] != 'itch':
        raise ValueError(f"pacote gerado para {report['portal']}, não para itch")
    return {'dry_run': True, 'executed': False, 'publish_ready': report['publish_ready'],
            'kind': report['kind'], 'budget': report['profiles']['itch'], 'artifact_sha256': report['archive']['sha256'],
            'argv_for_operator_after_review': ['butler', 'push', str(Path(directory).absolute() / report['archive']['path']), target, '--userversion', version],
            'credential_environment': 'BUTLER_API_KEY',
            'warning': 'butler push publica o build. Este adapter somente planeja; nenhum subprocesso, rede ou leitura de segredo.',
            'source': 'https://itch.io/docs/butler/pushing.html'}


def main():
    parser = argparse.ArgumentParser(description='Plano local do upload itch.io; sem modo de publicação.')
    parser.add_argument('--package', required=True, type=Path)
    parser.add_argument('--target', required=True)
    parser.add_argument('--version', required=True)
    parser.add_argument('--dry-run', required=True, action='store_true')
    args = parser.parse_args()
    print(json.dumps(plan(args.package, args.target, args.version), ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
