# Personagem do Studio por release fixada

Como o cliente carrega um PERSONAGEM de um pacote imutável do Studio (`kind: "character"`,
contrato em `corosolto/studio` → `docs/character-pack.md`), verificado no navegador antes de
virar modelo. Primeiro consumidor: `capitao-caveira@0.1.1` (0.1.0 tinha as mãos em lâmina por
rig sem encaixe de cotovelo/punho; consertado no `tools/rig-from-donor.mjs`, client #1253).

Este passo NÃO coloca ninguém no elenco: sem entrada em `characters.js`, sem retrato/avatar/
arte de resultado/WebM, sem allowlist no backend nem `CLIENT_REF`, sem multiplayer e sem
publicação em R2. Cada um desses é um PR próprio.

## Peças

| Arquivo | Papel |
| --- | --- |
| `public/js/data/content-releases.js` | Pins: `kind`, `id`, `version`, `manifestSha256`, `manifestUrl` em `/packs/...`, `minRuntime` (comparado à `VERSION`, não ao `SIM_HASH`), `skeleton: "meshy-28"`; os 11 estados e as juntas meshy-28. |
| `public/js/studio-character.js` | Resolvedor só de navegador. `resolveStudioCharacter(pin, { fetchImpl })` → Blob URLs verificadas do modelo, dos 11 clipes e das prévias. |
| `public/js/glbchars.js` | Adaptador: ids fixados entram no `GLB_CHARS`; `preloadCharacterAssets()` carrega modelo e os 11 clipes SÓ das Blob URLs (sem `animIndex`, GLB mesclado, pasta `models/anims/<id>/` ou clipe compartilhado), tudo ou nada; origem do corpo `{kind:'studio', sha256, manifestSha256}`, que nunca casa com luva pública. |
| `scripts/studio-pack-serving.mjs` | Handler Node de `/packs/` montado no dev server do Astro (plugin Vite) e em `tools/eval/serve.mjs`. Lê `STUDIO_PACK_ROOT`; sem ela, 404. |

## Ordem da verificação (fail-closed)

1. Sem `crypto.subtle` → `studio_webcrypto_unavailable`, sem nenhum fetch. Nunca se pula o digest.
2. SHA-256 dos **bytes exatos** do `manifest.json` antes do parse → `studio_manifest_sha_mismatch`.
3. Identidade (`studio_identity_mismatch`), esqueleto (`studio_skeleton_mismatch`), `minRuntime`
   ≤ `VERSION` (`studio_runtime_too_old`): o do pin é obrigatório (pin sem ele → `studio_pin_invalid`,
   antes de qualquer fetch); o do manifesto é piso extra opcional, aplicado quando declarado
   (os packs do Studio não o emitem; o piso do release é o do pin), caminhos seguros
   (`studio_unsafe_path`), inventário sem duplicata (`studio_inventory_invalid`), orçamento
   ≤ `budgets.bytes` e ≤ 16 MiB antes de baixar (`studio_budget_exceeded`), os 11 estados
   exatos (`studio_state_missing`/`studio_state_unknown`), dono único por arquivo
   (`studio_role_duplicate`, `studio_role_unknown_file`, `studio_file_unowned`).
4. Cada arquivo baixado: tamanho real (`studio_file_length_mismatch`) e SHA-256
   (`studio_file_sha_mismatch`) antes de virar Blob URL. Falha em qualquer um revoga TODAS as
   URLs criadas na tentativa, depois que as outras buscas assentam, e tira a tentativa do cache.
5. No adaptador: GLB ilegível (`studio_glb_invalid`), esqueleto sem as juntas meshy-28
   (`studio_skeleton_mismatch`) ou clipe sem a animação com o nome do estado
   (`studio_clip_missing`). Só então `_base`, `_clipsByChar` e a origem do corpo são escritos.

`preloadCharacterAssets()` espera todos os ids assentarem, registra `[studio] <id>@<versão>:
<código>` com `console.error` e rejeita (`StudioCharacterError`, ou `AggregateError` para
vários). Ids legados continuam com o fallback de sempre.

As checagens de árvore instalada, symlink, modo de arquivo e conteúdo GLB completo continuam
com o verificador Node do pacote (Studio `tools/validate-pack.mjs` e a instalação local).

## Servir localmente

```sh
STUDIO_PACK_ROOT=/caminho/para/local/studio-packs npm run dev
# o pacote fica em $STUDIO_PACK_ROOT/character/capitao-caveira/0.1.1/manifest.json
```

`/packs/` aceita só GET/HEAD, só caminho canônico (sem `%`, `\`, `.`/`..`, barra dupla), só
`.json/.glb/.png/.jpg/.jpeg/.webp`, contido sob a raiz depois de `realpath`, com
`Cache-Control: no-store`. Nada é copiado para `public/`.

Ver o piloto no renderer real, sem estar no elenco:
`/charvideo.html?id=capitao-caveira` (o `window.CHARVID.studio` traz a proveniência).

## Réguas

- `npm run eval:studiochar` (no `check:fast` e no pr-fast do CI): pacote sintético gerado na
  hora, 14+ mutações de pacote, servidor `/packs/` e 17 mutantes de código que precisam ser
  reprovados na cláusula certa. Com `STUDIO_PACK_ROOT`, também resolve o piloto real.
- `STUDIO_PACK_ROOT=… npm run eval:studiochar:browser`: Chrome no `charvideo.html` real —
  Blob URLs com o SHA do pin, 14 pedidos `/packs/` em 200 e nenhum ao acervo legado, 28 juntas
  meshy-28, cada um dos 11 clipes tocando no esqueleto com still em
  `artifacts/studio-character/<id>/`, luva nula e pacote adulterado no fio rejeitado sem estado
  parcial. Sem `STUDIO_PACK_ROOT` sai 78 (NÃO MEDIDO), nunca verde.

## Rollback

Reverter o pin em `content-releases.js` remove o id do `GLB_CHARS` e qualquer carga do pacote.
