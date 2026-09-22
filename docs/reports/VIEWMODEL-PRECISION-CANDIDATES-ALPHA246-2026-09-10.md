# Candidatos Mosin, SVD e SKS no runtime alpha.246

**Data:** 10/09/2026  
**Branch:** `codex/viewmodels-catalog-final`  
**Base:** `origin/main@2115d5e2c` (`v2.0.0-alpha.246`)  
**PR:** #572 (draft)

## Resultado

Mosin, SVD e SKS foram integradas como candidatas privadas e opt-in sobre a fundação authored.
As três famílias continuam `ready:false`, a ativação global continua desligada e nenhum GLB
privado entrou no Git. O fallback das 26 armas do alpha.246 permanece o comportamento padrão.

Os gates técnicos, a otimização e o lifecycle fecharam. A Phase 3 corrigiu na fonte a peça bege
dominante de Mosin/SKS, a terminação das mangas da SVD e o desaparecimento das três armas durante
`inspect`. A nova revisão interna das capturas não encontrou a dominância anterior, mas a promoção
continua aguardando aceite humano no jogo. Não houve substituição de asset nem `ready:true`.

## Correções causais da Phase 3

- Mosin/SKS: `JOINTS_0` guarda o slot dentro de `skin.joints`, não o índice global do nó. O builder
  agora seleciona o slot correto e limita estojos ao envelope físico; candidatos chegam a 55 mm e
  o mutante de índice errado chega a 181 mm e reprova.
- SVD: geometria, pesos e joints das mangas foram preservados. Um gradiente de vertex alpha no
  terço do ombro elimina os anéis abertos que dominavam a câmera; a borda termina em alpha 0. O
  mutante sem alpha permanece opaco e reprova. Ocupação medida: 14,5% em 3:2 e 11,8% em 16:9.
- Contato: o polegar direito da SVD recebeu uma correção local de 11,8 × -5,3 × 0,3 mm somente no
  contato da recarga. No fim do `inspect`, o SKS corrige primeiro `hand_l` e depois calibra
  `ring_01_l`; o pedido de 49,5 × 18,7 × -1,85 mm no espaço da hierarquia produz cerca de 10 mm de
  deslocamento no vértice observado. Ambos fecharam `visivel_gt3mm=0` sem esconder mecanismo ou
  receptor; o código registra os coeficientes reproduzíveis por osso.
- `inspect`: clipes rígidos agora carregam a pose idle real e rotacionam ao redor do pivô da arma.
  Antes, tracks ausentes voltavam ao bind e a rotação na origem tirava o conjunto do quadro.
  Seis capturas adicionais mostram as três armas no ponto de maior rotação, nos dois aspectos.

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
- o build recusa o symlink do preview privado; `cleanup:vm-precision` desmonta somente esse link
  antes de gerar `dist`.

## Assets privados preservados

| Arma | Fonte | Otimizado | Redução | SHA-256 otimizado |
|---|---:|---:|---:|---|
| Mosin | 24.548.388 B | 5.298.504 B | 78,4% | `94386beceefde96a481458c296f616178ae56f8a1a70b8ae63be8697841655a2` |
| SVD | 24.433.936 B | 5.183.236 B | 78,8% | `08058912ca43d521675c4294216dedc3bbc1a2b7b906440acb53db691be5faea` |
| SKS | 24.729.928 B | 5.473.300 B | 77,9% | `15bf12eb5663a03c49ff09edc31310bfe844416c3a2c7f9f3eec15f316ff8470` |

Cada otimização substituiu nove texturas redundantes de braços. Mosin/SVD ficam em
`/Users/ruben/csbrasil-private-assets/generated/viewmodels-phase3/final4-*`; o SKS final fica em
`final5c-*`. A raiz combinada é `viewmodels-phase3/optimized` e o preview aponta para
`viewmodels-phase3/preview-root`, fora do repositório. O symlink interno em
`public/private-assets` está ignorado e o manifesto público versiona somente família, tamanho e hashes.

## Evidência técnica

| Gate | Resultado |
|---|---|
| `npm run eval:vm-precision-tools` | 10/10; raiz configurável e output isolado, com mutantes |
| fonte Mosin/SVD/SKS | T/M/C/F/A verdes e 12/12 mutantes rejeitados |
| otimizado Mosin/SVD/SKS | T/M/C/F/A verdes e 12/12 mutantes rejeitados; métricas idênticas à fonte |
| `npm run eval:vm-precision-lifecycle` | 10/10; SVD 30 ciclos, 630 amostras alternando 3:2/16:9 |
| `npm run eval:vm-foundation` | 20/20; 26 armas preservadas e privados ausentes do Git |
| `npm run syntax` | verde com Node 24 |
| `npm run build` | verde; preview privado não entrou no build público |
| `npm run check:deploy` | 37/39; somente `docs:check` e `eval:docsautoria` falham pelo CENA3 stale já presente na base |

O recibo combinado final de T/M/C/F/A é
`/Users/ruben/csbrasil-private-assets/generated/viewmodels-phase3/phase3-final-gates.json`
(SHA-256 `0f4d342a2924e6b4d63973a84550d5ce8e3c5c7ccf5b26345e87613fed625193`). Ele preserva os
resultados finais inalterados de Mosin/SVD e substitui somente o SKS pelo regateamento `final5c`.
O contrato causal visual final tem SHA-256
`c302b90214247cf8887863545c84321806dff0af60b08aa29a4d723ed8dd604c`.

Recibos locais ignorados:

- Mosin/SVD finais: `/Users/ruben/csbrasil-private-assets/generated/viewmodels-phase3/final4-gates.json`;
- SKS final fonte e otimizado: `final5c-gates-sks-source.json` e `final5c-gates-sks.json`, ambos com
  SHA-256 `5fef266a6a7f04af4ca09f4c8359bf80f37de4328002303ba58dc90736adf70d` e conteúdo idêntico;
- combinação final: `phase3-final-gates.json`, acompanhada por
  `phase3-final-gates.provenance.json` para registrar a origem de cada arma.

O primeiro regateamento revelou que a raiz C2 indicada no texto antigo não continha o controle
temporal usado pela fonte: `T_mutante_native` ficou falso. O baseline correto foi recuperado dos
assets preservados de `vm-astra-pistol`; a execução final acima prova os quatro mutantes por arma.
O gate agora impede `pronto:true` quando qualquer controle vermelho não morde.

## Capturas reais e julgamento visual

O capturador abriu o jogo real em `piscina_treta`, sem redimensionar o canvas, e produziu 42 PNGs:

- 1440×960 e 1440×810;
- AK em idle/tiro; faca em idle/contato pesado; fallback de pistola em idle/tiro;
- cada arma de precisão em idle, contato de tiro, contato de recarga, entrada de ADS e ADS coberto.

`capture.json` registra o checkpoint e os hashes das
fontes, estado de visibilidade e SHA-256 de cada PNG. Foram registrados 84 erros de localhost
esperados, causados por CORS do backend e recursos opcionais ausentes; nenhum erro WebGL,
`pageerror` ou `[paid-viewmodel]` ocorreu. Hashes dos agregados:

| Artefato local | SHA-256 |
|---|---|
| `artifacts/viewmodels/integration/precision/phase3-final-v3/capture.json` | `361aedf04e1eb7bc2bb761de12970abc3f6264fae62ae8a4a71f8bf856c1d3eb` |
| `contact-sheet-1440x960.jpg` | `88a389b00a90093f4646e8e52520241b73a750b84160904ea0350d087bb62d3a` |
| `contact-sheet-1440x810.jpg` | `ea21f13e8e32028bcbdf8a216df6cfecfe273634a240276203a18a88f32dedaa` |
| `before-after-1440x960.jpg` | `d90f20e176eefaf60e679b5150ed031f8317a28bc364adf2c270aa1bdc9bda8f` |
| `before-after-1440x810.jpg` | `863ee935e2825485a976c6d891bb9e754490671a8b8fac42101be2edfea93788` |
| `inspect/capture.json` | `d984854d4068f6fcc549d671f4ea4d77c0fed53f833761456c45b542f294d7cd` |
| `inspect/inspect-sheet.jpg` | `95438e3fd648c91ec62f3a65d22c7487bd834354e1504a6a44dce61ab63b5d07` |

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
CSBRASIL_VM_ASSET_ROOT=/Users/ruben/csbrasil-private-assets/generated/viewmodels-phase3/preview-root \
  npm run preview:vm-precision
```

O comando verifica os três hashes privados, monta apenas o symlink ignorado e imprime a URL:

`http://127.0.0.1:4401/?debug=1&auto=P,mst&map=piscina_treta&vmauthored=1&vmready=ak&vmweapon=mosin,svd,sks&vmqa=precision`

O painel local troca arma e aciona tiro, recarga e ADS. Remover `vmauthored`, `vmready` e
`vmweapon` mostra o fallback intacto. Para refazer a evidência, manter o preview ativo e executar
`npm run capture:vm-precision` em outro terminal. Ao terminar o preview, executar
`npm run cleanup:vm-precision`; enquanto o symlink estiver montado, `npm run build` falha antes de
copiar qualquer privado. O mutante de build montado foi rejeitado e o build limpo foi confirmado
sem arquivos sob `dist/client/private-assets` ou `.vercel/output/static/private-assets`.

## Próximo passo

Ruben deve revisar a URL acima em 3:2 e 16:9, com atenção a `inspect`, recarga completa e transições
de ADS. A integradora permanece fail-closed: nenhuma família recebe `ready:true` antes desse aceite,
e a folha atual não substitui o teste humano contínuo.
