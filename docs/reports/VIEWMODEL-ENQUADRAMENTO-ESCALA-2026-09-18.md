# Enquadramento e escala por arma — a régua que faltava

## O que o dono reprovou

Revisão dos 52 vídeos: inconsistência entre armas em animação, pegada, mãos e
escala — "quase todas estão com inconsistências e erradas". Este documento fecha
a parte de **enquadramento e escala**; mãos e animação ficam registradas como
causa separada no fim.

## Causa raiz: `frame` era campo morto

`vmconfig.js` declarava `frame: 'family'` em 13 armas. Varredura completa de
`public/js` e `tools`: **nenhum leitor**. O único consumidor era um autoteste que
conferia se a string valia `'family'`. O enquadramento efetivo saía sempre de
`FAMILY_FRAME[familia]`, então as 24 armas assadas herdavam um único ponto de
câmera, rotação e fov por família — e `mount.scale` permanece 1, ou seja, o
runtime não escala nada.

A família `ar` é a prova: seis armas cujos próprios verificadores travam
comprimentos de 0,6912 m (tavor) a 0,9135 m (md97) dividiam o mesmo frame.

## A régua

`npm run eval:vm-frame` (`tools/viewmodels/prep/vm-frame-calibra.mjs`) reproduz o
caminho do runtime em repouso — câmera embutida removida, cena no espaço da
câmera, mount com posição/rotação/fov do frame — e mede **na tela**, nos dois
aspectos:

- `dentro`: fração dos vértices da arma dentro do quadro (limite ≥85%, o mesmo
  do Gate F da precisão, aqui exigido em 3:2 **e** 16:9);
- `razao`: diagonal aparente ÷ (escala angular alvo × comprimento declarado).

O alvo **não** é "toda arma do tamanho da AK" — uma Deagle deve aparecer menor
que um fuzil. O alvo é a **escala angular por metro de arma**, constante no
arsenal, com a AK aprovada fixando a constante em `1,7091` de diagonal NDC por
metro. Tolerância ±12%.

Três decisões de medição que mudam o resultado:

1. **Pele aplicada.** O mundo de um vértice com skin é
   `matrixWorld · bindMatrixInverse · skin · bindMatrix · v`. Sem o `matrixWorld`
   a escala do rig (0,01 nos pacotes em centímetro) fica de fora e a medida
   explode — foi o primeiro erro desta régua.
2. **Extensão por percentil, não min/max.** Vários pacotes carregam malha
   perdida longe da arma; um vértice a 100 m dava AWP a 265× e MP5 a 2.676×.
   O percentil descreve a silhueta; `--malhas` lista quem está fora dela.
3. **`FAMILY_FRAME` é lido do próprio `authoredvm.js`**, não copiado. A régua não
   pode divergir do runtime por edição.

## Estado antes (`--cru`) e depois

Medido em 3:2 sobre os 24 produtos assados:

| | antes | depois |
|---|---|---|
| faixa de `razao` | 0,53× a 3,89× (7,3×) | 0,94× a 1,03× nas 23 que fecham |
| dentro da família `ar` | 0,93× a 3,03× (3,3×) | 0,94× a 0,98× |
| armas com <85% no quadro | 12 de 24 | 3 de 24 |
| centro da silhueta | [0,26 −0,48] a [2,01 −3,18] | convergido em ~[0,61 −0,66] |
| passam as duas travas | **2 de 24** | **21 de 24** |

## Como a medida entra no runtime

O valor medido mora em `public/js/data/vmframe.js`, **gerado** pela régua
(`--escrever`), com procedência no cabeçalho: referência, escala alvo, centro
alvo e resíduo por arma. Não é copiado à mão para o `vmconfig.js`.

Precedência em `authoredvm.js`: `FAMILY_FRAME[familia]` ← `VM_FRAME[arma]`
(medido) ← `VM_WEAPON[arma].frame` (override manual, agora aceita objeto). A
string `'family'` continua significando "herda tudo".

## As três que a régua reprova — e por que não foram maquiadas

| arma | leitura | natureza |
|---|---|---|
| `akm` | 0,534× e **inalcançável**: nem junto ao plano near a silhueta cresce até o alvo | asset — o produto é pequeno demais para o comprimento declarado |
| `lmg` | razão 0,999 mas só 37,1% no quadro | asset — silhueta grande demais para caber; a captura confirma que o enquadramento novo **piorou** a leitura |
| `p90` | 82,6% no quadro | asset/pacote, 41,56° fora do eixo do gabarito já registrados |

Nenhuma recebeu valor forçado. A régua devolve `inalcancavel` em vez de inventar
um número que fecharia o placar sem fechar a imagem.

## Evidência visual

Captura das nove armas mexidas em `evidence/arsenal-video-20260918-frame`
(3:2, jogo real, zero erro fatal). Comparadas quadro a quadro com a rodada
anterior: awp, carbine, famas, m4, m400, md97, scar e tavor passam de "arma
quase fora do quadro" para arma inteira, com mão visível e silhueta legível.
A lmg piorou, como a régua já dizia.

## O que este marco NÃO resolve

- **Mãos**: cinco produtos (akm, m92, g3, awp, m400) usam a malha
  `Requests_Studio_Hands` com duas camadas de material e **sem material de pele**,
  enquanto as outras 19 usam `Hand-Tool1.008` com três. Na imagem a mão vira uma
  luva lisa sem dedos e a textura de identidade vaza para a arma. O limite da
  régua de mãos estava **rebaixado para `>= 2` exatamente nessas cinco** e foi
  unificado em `>= 3` — as cinco agora reprovam com o motivo explícito. O
  conserto é re-assar com as mãos KINEMATION, não runtime.
- **Animação**: quatro gramáticas incompatíveis convivem no catálogo
  (`frozenIdle`; rotação rígida do root; movimento rígido no `RIG_FP_ARMS`;
  ações originais do pacote). Isso é inconsistência por construção e exige
  unificação de pipeline.
- **Contato**: continua sem medida para 21 das 24 armas. As réguas de pegada
  medem distância entre origens de nós — um punho a 27 cm do carregador passa —
  e `drift` confunde rigidez com contato: mão 10 cm dentro da coronha, parada,
  dá deriva zero.
- Aceite do dono continua obrigatório. Todas as 26 seguem `ready:false`.
