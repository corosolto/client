# Distribuição web

`tools/distribution-web/package.py` gera o ZIP de upload para portais (itch.io e
CrazyGames), com manifesto de hashes e relatório de orçamento. Nunca publica: o envio é
do dono. O workflow `distribution-web-artifact` roda os testes e empacota o wrapper itch
em todo PR que toca o empacotador ou `tools/portal/`; o `workflow_dispatch` gera o pacote
pedido e o deixa como artefato do Actions por três dias, sem credencial de portal.

## Dois tipos de pacote

| `--kind` | fonte | o que sobe |
|---|---|---|
| `wrapper` (padrão) | `tools/portal/<portal>/` | o `index.html` que embeda `https://www.corosolto.com.br/` em iframe ([`tools/portal/README.md`](https://github.com/corosolto/client/blob/main/tools/portal/README.md)). Jogo, multiplayer e contas continuam no site. |
| `site` | `dist/client` (build Astro) | o jogo inteiro servido pelo portal, com caminhos reescritos para subpasta. |

Hoje só o itch tem wrapper. `--kind wrapper --portal crazygames` falha com mensagem
dizendo isso; para a CrazyGames, o Basic Launch aceita a URL do site em iframe direto
no portal deles, sem ZIP.

## Teto de 250 MB

Todo pacote passa por um teto único de **250.000.000 bytes**: é o limite total da
CrazyGames ([requisitos técnicos](https://docs.crazygames.com/requirements/technical/))
e o orçamento da issue #1110. O teto é medido três vezes: na soma dos arquivos da
fonte (antes de copiar qualquer byte), nos bytes extraídos do pacote final e no ZIP.
Acima dele o comando sai com código 2, apaga a saída parcial e diz quanto passou. Saída
real de 27/11/2026, sobre um `dist/client` local (build `2.0.0-alpha.175`):

```text
ERRO: teto de 250 MB excedido (bytes da fonte): 959994122 bytes = 960.0 MB > 250000000 bytes. É o limite total da CrazyGames (issue #1110): corte ou reencode assets, não suba o teto.
```

Não suba `TETO_BYTES` para acomodar o build: o caminho é cortar e reencodar assets
(decisão do dono registrada na #1110). O áudio não é o único peso: no `main` de
27/11/2026, `public/models` tem 434 MB e `public/img` 241 MB (`du -sm`) antes dos 208 MB
do `audio-pack`. Enquanto isso, o pacote `site` não cabe em portal nenhum.

## Gerar e conferir localmente

Wrapper itch (segundos, sem `npm ci`):

```bash
python3 -m unittest discover -s tools/distribution-web -p 'test_*.py' -v
python3 tools/distribution-web/package.py build --portal itch
python3 tools/distribution-web/package.py verify --portal itch
```

Saída em `dist/portal/itch-wrapper/`: `site/`, `corosolto-itch.zip`, `manifest.json` e
`report.json`. O ZIP tem `index.html` na raiz, mais `LICENSE` (AGPL) e `SOURCE.txt`
com o SHA do código. A saída deve ser nova; o script recusa reaproveitar pasta.

Pacote `site`, em checkout isolado, com Node 22 e sem `.env` de produção:

```bash
npm ci
bash scripts/fetch-audio.sh
bash scripts/fetch-decals.sh
npm run strip:decalbg
npm run assert:assets
npm run build
python3 tools/distribution-web/package.py build --portal itch --kind site
```

Com o slot único de browser livre, a prova de subpasta roda em Chrome sobre o ZIP exato:

```bash
./tools/eval/with-browser-lock.sh node tools/distribution-web/smoke.mjs \
  --package=dist/portal/itch-site --out=dist/portal-smoke
```

A prova verifica e extrai o ZIP para uma pasta temporária e serve esses bytes em
iframe de outra origem, recusa a máscara de assets na raiz, bloqueia rede externa e
WebSockets, espera partida solo `live` e salva captura 1200×800 com relatório. Exige
zero erro de página e zero HTTP de asset falhando; `/api` é registrado à parte. Usa
entrada `debug/auto` e não prova interação humana, áudio, pointer lock ou multiplayer.
Só aceita pacote `site`: o wrapper embeda produção, e quem o amarra é o
`eval:portalembed`.

## O que o pacote `site` adapta

O empacotador copia o HTML inicial, as pastas de assets listadas em `package.py` e as
folhas/imagens da raiz. Páginas do site, SSR e APIs ficam fora. Somente nas cópias
geradas, troca o `base` do HTML por `./`, resolve referências absolutas dos assets
conhecidos (inclusive no `site.webmanifest`) e calcula caminhos CSS relativos à própria
folha. Imports de módulo absolutos são recusados para evitar resolução silenciosamente
incorreta. O código fonte do jogo não é alterado; cada arquivo transformado tem hash
antes/depois no relatório.

O rewriter usa expressões regulares para os padrões examinados; não é um parser geral
de JavaScript. Os caminhos `/api` e links de navegação do site continuam no código e
precisam de integração própria para o portal. `publish_ready` permanece `false`.

## Orçamento por portal

Além do teto, `build` e `verify` reprovam (código 2) quando o pacote estoura o perfil do
portal escolhido. Valores centralizados em `package.py`, conferidos em 25/10/2026; MB é
1.000.000 bytes.

| Perfil | Verificação | Fonte oficial |
|---|---|---|
| itch | até 1.000 arquivos, 500 MB extraídos, 200 MB por arquivo, caminho de até 240 caracteres | [HTML5 e requisitos do ZIP](https://itch.io/docs/creators/html5) |
| crazygames | até 1.500 arquivos e 250 MB totais; sem SDK validado, todo o pacote conta no limite inicial de 50 MB | [Requisitos técnicos](https://docs.crazygames.com/requirements/technical/) |

O verificador confere bytes, nomes, teto e orçamento recalculados a partir do ZIP; um
relatório adulterado não passa. O limite móvel de 20 MB da CrazyGames, SDK, políticas de
conteúdo e avaliação da plataforma ficam fora do aceite deste empacotador.

## Plano de itch.io sem envio

```bash
python3 tools/distribution-web/itch.py \
  --package dist/portal/itch-wrapper --target exemplo/corosolto:html5 \
  --version 2.1.0-alpha.158 --dry-run
```

O adapter exige `--dry-run`, confere o ZIP, recusa pacote gerado para outro portal e
imprime o argv proposto. Não invoca butler, não acessa rede e não lê segredo. O destino
acima é ilustrativo. [`butler push` publica assim que o upload termina](https://itch.io/docs/butler/pushing.html);
não há modo de publicação neste corte. A variável oficial é
[`BUTLER_API_KEY`](https://itch.io/docs/butler/login.html); nunca grave o valor no
manifesto, log, comando ou repositório.

## Critério para liberar uma submissão

1. SHA do build e manifesto íntegros, licença/proveniência dos assets conferidas.
2. Teto e perfil do portal verdes, sem aumentar limite para acomodar o pacote.
3. QA no portal em rascunho: boot, tela, input, áudio, tela cheia e pointer lock.
4. Login, APIs e multiplayer avaliados no host final; nenhuma origem presumida.
5. Conteúdo, SDK, página e criativos aprovados pelo dono.
6. Artefato exato autorizado antes do upload. Aceite técnico local não é publicação.
