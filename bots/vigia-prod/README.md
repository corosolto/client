# vigia-prod (persona: Esbirro 🕵️)

Plantão da produção: cron local que bate no site em produção e roda as
checagens declaradas em `acoes/*.md` — uma por classe de quebra que já
aconteceu (a classe está documentada no corpo de cada ação).

**Advisory, não portão.** Abre issue com evidência (status HTTP, diff,
contagem, saída do Playwright) e faz **dedupe**: se já existe issue aberta pela
mesma checagem (marcador `<!-- vigia: <checagem> -->` no corpo), comenta nela
em vez de abrir outra. Nunca fecha nada.

## Divisão de território com o prod-watch.yml (decisão 16/08)

O Actions fica com o **barato e determinístico** do edge; o vigia fica com as
**semânticas** que precisam da árvore local e de estado persistido. Nenhuma
checagem duplicada:

| quem | o que vigia |
|---|---|
| `prod-watch.yml` (CI, 15 min) | purge pós-deploy, coerência entre módulos do edge, health do banco/schema, dispatch pro crash-fix |
| `vigia-prod` (local, 30 min) | bundle em dia com a **árvore**, manifest de áudio vs baseline, decals-pack vs `DECAL_FILES`, shape do ranking, smoke Playwright contra prod, **build da main e deploy de produção** |

## As checagens

| checagem | classe que fecha | como mede |
|---|---|---|
| `bundle-em-dia` | BUG-55 (correção que não chega ao usuário) | `?v=` do HTML vs revisão do `module-cache.mjs` + bytes de `main.js` servidos vs árvore |
| `manifest-audio` | BUG-19 (drift 306/308) | folhas de string do manifest publicado vs piso (300) e baseline |
| `decals-pack` | grafite sumido (06/08) | amostra HEAD contra `DECAL_FILES` do `textures.js` |
| `ranking-shape` | ranking quebrado fora do CI | 200 + JSON; `disabled` é válido; ligado exige lista |
| `smoke-playwright` | boot travado / tela branca | o MESMO `playwright.smoke.config.mjs` do CI com `BASE_URL` de prod |
| `build-em-dia` | CI vermelho na main sem dono + deploy de produção falhando (a classe do alpha.38) | runs de push na main novas + último deployment Production; drift de gerado → o vigia abre PR de conserto (`npm run docs && npm run arch`) com portão local |

## Uso

```sh
cd bots/vigia-prod
bun plantao.mjs rodada                 # uma rodada e sai (cron/launchd)
bun plantao.mjs poll                   # daemon no intervalo do config
bun plantao.mjs checar manifest-audio  # uma checagem, imprime e sai
GH_DRY_RUN=1 bun plantao.mjs rodada    # issues salvas em estado/dry-run/
```

Credencial: `GH_PAT_FALA` (advisory). Estado em `estado/` (gitignored):
`baseline-audio.json` (primeira rodada estabelece), `dry-run/`.

Falha de PR fica silenciosa por padrão (`comentar_pr_vermelho: false`): o
GitHub já exibe os checks vermelhos, então o Vigia registra o diagnóstico e
continua tentando consertos determinísticos sem empilhar comentários a cada
push. A flag existe apenas para uma campanha temporária de comunicação.

## Cron sugerido

```xml
<!-- ~/Library/LaunchAgents/br.corosolto.vigia.plist -->
<plist version="1.0"><dict>
  <key>Label</key><string>br.corosolto.vigia</string>
  <key>ProgramArguments</key><array>
    <string>bun</string><string>/Users/ruben/game3/bots/vigia-prod/plantao.mjs</string>
    <string>rodada</string>
  </array>
  <key>StartInterval</key><integer>1800</integer>
</dict></plist>
```
