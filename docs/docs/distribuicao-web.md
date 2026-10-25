# Distribuição web

O workflow `distribution-web-artifact` gera um candidato ZIP a partir do build
Astro existente. O build é manual, usa token somente de leitura e não recebe
credenciais de portal. O resultado fica como artefato do Actions por três dias.
PRs que alteram o empacotador rodam somente os testes locais, sem gerar upload.

## Gerar e conferir localmente

Use Node 22 e Python 3 em um checkout isolado, sem `.env` de produção.

```bash
npm ci
bash scripts/fetch-audio.sh
bash scripts/fetch-decals.sh
npm run strip:decalbg
npm run assert:assets
npm run build
python3 -m unittest discover -s tools/distribution-web -p 'test_*.py' -v
python3 tools/distribution-web/package.py build
python3 tools/distribution-web/package.py verify
python3 tools/distribution-web/package.py verify --require-profile itch
```

Com o slot único de browser livre, rode a prova de subpasta em Chrome:

```bash
./tools/eval/with-browser-lock.sh node tools/distribution-web/smoke.mjs \
  --site=dist/portal/site --out=dist/portal-smoke
```

A prova usa iframe em duas origens locais, recusa a máscara de assets na raiz,
bloqueia rede externa e WebSockets, espera partida solo `live` e salva captura
1200×800 com relatório. O gate exige zero erro de página e zero HTTP de asset
falhando; `/api` é registrado à parte. Ela usa entrada `debug/auto` e não prova
interação humana, áudio ouvido, pointer lock ou multiplayer.

A saída padrão é `dist/portal/`: `site/`, `corosolto-web.zip`, `manifest.json` e
`report.json`. O ZIP contém `index.html` na raiz. A saída deve ser nova; para outra
rodada use `--output dist/portal-r2`. O script recusa reaproveitar pasta existente.

O manifesto registra caminho, tamanho e SHA-256 de cada arquivo. O verificador
confere os bytes dentro do ZIP, nomes e orçamento recalculado. O relatório registra
a versão e o HEAD do empacotador; isso não atesta, sozinho, a origem de um
`--source` fornecido à mão. O workflow produz build e pacote no mesmo checkout.
Guarde o log do build junto do artefato quando fizer uma rodada local.

## O que o pacote adapta

O empacotador copia o HTML inicial, as pastas de assets listadas em
`tools/distribution-web/package.py` e as folhas/imagens da raiz. Páginas do site,
SSR, APIs e metadados mobile ficam fora. Os assets do build são preservados;
esta etapa ainda não escolhe um subconjunto de mapas ou personagens.

Somente nas cópias geradas, troca o `base` do HTML por `./`, resolve referências
absolutas dos assets conhecidos e calcula caminhos CSS relativos à própria folha.
Imports de módulo absolutos são recusados para evitar resolução silenciosamente
incorreta. O código fonte do jogo não é alterado. Cada arquivo transformado tem
hash antes/depois no relatório.

Isso prepara o candidato para QA em subpasta. Não comprova partida, áudio,
pointer lock, login ou multiplayer. Os caminhos `/api` e links de navegação do
site continuam no código e precisam de integração própria para o portal.
`publish_ready` permanece `false`; nenhum teste de orçamento o promove.

## Perfis de upload

Os valores estão centralizados em `package.py`. Foram conferidos em 25/10/2026;
revise as fontes antes de uma submissão. MB é interpretado como 1.000.000 bytes,
um limite conservador enquanto o portal não publica a unidade em bytes.

| Perfil | Verificação implementada | Fonte oficial |
|---|---|---|
| itch | Até 1.000 arquivos, 500 MB extraídos, 200 MB por arquivo, caminho de até 240 caracteres | [HTML5 e requisitos do ZIP](https://itch.io/docs/creators/html5) |
| crazygames | Até 1.500 arquivos e 250 MB totais; sem SDK validado, todo o pacote conta no limite inicial de 50 MB | [Requisitos técnicos](https://docs.crazygames.com/requirements/technical/) |
| generic | Integridade do candidato; nenhum aceite de portal presumido | Relatório local |

`--require-profile` sai com código 2 se o orçamento não couber. O workflow preserva
os artefatos também quando esse gate fica vermelho. Com `generic`, verde significa
pacote gerado e íntegro; leia o relatório antes de concluir que cabe no portal.
O limite móvel de 20 MB do CrazyGames, SDK, políticas de conteúdo e avaliação da
plataforma continuam fora do aceite deste empacotador.

## Plano de itch.io sem envio

```bash
python3 tools/distribution-web/itch.py \
  --package dist/portal --target exemplo/corosolto:html5 \
  --version 2.1.0-alpha.126 --dry-run
```

O adapter exige `--dry-run`, confere o ZIP e imprime o argv proposto. Não invoca
butler, não acessa rede e não lê segredo. O destino acima é ilustrativo. O
relatório continua mostrando bloqueios de tamanho e QA pendente.

[`butler push` publica assim que o upload termina](https://itch.io/docs/butler/pushing.html).
Não há modo de publicação neste corte. Para uma automação futura, mantenha a etapa
com credencial separada do build, restrita ao artefato revisado e a um environment
com aprovação do operador. A variável oficial é
[`BUTLER_API_KEY`](https://itch.io/docs/butler/login.html); nunca grave o valor no
manifesto, log, comando ou repositório. A página itch precisa existir e ser
configurada como HTML Game antes da liberação.

## CrazyGames e outros portais

CrazyGames recebe o ZIP após os gates de tamanho e QA. O adapter de SDK, consentimento,
contas e monetização precisa de trabalho próprio no jogo; nenhum deles é simulado
por este workflow. [Basic Launch e Full Launch têm exigências diferentes](https://docs.crazygames.com/faq/).

O mesmo candidato permite avaliação técnica de outros portais. Cada plataforma
precisa de perfil, revisão de contrato, SDK quando exigido e teste real. Poki declara
[exclusividade web na parceria](https://developers.poki.com/guide/working-with-poki),
o que exige decidir a estratégia antes de prometer distribuição simultânea. Esta
entrega não abre contas nem aceita contratos.

## Critério para liberar uma submissão

1. SHA do build e manifesto íntegros, licença/proveniência dos assets conferidas.
2. Perfil do portal verde, sem aumentar teto para acomodar o pacote.
3. Boot e partida solo em iframe de outra origem, servido apenas em subpasta;
   registrar falhas de rede, tela, input, áudio, fullscreen e pointer lock.
4. Login, APIs e multiplayer avaliados no host final; nenhuma origem presumida.
5. Conteúdo, SDK, página e criativos aprovados pelo operador.
6. Artefato exato autorizado antes do upload. Aceite técnico local não é publicação.
