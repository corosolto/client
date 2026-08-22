#!/usr/bin/env python3
import argparse
import re
import tempfile
from pathlib import Path


WORKFLOW = Path('.github/workflows/preview-bot.yml')


def preview_failures(source: str) -> list[str]:
    """Contrato do preview de fork POR APROVAÇÃO (desenho antigo).

    Vale enquanto o `preview-bot.yml` tiver o job que publica: ele roda `vercel build`,
    isto é, executa o build DO FORK com o token no ambiente, e por isso depende de um
    mantenedor revisar o SHA. Quando o preview passou a ser build-sem-segredo +
    deploy-sem-código (ver `separacao_failures`), este job deixou de ser necessário —
    mas enquanto existir, ele tem de manter TODAS as travas.
    """
    if 'vercel deploy' not in source:
        return []          # o job de publicação saiu do arquivo: nada a guardar aqui
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
    if '--add-label' in source and 'preview-autorizado' in source:
        errors.append('workflow autoaprova código de fork')
    if 'preview_autorizado=true' in source:
        errors.append('workflow decide autorização sem mantenedor')
    return errors


def separacao_failures(build: str, deploy: str) -> list[str]:
    """Contrato do preview de fork POR SEPARAÇÃO (desenho de 22/08).

    A aprovação manual existia porque UM job fazia as duas coisas: rodava o build do
    fork E tinha o token. Separando, os dois lados ficam seguros sozinhos e ninguém
    precisa clicar:

    PRV1 quem COMPILA roda código do fork e não recebe segredo — `pull_request` (não
         `pull_request_target`), e nenhuma referência a `secrets.` no arquivo;
    PRV2 quem PUBLICA roda no contexto base (`workflow_run`), que é o que lhe dá o
         segredo mesmo vindo de fork;
    PRV4 quem PUBLICA não interpola `${{ }}` dentro de `run:`. A expressão é substituída
         no TEXTO do script antes do shell existir, então valor com aspas ou `$(...)` vira
         comando — e no caminho de deploy os valores vêm de fora (o número do PR atravessa
         um artefato escrito por job que rodou código do fork, a URL é saída de comando).
         O CodeQL pegou exatamente isso aqui, como injeção crítica, antes do merge.
    PRV3 quem PUBLICA não executa NADA do PR: sem checkout da branch do fork, sem
         `npm ci`, sem `npm run`, e o deploy é `--prebuilt` (só envia arquivo).
         Furar isto devolve o token para as mãos de quem abriu o PR.
    """
    errors = []
    if not build or not deploy:
        return ['preview por separação incompleto: falta preview-build.yml ou preview-deploy.yml']

    # Só a INSTRUÇÃO conta. Os dois arquivos explicam em comentário o que NÃO fazem
    # ("não roda npm ci", "não usa pull_request_target") e ler o comentário como se
    # fosse código acusaria justamente quem documentou a trava.
    def codigo(texto: str) -> str:
        return '\n'.join(l for l in texto.splitlines() if not l.lstrip().startswith('#'))

    build, deploy = codigo(build), codigo(deploy)

    if 'pull_request_target' in build:
        errors.append('PRV1 o job que COMPILA usa pull_request_target — passaria a enxergar segredo rodando código do fork')
    if 'pull_request:' not in build:
        errors.append('PRV1 o job que COMPILA não roda em pull_request')
    if 'secrets.' in build:
        errors.append('PRV1 o job que COMPILA referencia `secrets.` — ele roda código do fork e não pode ter o que roubar')

    if 'workflow_run:' not in deploy:
        errors.append('PRV2 o job que PUBLICA não roda em workflow_run — sem contexto base não há segredo em PR de fork')
    if 'secrets.VERCEL_TOKEN' not in deploy:
        errors.append('PRV2 o job que PUBLICA não usa o token da Vercel')

    # PRV4: `${{ }}` só pode aparecer em `env:`/`with:`/`if:`, nunca dentro do script.
    dentro_de_run = False
    for linha in deploy.splitlines():
        despido = linha.strip()
        if re.match(r'run:\s*\|', despido):
            dentro_de_run = True
            continue
        if dentro_de_run:
            # o bloco acaba quando a indentação volta para o nível da chave do passo
            if despido and not linha.startswith('          '):
                dentro_de_run = False
            elif '${{' in linha:
                errors.append(f'PRV4 `{despido[:60]}` interpola expressão dentro de run: — passe por env:')

    if '--prebuilt' not in deploy:
        errors.append('PRV3 o deploy não é --prebuilt: estaria construindo, e construir é executar código do PR')
    for proibido, motivo in (
        ('actions/checkout', 'faz checkout — traria código do PR para o job que tem o token'),
        ('npm ci', 'roda npm ci — executaria script do PR'),
        ('npm run', 'roda npm run — executaria script do PR'),
        ('vercel build', 'roda vercel build — é o build do fork com o token no ambiente'),
    ):
        if proibido in deploy:
            errors.append(f'PRV3 o job que PUBLICA {motivo}')
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


BUILD = Path('.github/workflows/preview-build.yml')
DEPLOY = Path('.github/workflows/preview-deploy.yml')


def _ler(p: Path) -> str:
    return p.read_text(encoding='utf-8') if p.exists() else ''


def selftest(source: str) -> list[str]:
    build, deploy = _ler(BUILD), _ler(DEPLOY)
    separacao = {
        'compila-com-segredo': (build + '\n        env:\n          X: ${{ secrets.VERCEL_TOKEN }}\n', deploy),
        'compila-com-target': (build.replace('  pull_request:', '  pull_request_target:'), deploy),
        'publica-sem-run': (build, deploy.replace('  workflow_run:', '  schedule:')),
        'publica-faz-checkout': (build, deploy + '\n      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683\n'),
        'publica-constroi': (build, deploy.replace('--prebuilt', '')),
        'publica-interpola': (build, deploy.replace('gh pr comment "$PR_NUM"', 'gh pr comment "${{ steps.pr.outputs.numero }}"')),
    }
    missed_sep = [n for n, (b, d) in separacao.items() if not separacao_failures(b, d)]

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
    # As mutações acima descrevem o contrato ANTIGO (preview por aprovação). Quando o
    # job que publicava sai do arquivo, elas deixam de ter alvo — testá-las ali seria
    # exigir mordida de uma régua que não tem mais o que guardar. O contrato novo é
    # medido pelas mutações de `separacao` logo acima.
    antigo_vivo = 'vercel deploy' in source
    missed = [
        name for name, mutated in mutations.items()
        if antigo_vivo and not (preview_failures(mutated) + supply_failures({WORKFLOW: mutated}))
    ]
    # Fornecimento (action e CLI presas) vale sempre, e o alvo passou a ser os dois
    # arquivos novos: um tem as actions, o outro tem a CLI da Vercel.
    fornecimento = {
        'action-mutável': (BUILD, re.sub(r'actions/checkout@[0-9a-f]{40}', 'actions/checkout@v4', build)),
        'cli-mutável': (DEPLOY, re.sub(r'vercel@\d+\.\d+\.\d+', 'vercel@latest', deploy)),
    }
    missed += [n for n, (alvo, mutado) in fornecimento.items() if not supply_failures({alvo: mutado})]
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
    errors = (preview_failures(source)
              + separacao_failures(_ler(BUILD), _ler(DEPLOY))
              + supply_failures(workflows))
    if errors:
        for error in errors:
            print(f'WFS FAIL: {error}')
        return 1
    print('WFS PASS: quem compila código de fork não tem segredo; quem tem segredo não executa código de fork')
    if args.selftest:
        missed = selftest(source)
        if missed:
            print(f'WFS MUTATION FAIL: {", ".join(missed)}')
            return 1
        print('WFS MUTATION PASS: 9/9 mutações ficaram vermelhas')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
