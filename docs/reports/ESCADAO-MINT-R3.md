# Escadão R3: modelos Mint e seleção final

## Resultado integrado

- `escadao_casa_r3.glb`: casa original gerada nesta rodada, usada duas vezes nas
  alas da laje frontal. 4.146 triângulos, um material, albedo/ORM/normal WebP1024²,
  403.196 bytes. Fonte e hashes em `mint-assets.json` e `public/models/props/FONTE.md`.
- `samambaia.glb`: Emerald Feather Clump, 3.757 triângulos; acervo Mint anterior,
  seis vasos com folhagem de0,52m, apoiados fora da passagem do corpo. Chat:
  <https://mint.gg/chat/ph738vqqdc08zxxy7912d24w1n8cteh0>.
- `grama_corrego_02.glb`: Urban Creekside Weeds,4.046triângulos; acervo Mint
  anterior, quinze tufos de0,14–0,18m na qualidade alta, dez na baixa. Chat:
  <https://mint.gg/chat/ph78r1m1pa8zyrhsvw0nwz4b1x8crrg2>.

As duas plantas existentes permanecem byte a byte intactas. Instâncias por setor,
sem sombra; posição dos vasos corrigida após22interseções de ombro/cabeça no
primeiro candidato. Prova final de corpo8/8. Prédio, vasos, grama e fios aprovados
pelo crítico independente nas capturas `refinement-r3/comparison-final`.

## Geração e licença

Projeto: <https://mint.gg/project/zd72r64gkq3d9k3v8349cp6yt98dwvx4>.
Chat:`ph76fdb7fh3t30vzjz8ajv01xs8dx139`.
Pack:`th7290wv39q83egs019b1g29vs8dwnr1`.
Run:`asset-pack-final:assetPackOutput:vd77drm22g8fn3p0t9hyn39w6h8dxed8`.
ModeloTRIPO_P1, qualidadeStandard. Nenhum assetId individual foi inventado:
identificação por pack, arquivo de origem e SHA256.

Usuário concluiu login no perfil Chrome rubenluz. PlanoPro confirmado na UI em
06/09/2026. Nenhuma compra ou upgrade. Os termos oficiais, seção4, revisão
07/05/2026, atribuem ao usuário os direitos que Mint tenha no resultado, sujeitos
aos termos e direitos de terceiros: <https://docs.mint.gg/terms-of-service>.
Não foram enviadas fotos do usuário nem extraídas texturas das referências.
Inspeção da casa não identificou marcas ou texto.

ZIP original:1.786.357bytes. Recibo e originais em
`artifacts/escadao-visual/refinement-r3/mint-raw/`.
Pipeline: `node tools/optimize-escadao-r3.mjs <pack-original> <saida>`.
GLBs centrados e normalizados; `placeProp` apoia a base no piso. A casa é ajustada
no builder às dimensões explícitas das alas, sem alterar o loader compartilhado.
Renders Blender5.2 em `mint-preview-r2/`; o primeiro render superexposto foi
rejeitado. Imagens finais no jogo são a referência de aceitação.

## Candidato de mato rejeitado

`02-escadao-mato-de-fresta-r3.glb` veio com4.347triângulos. Simplificação limitada
por erro0,01 gerou2.407triângulos/179.348bytes, acima da meta interna de700.
A crítica identificou manchas triangulares pretas/claras nas folhas, já presentes
no original. Testes sem mapa normal/metalicidade, orientação das faces e normais
recalculadas reduziram o defeito, sem justificar substituir a grama existente.
O novo mato não entra no acervo público. Originais, candidatos e diagnósticos
permanecem nos artefatos privados `mint-material-test`, `mint-winding-test` e
`mint-normals-test`. A aprovação final avalia o acervo efetivamente integrado.

## Prompt enviado

Create two separate original game-ready 3D models for a Brazilian hillside stairway
FPS map. Generate downloadable GLB assets, not a combined scene, and do not animate.

1. Escadao residential house module: modest single-floor house,5.2m wide,3.2m deep,
3.1m floor height; exposed red hollow-clay brick, concrete corner columns, aged
beige plaster patches, two domestic1.15×1.1m steel-grille windows, closed facade,
flat slab roof and short parapet. No interior, pedestal, stairs, vegetation, cars,
text, logos or graffiti. One1024PBR atlas, target≤6000triangles, Y-up, bottom pivot.
2. Escadao crack weeds: asymmetric thin arching blades, small broad leaves/dry
 tips,0.16m tall,0.22m wide, tight root. No pot, soil mound, ground tile, flowers,
fantasy colors or chunky leaves. One256atlas, target≤700triangles, Y-up, bottom pivot.

Only existing generation allowance; no credit purchase or subscription upgrade.
