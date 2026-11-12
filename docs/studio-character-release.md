# Personagem do Studio por release fixada

Como o cliente carrega um PERSONAGEM de um pacote imutável do Studio (`kind: "character"`,
contrato em `corosolto/studio` → `docs/character-pack.md`), verificado no navegador antes de
virar modelo. Primeiro consumidor: `capitao-caveira@0.1.1` (0.1.0 tinha as mãos em lâmina por
rig sem encaixe de cotovelo/punho; consertado no `tools/rig-from-donor.mjs`, client #1253).

Este passo NÃO coloca ninguém no elenco: sem entrada em `characters.js`, sem retrato/avatar/
arte de resultado/WebM, sem allowlist no backend nem `CLIENT_REF` e sem multiplayer. Cada um
desses é um PR próprio. A publicação em R2 está em "Origem em produção (R2)" abaixo.

## Peças

| Arquivo | Papel |
| --- | --- |
| `public/js/data/content-releases.js` | Pins: `kind`, `id`, `version`, `manifestSha256`, `manifestUrl` em `/packs/...`, `minRuntime` (comparado à `VERSION`, não ao `SIM_HASH`), `skeleton: "meshy-28"`; os 11 estados, as juntas meshy-28 e o vocabulário de clipes extras (`STUDIO_EXTRA_CLIPS`, 68 nomes — 23 do núcleo do contrato + 45 propostos pela biblioteca de conversão de animações — + prefixos `emote_`). |
| `public/js/studio-character.js` | Resolvedor só de navegador. `resolveStudioCharacter(pin, { fetchImpl })` → Blob URLs verificadas do modelo, dos 11 clipes (um por arquivo ou um `states.glb` compartilhado), dos clipes extras opcionais e das prévias; extras expostos no Map `extraClipUrls` (nome → `{url, sha256, clip, family, duration, loop, rootMotion}`) — várias chaves podem compartilhar um pack de família (`family` loco/combat/ceremony/emote espelhado de `clipFamily` do Studio) — e `families` (Map família → `{url, keys}`) para carga preguiçosa por família. Cada conteúdo (SHA-256) é baixado uma vez, com uma única Blob URL. |
| `public/js/glbchars.js` | Adaptador: ids fixados entram no `GLB_CHARS`; `preloadCharacterAssets()` carrega modelo e os 11 clipes SÓ das Blob URLs (sem `animIndex`, GLB mesclado, pasta `models/anims/<id>/` ou clipe compartilhado), tudo ou nada; origem do corpo `{kind:'studio', sha256, manifestSha256}`, que nunca casa com luva pública. |
| `scripts/studio-pack-serving.mjs` | Handler Node de `/packs/` montado no dev server do Astro (plugin Vite) e em `tools/eval/serve.mjs`. Lê `STUDIO_PACK_ROOT`; sem ela, 404. |
| `public/js/data/pack-origin.js` | Origem dos pacotes: `studioPackUrl('/packs/…')` vira `https://assets.corosolto.com.br/packs/…` em produção e preview, e fica `/packs/…` em host local (localhost, loopback, rede privada, `*.local`). `?packorigin=cdn\|local` força. URL absoluta passa intacta. |
| `scripts/publish-studio-packs.mjs` | Publicador R2 (API S3, SigV4 próprio, sem dependência). `npm run publish:packs -- --root <raiz> [--dry-run\|--verify-only] [--pack id@versão]`. |

## Ordem da verificação (fail-closed)

1. Sem `crypto.subtle` → `studio_webcrypto_unavailable`, sem nenhum fetch. Nunca se pula o digest.
2. SHA-256 dos **bytes exatos** do `manifest.json` antes do parse → `studio_manifest_sha_mismatch`.
3. Identidade (`studio_identity_mismatch`), esqueleto (`studio_skeleton_mismatch`), `minRuntime`
   ≤ `VERSION` (`studio_runtime_too_old`): o do pin é obrigatório (pin sem ele → `studio_pin_invalid`,
   antes de qualquer fetch); o do manifesto é piso extra opcional, aplicado quando declarado
   (os packs do Studio não o emitem; o piso do release é o do pin), caminhos seguros
   (`studio_unsafe_path`), inventário sem duplicata (`studio_inventory_invalid`), orçamento
   ≤ `budgets.bytes` e ≤ 16 MiB antes de baixar (`studio_budget_exceeded`), os 11 estados
   exatos (`studio_state_missing`/`studio_state_unknown`), dono por TIPO de papel
   (`studio_role_duplicate`, `studio_role_unknown_file`, `studio_file_unowned`): estados podem
   compartilhar um `states.glb` e extras podem compartilhar packs de família, mas os dois tipos
   nunca se misturam no mesmo arquivo. Clipes extras opcionais (`animations.extra`): só nomes do
   vocabulário são baixados/verificados/expostos (`R15`); chave fora do vocabulário é ignorada
   (não baixa, não expõe, não derruba o pacote); sem `extra` o `extraClipUrls` é um Map vazio;
   `family` declarada tem de casar com o nome (`studio_manifest_invalid`, espelho do Studio) e
   `emote_` nunca compartilha arquivo; extras contam no orçamento e no dono por tipo
   (`studio_manifest_invalid` para `extra` não-objeto ou entrada sem `file`).
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

## Origem em produção (R2)

Bucket `corosolto-assets`, domínio público `https://assets.corosolto.com.br`, chave
`packs/<kind>/<id>/<versão>/<arquivo>` — o mesmo caminho do pin, então trocar de origem é só o
prefixo. O resolvedor continua verificando SHA-256 do manifesto e de cada arquivo: a CDN não é
fonte de confiança, só de bytes. A CSP do `vercel.json` lista a origem no `connect-src`.

O publicador sobe só pacote fixado e íntegro (SHA do `manifest.json` local = pin; bytes e SHA
de cada arquivo = inventário), com `Content-Type` pela extensão, `Cache-Control: public,
max-age=31536000, immutable`, `x-amz-meta-sha256` e `If-None-Match: *`. Chave já publicada com o
mesmo SHA é pulada; com outro conteúdo, a rodada inteira é recusada antes do primeiro PUT. O
`manifest.json` de cada pacote sobe por último. No fim, baixa cada objeto pela origem pública
com `Origin: https://www.corosolto.com.br` e confere SHA-256, bytes, `Content-Type`,
`Cache-Control` e CORS. Credenciais (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET`) vêm do ambiente ou de `~/.config/corosolto/r2.env`
(`--r2-env` troca o arquivo) e nunca são impressas. Saída 0 ok, 1 falha de envio/verificação,
2 recusa (pin, inventário, conflito, credencial).

Versão nova de personagem é pasta nova (`<versão>` muda): publique antes, depois troque o pin.

## Réguas

- `npm run eval:studiochar` (no `check:fast` e no pr-fast do CI): pacote sintético gerado na
  hora (com packs de família loco/ceremony compartilhados por várias chaves, uma cópia byte a
  byte com o mesmo SHA e um `states.glb` para os 11 estados), servidor `/packs/`, origem R2
  (R19: URL por host, pacote servido pela origem R2, adulteração na CDN, CSP) e 30 mutantes
  de código que precisam ser reprovados na cláusula certa. Com `STUDIO_PACK_ROOT`, também
  resolve o piloto real.
- `npm run eval:packpublish` (no `check:fast` e no pr-fast do CI): publicador contra um R2 de
  mentira (SigV4 conferido por implementação própria, If-None-Match, origem pública com CORS):
  imutabilidade, MIME, Cache-Control, ordem do manifesto, dry-run, verificação pública e
  segredo fora do log, com 13 mutantes.
- `STUDIO_PACK_ROOT=… npm run eval:studiochar:browser`: Chrome no `charvideo.html` real —
  Blob URLs com o SHA do pin, 14 pedidos `/packs/` em 200 e nenhum ao acervo legado, 28 juntas
  meshy-28, cada um dos 11 clipes tocando no esqueleto com still em
  `artifacts/studio-character/<id>/`, luva nula e pacote adulterado no fio rejeitado sem estado
  parcial. Sem `STUDIO_PACK_ROOT` sai 78 (NÃO MEDIDO), nunca verde.

## Rollback

Reverter o pin em `content-releases.js` remove o id do `GLB_CHARS` e qualquer carga do pacote.
