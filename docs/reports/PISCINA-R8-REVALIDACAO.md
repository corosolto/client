# Piscina da Treta — revalidação sobre `main`

## Estado e escopo

- PR histórico [#566](https://github.com/corosolto/client/pull/566) foi mergeado em
  22/09/2026 às 01:18 UTC com o head antigo `1e7049994`. Como um PR mergeado não aceita
  atualização de base/head, esta revalidação segue no draft
  [#612](https://github.com/corosolto/client/pull/612), contra `main`.
- Branch/worktree: `codex/piscina-rework-stack` em
  `/Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/piscina-rework-stack`.
- `origin/main` inicial: `7bb2707ef576260b30ceb88c5973b9f6618684cd`; atualização
  final após o merge do Carandiru: `60ad7501323ef076263f645bfca341e2454fce6b`.
- Integração preservou o histórico empilhado por merge, mas o estado final contra `main`
  contém somente o mapa, contrato, régua e evidência da Piscina. Nenhum asset Mint/privado,
  material compartilhado ou runtime compartilhado foi incluído.
- `map_uv.js` e `applyAniso`, ausentes na `main`, foram substituídos por uma fábrica UV local
  ao mapa. A sombra usa o orçamento compartilhado já existente por `aplicaSombraSol`.

## Resultado técnico

### Corredores, proteção, visão e navegação

`piscina-rework-check.mjs` passou PIS1/PIS2/PIS3/PIS4/PIS6 e mordeu 8/8 mutantes:
`sem-corredor`, `boca-unica`, `cobertura-submersa`, `ilha-solta`,
`sem-anteparo-spawn`, `porta-estreita`, `spawn-deslocado` e `sem-ambiencia`.

- corredor oeste: 9 nós, duas entradas sul e duas norte, conectado;
- corredor leste: 9 nós, duas entradas sul e duas norte, conectado;
- três famílias de rota e mínimo de duas rotas separadas entre spawn/objetivos;
- vestiários norte/sul: quatro anteparos e três portais de 3 m cada;
- salão: zero cobertura submersa e zero ilha solta nas faixas de spawn;
- ambiência do mundo: indoor, água, hum posicional e splash.

`piscina-stack-evidence.mjs` mediu 122 nós e 593 arestas. As rotas centrais/oeste/leste
têm 41,32 / 65,79 / 70,59 m e passam a cápsula de 0,38 m. As 24 combinações de quatro
spawns por time contra três objetivos são alcançáveis. `eval:mapcontrato`, `eval:ctfwin`,
`eval:webgl`, `docs:check` e o build Astro passaram.

O diagnóstico genérico `map-check` ainda reporta MAP5=99 m e razão de props `0x` nos
quadrantes centrais. Isto corresponde ao tanque aberto, decisão central do layout, e não
foi escondido nem chamado de verde. A aprovação depende de o salão aberto funcionar em
jogo junto dos dois flancos protegidos.

### Bots 5x5 e 8x8

Simulação determinística de 60 s, nove sementes, usando o `Game` e `_updateBot` reais:

| modo | bots | stuck | spin roam | eficiência |
|---|---:|---:|---:|---:|
| DM 5x5 | 9 | 1,911% | 0,016 | 0,130 |
| DM 8x8 | 15 | 1,133% | 0,012 | 0,121 |
| CTF 5x5 | 9 | 2,011% | 0,027 | 0,127 |
| CTF 8x8 | 15 | 0,589% | 0,011 | 0,119 |

Os quatro casos ficaram abaixo do teto de 4% usado no programa de mapas.

### WebGL real e orçamento visual

Chrome WebGL2/ANGLE Metal, Apple M4 Pro, sem software fallback e sem erro JS. Foram
capturados med/low, 5x5/8x8, em 1200x800 (3:2) e 1600x900 (16:9): 56 quadros no total.
Os recibos confirmam 9/15 bots reais.

Depois do lote map-local, os 16 ensaios DM/CTF ficaram com p95 entre 9,9 e 10,1 ms.
Três primeiras passagens tiveram uma pausa fria isolada; cada célula repetida em Chrome
novo teve máximo 10,4 ms e zero quadro acima de 100 ms.

- 3:2 DM med: 5x5 `519 calls / 931.333 tris`; 8x8 `658 / 1.051.113`;
- 16:9 DM med: 5x5 `618 / 923.357`; 8x8 `704 / 1.079.813`;
- 3:2 CTF med: 5x5 `540 / 934.593`; 8x8 `633 / 1.072.559`;
- 16:9 CTF med: 5x5 `582 / 924.993`; 8x8 `642 / 1.072.573`;
- todos os casos low ficaram abaixo de `539 calls / 511.494 tris`.

A contraprova fixa com 15 bots mede a mesma vista em médio: candidato `460 calls /
988.201 tris` e `?piscinaBatch=0` `727 / 988.080`; são 267 chamadas removidas (36,7%)
sem esconder bots nem mudar qualidade. O CENA oficial de 30 s ficou verde em `429 /
785.902`, contra `860 / 870.000`. A carga densa 8x8 ainda passa de 870 mil triângulos:
quase todo esse custo é personagem + arma + sombra; a geometria estática do mapa tem
4.328 triângulos. Cortá-lo nesta lane exigiria reduzir elenco/sombra compartilhada ou
achatar a iluminação, opções rejeitadas por escopo e qualidade.

O layout assado foi regenerado somente para `piscina_treta`: cobertura `83,3%`
(`758/910`, meta `76%`). O mutante que remove só essa entrada cai para `31,5%`
(`287/910`) e reprova, provando que o verde vem do bake atual.

No primeiro baseline sobre `7bb2707ef`, `eval:qualmapas` passou 4/4 e o mutante de sombra
literal foi mordido. A `main` final `60ad75013` introduziu uma falha global alheia à
Piscina: `map_penitenciaria.js` voltou a usar `shadow.mapSize.set` fora de
`mapquality.js`, reprovando QMAP1/QMAP3. A Piscina continua usando `aplicaSombraSol` e
esta lane não alterou o mapa da Penitenciária. No recorte da Piscina, `texel-check` mediu
mediana/p05/p95 de 128 px/m, dispersão p95 1x e 4% da área
abaixo de 64 px/m. Permanecem duas dívidas: máximo/mediana de 6,5x num cilindro e 6% da
área texturizada sem medida (206 malhas, principalmente decalques).

O `check:deploy` local também para em UIR15 (`eval:redesign`). A contraprova no checkout
destacado da própria `main` `60ad75013` reproduz a mesma falha: o resultado do personagem
não satisfaz a exigência estática atual. O diff da Piscina não toca `game.js`, DOM ou CSS;
portanto esse vermelho é dívida herdada de UI, não regressão nem escopo desta lane.

O verificador estático `ambience-registry-check --map=piscina_treta` continua vermelho
porque não reconhece a ambiência declarada diretamente no mundo. A régua causal do mapa
confirma água + hum + splash e o mutante `sem-ambiencia` a derruba. O playtest humano
deve ouvir o mapa com áudio ligado; as capturas automatizadas usam `--mute-audio`.

## Evidência e reprodução

- URL local: `http://127.0.0.1:8152/?debug=1&map=piscina_treta&auto=P,mst&perfilauto=0&ctf=1`
- fonte local/servida: `b3e55b792cd2005d82f75da88a87fae574123109c3e6c863e2ebf39b73fef213`;
- contato 3:2: `artifacts/piscina-r9-20260922/contact-32.jpg`
  (`37c773c67c37272e736404542b657ce6c4f4f6d7e2c4d8d46bc6415139a9b484`)
- contato 16:9: `artifacts/piscina-r9-20260922/contact-169.jpg`
  (`240b53bd6895330a6ae67ee2ea539a117209d5fb9ca44ac228eedbcd46698e84`)
- recibos 3:2: `artifacts/piscina-r9-20260922/browser-32/summary.json`
  (`d062ee624c955ec5a9e8e291c80e644a34267c1d9295f6be9a96324da34a1e5f`)
- recibos 16:9: `artifacts/piscina-r9-20260922/browser-169/summary.json`
  (`f58e0e77624f9cbcc95e833be352096ee8d2958fb1b909e26c177f610e6e354a`)
- matriz espacial: `artifacts/piscina-r8-20260922/spatial.json`.
- performance: `artifacts/piscina-r8-20260922/perf-*` e
  `artifacts/piscina-r8-20260922/perf-ctf-*`.

Comandos principais:

```bash
PATH=/opt/homebrew/bin:/usr/bin:/bin node tools/eval/piscina-rework-check.mjs
PATH=/opt/homebrew/bin:/usr/bin:/bin node tools/eval/piscina-rework-check.mjs --mutantes
PATH=/opt/homebrew/bin:/usr/bin:/bin node tools/eval/piscina-stack-evidence.mjs
PATH=/opt/homebrew/bin:/usr/bin:/bin npm run eval:mapcontrato
PATH=/opt/homebrew/bin:/usr/bin:/bin npm run eval:qualmapas
PATH=/opt/homebrew/bin:/usr/bin:/bin npm run eval:ctfwin
PATH=/opt/homebrew/bin:/usr/bin:/bin npm run build
```

## Feedback humano necessário

1. Jogar DM e CTF 8x8 e confirmar se os três portais de cada vestiário permitem sair
   sem virar um gargalo de spawn.
2. Testar os corredores oeste/leste como rota de flanco e confirmar se há proteção útil
   sem virar corredor seguro demais.
3. Decidir se a piscina central deve continuar aberta e dominante ou se ainda falta uma
   peça baixa de proteção que não recrie o labirinto já rejeitado.
4. Ouvir água, hum indoor e splash com áudio ligado.
5. Julgar a linguagem branca/azul nas capturas 3:2; tecnicamente legível, mas ainda cabe
   ao dono decidir se o espaço parece vivo o bastante.

PIS7 continua pendente do aceite visual/jogável. O CENA oficial e o orçamento de chamadas
estão verdes; os triângulos do caso denso 8x8 permanecem dívida explícita do elenco/sombra.
Não há autorização para merge/deploy nesta lane.
