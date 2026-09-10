# Candidatos Mosin, SVD e SKS no runtime alpha.246

**Data:** 10/09/2026  
**Branch:** `codex/viewmodels-catalog-final`  
**Base:** `origin/main@2115d5e2c` (`v2.0.0-alpha.246`)  
**PR:** #572 (draft)

## Resultado

Mosin, SVD e SKS foram integradas como candidatas privadas e opt-in sobre a fundação authored.
As três famílias continuam `ready:false`, a ativação global continua desligada e nenhum GLB
privado entrou no Git. O fallback das 26 armas do alpha.246 permanece o comportamento padrão.

Os gates técnicos, a otimização e o lifecycle fecharam. A revisão das capturas reais **reprovou
a promoção visual**: Mosin e SKS têm uma peça bege dominante que cobre parte relevante da arma;
a SVD ocupa o quadro com antebraços/mangas grandes demais. Esses defeitos ficam expostos para
correção da fonte. Não houve substituição de asset, compensação por outro material ou `ready:true`.

## Interfaces e runtime

- `precisao-final-gates.py` aceita raízes configuráveis de candidato, baseline e mutante, além de
  seleção de arma e output; `pronto` exige T/M/C/F/A e todos os controles vermelhos;
- `optimize_paid_family.mjs` preserva o modo de catálogo e aceita um único
  `--input/--output/--report`, inclusive nomes `*-baked-runtime.glb`, recusando caminhos dentro do
  repositório;
- Mosin usa a família `bolt`, SVD usa `svd` e SKS usa `marksman`, todas com `baked:true` e
  `ready:false`;
- `vmweapon=mosin,svd,sks` abre somente essas armas e continua subordinado a `vmauthored=1`;
- uma decisão de visibilidade mantém exatamente um entre authored e fallback enquanto a máscara
  da luneta não cobriu a tela; Promise obsoleta não pode publicar uma arma;
- a bancada `vmqa=precision` expõe AK, faca, fallback, Mosin, SVD e SKS, além de tiro, recarga e
  ADS, apenas em partida debug.

## Assets privados preservados

| Arma | Fonte | Otimizado | Redução | SHA-256 otimizado |
|---|---:|---:|---:|---|
| Mosin | 24.501.456 B | 5.252.988 B | 78,6% | `e8d73477705e142f79da1032bf2d583f149174df659166e1c5408b6053e4b2d3` |
| SVD | 24.297.360 B | 5.049.432 B | 79,2% | `013c98fa4fdfb586aec9ae4bd4c2ce6c592fddc92628af566b85816d27ff8498` |
| SKS | 24.633.392 B | 5.379.760 B | 78,2% | `c69a70b220c77ef57ecc729ff12b4bc006f4ee29be9a0526ecc2ef42bb209dd8` |

Cada otimização substituiu nove texturas redundantes de braços. Inputs `.pre-optimize`, outputs e
recibos ficam em `/Users/ruben/csbrasil-private-assets/generated/viewmodels`; esse caminho resolve
para o volume privado Zenith e é servido localmente por um symlink interno a `public/private-assets`,
que está ignorado. O manifesto público versiona somente família, tamanho e hashes.

## Evidência técnica

| Gate | Resultado |
|---|---|
| `npm run eval:vm-precision-tools` | 10/10; raiz configurável e output isolado, com mutantes |
| fonte Mosin/SVD/SKS | T/M/C/F/A verdes e 12/12 mutantes rejeitados |
| otimizado Mosin/SVD/SKS | T/M/C/F/A verdes e 12/12 mutantes rejeitados; métricas idênticas à fonte |
| `npm run eval:vm-precision-lifecycle` | 10/10; SVD 30 ciclos, 630 amostras alternando 3:2/16:9 |
| `npm run eval:vm-foundation` | 20/20; 26 armas preservadas e privados ausentes do Git |
| `npm run syntax` | verde com Node 24 |

Recibos locais ignorados:

- fonte: `artifacts/viewmodels/integration/precision/gates-source-{mosin,svd,sks}.json`;
- otimizado: `artifacts/viewmodels/integration/precision/gates-optimized-{mosin,svd,sks}.json`;
- hashes dos recibos por arma, iguais entre fonte e otimizado: Mosin
  `b8543f44203386b32a0dd38baf0d3977c22c6b955120ef0fc50fd7fe1e3c9977`, SVD
  `ad1bbf8bb24ea800a198e93d76ac5e80b91f92de90bf1827d58e8c726b6287ce`, SKS
  `494c6505ab0a80bec1978404d03560e5458cebaba113f541f8d3e24f0a55a10d`.

O primeiro regateamento revelou que a raiz C2 indicada no texto antigo não continha o controle
temporal usado pela fonte: `T_mutante_native` ficou falso. O baseline correto foi recuperado dos
assets preservados de `vm-astra-pistol`; a execução final acima prova os quatro mutantes por arma.
O gate agora impede `pronto:true` quando qualquer controle vermelho não morde.

## Capturas reais e julgamento visual

O capturador abriu o jogo real em `piscina_treta`, sem redimensionar o canvas, e produziu 42 PNGs:

- 1440×960 e 1440×810;
- AK em idle/tiro; faca em idle/contato pesado; fallback de pistola em idle/tiro;
- cada arma de precisão em idle, contato de tiro, contato de recarga, entrada de ADS e ADS coberto.

`capture.json` registra o checkpoint `b824bc58d9d3f57715e9af9e4e1f04678f041a4a`, hashes das
fontes, estado de visibilidade e SHA-256 de cada PNG. Foram registrados 84 erros de localhost
esperados, causados por CORS do backend e recursos opcionais ausentes; nenhum erro WebGL,
`pageerror` ou `[paid-viewmodel]` ocorreu. Hashes dos agregados:

| Artefato local | SHA-256 |
|---|---|
| `artifacts/viewmodels/integration/precision/captures/capture.json` | `8ff01d780c6f87841a4f0e285f076dc20c310da9a431a8a41c70b26035d769e7` |
| `contact-sheet-1440x960.jpg` | `93ec6c1f7683de5df7afb07ba859836b2c7038eae096c90b9c85a79bbb703335` |
| `contact-sheet-1440x810.jpg` | `8320f50af00933399f8c11efc98fe86a6448e0b288eeeeb031dbd018618d56fa` |

SVD permaneceu authored e visível nos seis frames não cobertos de idle/tiro/recarga/entrada ADS,
nos dois aspectos. Nos dois frames `ads-covered`, authored e fallback ficaram ocultos porque a
luneta já cobria a tela, que é o comportamento esperado. Isso fecha a regressão determinística de
desaparecimento; não aprova sua composição visual.

Limites da matriz atual:

- ainda faltam sequências completas de equip início/meio/fim, recarga tática/vazia fim a fim,
  cancelamento, morte/respawn, troca 1P/3P e vídeo sem cortes;
- mecanismo e contatos passam a medição, mas a folha atual não prova qualidade visual suficiente
  em todos os extremos;
- AK, faca e fallback são controles reais, mas esta rodada capturou apenas os estados listados;
- a decisão final precisa de correção dos três enquadramentos e novo aceite humano no jogo.

## Teste local único

Na worktree final:

```sh
cd /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/viewmodels-catalog-final
npm run preview:vm-precision
```

O comando verifica os três hashes privados, monta apenas o symlink ignorado e imprime a URL:

`http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=ak&vmweapon=mosin,svd,sks&vmqa=precision`

O painel local troca arma e aciona tiro, recarga e ADS. Remover `vmauthored`, `vmready` e
`vmweapon` mostra o fallback intacto. Para refazer a evidência, manter o preview ativo e executar
`npm run capture:vm-precision` em outro terminal.

## Próximo passo

Corrigir a fonte dos três candidatos sem alterar sua identidade: reduzir a peça bege de
Mosin/SKS ao elemento real que ela representa, reenquadrar mangas/antebraços da SVD e recapturar a
matriz completa. Se a correção exigir substituir asset, material ou mecanismo, ela precisa voltar
à lane de produção; esta integradora permanece fail-closed. Nenhuma família deve receber
`ready:true` antes de nova folha e aprovação humana.
