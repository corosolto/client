#!/usr/bin/env python3
import argparse
import re
import tempfile
from pathlib import Path


WORKFLOW = Path('.github/workflows/preview-bot.yml')


def preview_failures(source: str) -> list[str]:
    errors = []
    required = {
        'types: [opened, synchronize, reopened, labeled]': 'evento labeled ausente',
        "github.event.action == 'labeled'": 'preview não exige evento labeled',
        "github.event.label.name == 'preview-autorizado'": 'preview não exige o label correto',
        'repos/$REPO/collaborators/$ACTOR/permission': 'permissão do ator não é consultada',
        'admin|maintain|write': 'papéis autorizados não estão limitados',
        'API_SHA': 'SHA atual do PR não é conferido',
        'EVENT_SHA': 'SHA aprovado pelo evento não é conferido',
        'ref: ${{ github.event.pull_request.head.sha }}': 'checkout não está preso ao SHA aprovado',
        'persist-credentials: false': 'checkout persiste credencial no código do fork',
        'allow-unsafe-pr-checkout: true': 'checkout de fork seguirá quebrado no pull_request_target',
        '--remove-label "preview-autorizado"': 'push novo não revoga aprovação anterior',
        'environment: preview-forks': 'environment de preview ausente',
    }
    for marker, message in required.items():
        if marker not in source:
            errors.append(message)
    if '--add-label "preview-autorizado"' in source:
        errors.append('workflow autoaprova código de fork')
    if 'preview_autorizado=true' in source:
        errors.append('workflow decide autorização sem mantenedor')
    return errors


def supply_failures(workflows: dict[Path, str]) -> list[str]:
    errors = []
    for path, source in workflows.items():
        for action, ref in re.findall(r'uses:\s*([^\s@]+)@([^\s#]+)', source):
            if not re.fullmatch(r'[0-9a-f]{40}', ref):
                errors.append(f'{path}: {action}@{ref} não está preso a SHA')
        for ref in re.findall(r'npm i -g vercel@([^\s]+)', source):
            if not re.fullmatch(r'\d+\.\d+\.\d+', ref):
                errors.append(f'{path}: vercel@{ref} não está preso a versão')
    return errors


def read_workflows(root: Path = Path('.github/workflows')) -> dict[Path, str]:
    return {
        path: path.read_text(encoding='utf-8')
        for pattern in ('*.yml', '*.yaml')
        for path in root.glob(pattern)
    }


def selftest(source: str) -> list[str]:
    mutations = {
        'auto-label': source + '\n# --add-label "preview-autorizado"\n',
        'sem-ator': source.replace('repos/$REPO/collaborators/$ACTOR/permission', 'repos/$REPO'),
        'sem-evento': source.replace("github.event.action == 'labeled'", "github.event.action == 'opened'"),
        'credencial-persistida': source.replace('persist-credentials: false', 'persist-credentials: true'),
        'sha-solto': source.replace('ref: ${{ github.event.pull_request.head.sha }}', 'ref: main'),
        'label-reutilizado': source.replace('--remove-label "preview-autorizado"', '--remove-label "outro"'),
        'action-mutável': re.sub(r'actions/checkout@[0-9a-f]{40}', 'actions/checkout@v4', source),
        'cli-mutável': re.sub(r'vercel@\d+\.\d+\.\d+', 'vercel@latest', source),
    }
    missed = [
        name for name, mutated in mutations.items()
        if not (preview_failures(mutated) + supply_failures({WORKFLOW: mutated}))
    ]
    with tempfile.TemporaryDirectory() as tmp:
        mutant = Path(tmp) / 'mutable-action.yaml'
        mutant.write_text('steps:\\n  - uses: actions/checkout@v4\\n', encoding='utf-8')
        if not supply_failures(read_workflows(Path(tmp))):
            missed.append('extensao-yaml')
    return missed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--selftest', action='store_true')
    args = parser.parse_args()
    source = WORKFLOW.read_text(encoding='utf-8')
    workflows = read_workflows()
    errors = preview_failures(source) + supply_failures(workflows)
    if errors:
        for error in errors:
            print(f'WFS FAIL: {error}')
        return 1
    print('WFS PASS: preview de fork exige aprovação manual presa ao SHA')
    if args.selftest:
        missed = selftest(source)
        if missed:
            print(f'WFS MUTATION FAIL: {", ".join(missed)}')
            return 1
        print('WFS MUTATION PASS: 9/9 mutações ficaram vermelhas')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
