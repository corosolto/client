---
name: fabrica-personagens
description: Fábrica de personagens e skins do CS BRASIL, da ficha ao personagem no jogo com avatar e arte de resultado. Use SEMPRE que for criar personagem novo, skin nova (inclusive o lote semanal da loja), refazer um modelo que o dono reprovou, ou regerar avatar, retrato, vídeo ou arte de vitória/derrota. Cobre pesquisa de proporção, concept 2D (OpenRouter), 3D e rig (Mint), retarget dos 11 estados, mídia derivada e os portões. NÃO use para viewmodel de arma (isso é a `fabrica-armas`) nem para conserto de código sem asset (isso é a `bug-hunt`).
---

# Fábrica de personagens e skins

Toda semana entra skin nova. Esta skill existe porque o mesmo erro já foi pago
duas vezes: os Míticos (09/2026) e os Políticos (PR #773, 10/2026) entraram com
avatar e arte de resultado renderizados crus do GLB, enquanto o elenco padrão usa
retrato pintado pelo OpenRouter. O dono viu nas duas vezes. A ordem abaixo não é
sugestão.

Leia antes: `CONTRIBUTING.md` (vetos e a exceção de sátira política), a skill
`csbrasil` (ficha e portões) e a `asset-review` (crítico cego).

## Roteamento de gerador (regra do dono)

- **2D sai pelo OpenRouter** (`tools/gen-image.mjs`, chave só do `.env`): concept,
  avatar, retrato, arte de resultado.
- **3D sai pelo Mint**: modelo, rig. Nunca use Mint para 2D.

## 1. Pesquisa e ficha

1. Para pessoa real (só figura política pública, como caricatura, nome caricato):
   pesquise com fonte em cada número. Altura, porte, ombro, quadril, pescoço,
   cabelo atual, 3 traços do rosto, roupa típica, acessório-assinatura e **o que
   não exagerar**. Marque estimativa como estimativa.
2. Fotos de pessoa real **nunca entram no repo**, nem em pasta ignorada. Ficam em
   pasta local e só servem ao concept.
3. Escreva `tools/personagens/fichas/<id>.json`: `id`, `nome`, `lado`, `genero`,
   `refs` (só nomes de arquivo), `identidade`, `roupa`, `corpo`, `naoExagerar`,
   `alvo` (cabeça/ombros/perna em fração da altura).

A caricatura mora no rosto e no acessório. Corpo é medido, não inventado: a Julia
v1 ganhou quadril e glúteo que a pessoa real não tem, porque um prompt pediu
"silhueta feminina" em vez de citar as fotos.

## 2. Concept 2D

```bash
node tools/personagens/gen-concept.mjs tools/personagens/fichas/<id>.json --refs-dir <pasta-das-fotos>
```

Gera duas variações em `/tmp/gen-image/`. **Olhe as duas** e escolha pela régua
do elenco: cabeça ~1/7 da altura (a mediana medida do elenco é 0,21 com cabelo),
pescoço e ombros naturais, corpo da ficha. A variação com cabeça maior quase
sempre perde. O estilo vem de `tools/personagens/estilo-elenco.jpg`.

O concept escolhido vai para `tools/eval/asset-evidence/<lote>/concepts/<id>/concept.jpg`
e precisa estar no remoto: o Mint só lê imagem por URL pública
(`raw.githubusercontent.com/...`). Peça autorização para o push.

## 3. 3D no Mint

Custo medido no lote dos 10 políticos (07/10/2026): **11.756 créditos no total**,
retopologia piloto incluída, ou ~1.050 por personagem (prévia ~150, final + rig o
resto). Uma leitura isolada de saldo logo depois do primeiro final mostrou 3.698 e
estava errada: confira o saldo antes e depois do **lote**, não de uma etapa.

1. `start_model_generation` com `image_url` do concept, `riggable_character`
   T-pose de mãos vazias, `mode: review`. O prompt repete o corpo da ficha, pede boca
   fechada e rosto liso, e proíbe brilho branco e peças soltas.
2. Olhe a prévia. Revise **só** o que diverge da ficha (ex.: cabelo alto na Dama).
3. `approve_final_generation`, depois `animate_generated_model` com **um** clipe
   (`613` Casual Walk inplace) e `height_meters` da ficha. Baixe o
   `rigged_character_glb`. Vários em paralelo funcionam; o rig entra em fila (~80 s cada).
4. Retopologia `high` (1.313 créditos) sobe a densidade só 32%: não use.
5. O final tem ~5k triângulos, como o elenco inteiro. A prévia é renderizada de um
   modelo melhor: defeito de rosto (lascas claras na boca e no queixo) só aparece
   no final. Se aparecer, **regere o final**. Cor, normal map, ORM, enrolamento,
   normais recalculadas, `FrontSide` e alisamento local foram testados e nenhum tira.

## 4. Integração

```bash
node tools/optimize-tribos.mjs <pasta-com-<id>.glb>          # textura, nunca malha
node tools/personagens/desvira-triangulos.mjs public/models/characters/<id>.glb public/models/characters/<id>.glb
node tools/retarget-glb.mjs public/models/anims/mixamo public/models/characters/<id>.glb public/models/anims/<id>
node tools/ground-anims.mjs <id> --morte                     # morte sem atravessar o chão
node tools/merge-anims.mjs && npm run anims && npm run feet
node tools/eval/char-probe.mjs && node tools/eval/chao-check.mjs && node tools/eval/ombro-check.mjs
```

- **Ombro torcido** ("cachecol" na gola) era o retarget copiando a rotação absoluta da
  clavícula. Desde 07/10 a clavícula vai em delta; a régua é a OMB1 (`eval:ombro`).
  Se ela reprovar, o clipe veio de retarget antigo.
- `merge-anims` remescla **todos** e muda bytes de outros personagens: reverta o
  que não for do lote antes de commitar (`anims:merge:check` continua verde).
- Personagem de categoria (`team: 'P'`) precisa de `lados: ['B'|'E']`: é dele
  que sai a cor do contorno. Sem isso o rim cai no branco (régua `FAC1`).
- Guarde o GLB bruto do Mint fora do repo com nome único por personagem;
  `personagem.glb` e `anims/personagem.glb` têm o mesmo nome e se sobrescrevem.
- Retoque de textura sem tocar malha: `tools/personagens/retoque-textura.mjs`
  (`--sel escuro|vermelho|claro|tudo`). Faça a máscara antes (`--sel tudo --cor
  '#00ff00'`) e olhe: altura de faixa e lado da frente erram fácil.

## 5. Mídia derivada (o passo que já foi pulado duas vezes)

1. Avatar 256 e retrato: `tools/gen-char-realista.mjs --ids <id> --estilo gamer`
   (render do GLB como `--ref`, OpenRouter pinta). **Nunca** publique o render cru.
2. Arte de vitória/derrota: o mesmo pipeline com `--shot corpo`; o render de
   `tools/eval/char-result-stills.mjs` é referência, e ele reprova figura ampliada.
3. Vídeos de seleção/resultado: `tools/eval/char-native-vids.mjs`.

## 6. Portões

1. Antes/depois no jogo real em 3:2, ao lado de um personagem regular do mesmo
   lado (`charvideo.html?shot=corpo&yaw=20` e `shot=busto`, fundo escuro).
2. C1 da sonda perto da mediana; C3/CHR7 verde.
3. Crítico cego (`asset-review`) com o render, o antigo, um regular e o concept.
   Quem gerou não dá a nota.
4. `mint-assets.json` com `assetId`, `chatUrl`, custo e o que foi reprovado.
