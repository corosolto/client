# Fora do Ar — brasão e capa

## Ativos publicados

- `public/img/brasoes/fora-do-ar.png`: 256×256 PNG RGBA, fundo transparente; SHA-256 `98b49e0880a3c53955a9f5be96033edb3de1154bb9cf19e3f59461c2bdc49543`.
- `public/img/faccoes/fora-do-ar.webp`: 640×1600 WebP, sem texto; SHA-256 `f02cabba954465bc5dda919fecaa21690310ebf1b3dcd6c81ba3456a12536148`.

A capa mantém o topo escuro e livre para a interface; as quatro figuras aprovadas ficam no terço inferior. O brasão foi reduzido a 32×32 para revisão: `/tmp/faccao-fora-do-ar-preview/crest-32.png`. A capa servida também fica disponível para revisão em `/tmp/faccao-fora-do-ar-preview/cover-640x1600.webp`.

## Procedência e direitos

Geração em 2026-11-10 pelo Codex CLI `0.166.0`, usando a ferramenta integrada `image_gen` da sessão Codex. O runner pedido em `/tmp/concepts-lote30/run-codex.sh` não existia; o equivalente sobrevivente e verificável foi a chamada direta `codex exec` registrada abaixo. Não usa OpenRouter nem imagens externas. O original privado da geração fica preservado fora do repositório:

- Brasão original 1254×1254: `/Users/ruben/.codex/generated_images/01a1c2bb-1c9b-7601-b2b6-81db89e4411d/exec-0d461595-4585-4c58-a305-08f4ea3ddcd8.png`, SHA-256 `15220b82060c4a7ab43d6671fab16debc18f7046aa1d5f9e06316476d96e9cbd`.
- Capa final original 793×1983: `/Users/ruben/.codex/generated_images/01a1c2c3-64d9-70e2-9ff5-974778fc1d65/exec-0f72134f-4ccc-4876-86ea-c26c65a7aa8c.png`, SHA-256 `7de00dad0b536285a8c02a5fff30524ac946eebb551a943b1aa6969a0db5322a`.

As referências de identidade são os quatro retratos aprovados dos packs locais `local/studio-packs/character/<id>/0.2.0/previews/portrait-front.png`: `capitao-caveira`, `clovis-fora-do-ar`, `teletreco-sinal-fraco` e `boneca-da-cristaleira`. A referência de acabamento é a composição temporária `/tmp/faccao-fora-do-ar-preview/style-refs.png`, feita apenas com `public/img/faccoes/tv.webp` e `public/img/faccoes/funkeiros.webp`. Não há pessoa real, personagem de filme ou série, marca reconhecível, gore, fotografia externa ou modelo extraído. A identidade editorial proposta é analógica, com phosphor green/navy e metadados do registro em `public/js/factions.js`; o lema `A treta continua depois do sinal!` não aparece dentro das imagens.

## Comando reprodutível do brasão

```bash
codex exec --ephemeral --cd /tmp/corosolto-faccao-fora-do-ar-20261110 \
  --image public/img/brasoes/t.png --image public/img/brasoes/m.png -s read-only \
  "Use the image generation tool now to create one original transparent PNG coat of arms for the fictional Brazilian faction Fora do Ar. The attached existing CS BRASIL crests are style references only: match their polished illustrated game-emblem finish and strong silhouette, but do not copy any shape. Design: analog-TV Brazilian creepypasta, an old CRT television with a broken signal halo, antennae, a broadcast interruption motif, phosphor green and deep navy palette with restrained off-white metal, centered symmetrical heraldic badge, no people, no real brands, no film/TV characters, no gore, no words or letters, transparent background outside the emblem, high contrast so the silhouette remains recognizable at 32 px. Generate the image and report the exact generated artifact path and dimensions; do not edit source files or use OpenRouter."
```

The generated PNG was resized locally with `sharp` to 256×256 while preserving alpha.

## Comando reprodutível da capa final

```bash
cat /tmp/fora-cover-regenerate-prompt.txt | codex exec --ephemeral \
  --cd /tmp/corosolto-faccao-fora-do-ar-20261110 -s read-only \
  --image /Volumes/Zenith/Projects/game/corosolto/csbrasil/local/studio-packs/character/capitao-caveira/0.2.0/previews/portrait-front.png \
  --image /Volumes/Zenith/Projects/game/corosolto/csbrasil/local/studio-packs/character/clovis-fora-do-ar/0.2.0/previews/portrait-front.png \
  --image /Volumes/Zenith/Projects/game/corosolto/csbrasil/local/studio-packs/character/teletreco-sinal-fraco/0.2.0/previews/portrait-front.png \
  --image /Volumes/Zenith/Projects/game/corosolto/csbrasil/local/studio-packs/character/boneca-da-cristaleira/0.2.0/previews/portrait-front.png \
  --image /tmp/faccao-fora-do-ar-preview/style-refs.png -
```

Prompt exato em `/tmp/fora-cover-regenerate-prompt.txt`: preserva os quatro rostos, silhuetas, cores, roupas e traços dos retratos; não inventa quinto personagem; usa o quinto anexo só para acabamento; mantém o topo 38% escuro; põe as quatro figuras aprovadas no terço inferior; sem texto, letras, logos, watermark, motto, pessoas reais, personagens de filme/série, marcas reconhecíveis ou gore. A ferramenta retornou 793×1983 (proporção 0,4); a publicação usa `sharp` para redimensionar exatamente a 640×1600 do runtime, qualidade 90.
