# OPS-523 — grafo de módulos do preview Sertão

## Causa

`map_preview_media.js` era escrito por dois capturadores independentes. A captura mais recente da Amazônia sobrescreveu o export `SERTAO_PREVIEW` necessário a `sertao_map_preview.js`, fazendo o carregamento ESM falhar antes do boot.

## Correção

O Sertão agora tem `public/js/sertao_preview_media.js`, com revisões de poster/vídeo próprias. O módulo da Amazônia continua proprietário de `map_preview_media.js`. O capturador e o teste de corrida do Sertão foram atualizados para a nova fonte.

## Validação

Executar `npm run syntax`, `node tools/eval/map-preview-race-check.mjs` e `npm run prod:coherence -- http://127.0.0.1:<porta>` contra um servidor da árvore.

## Limite

Esta correção elimina a falha de import/export local. A limpeza de cache Cloudflare e a confirmação do deploy continuam sendo etapas de release, fora deste patch.
