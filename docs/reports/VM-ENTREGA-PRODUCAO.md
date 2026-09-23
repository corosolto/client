# Viewmodel autorado em produção: entrega privada pelo Blob

**Estado:** implementado e ensaiado em 23/09/2026, **ainda sem upload real**. O dono precisa
fazer os três passos da seção "Primeira publicação" antes do merge.

## O defeito

Os GLBs do viewmodel autorado (rig pago KINEMATION, com licença de distribuição web) moram em
`~/csbrasil-private-assets` e chegam ao dev server por um symlink,
`public/private-assets/viewmodels`. Esse caminho é gitignored (`.gitignore`, bloco "Viewmodels
1P") e o `astro.config.mjs` só o libera no dev. **Não existia canal de produção:** no site
publicado cada GLB autorado dava 404 e o jogo caía no viewmodel legado sem avisar.

## O desenho

O desenho segue o do áudio (`scripts/fetch-audio.sh`): Blob privado, token só no ambiente da
Vercel, SHA-256 conferido no build. Muda uma coisa: o áudio baixa um zip inteiro, e aqui cada
arquivo é endereçado pelo próprio conteúdo.

```
árvore local do dono ──upload-viewmodels.mjs --publicar──▶ Blob privado  viewmodels/sha256/<sha>.<ext>
        │                                                         │
        └── regrava tools/viewmodels/vm-assets.manifest.json      │ (commitado: path, bytes, sha256, v)
                                                                  ▼
vercel build: fetch-viewmodels.sh ──GET + Bearer──▶ public/private-assets/viewmodels/<mesmo layout>
              confere bytes+SHA-256 por arquivo; VM_REQUIRED=1 reprova se faltar qualquer um
astro build ──▶ dist/client e .vercel/output/static; prune-dist remove o que não está no manifesto
```

A URL servida continua igual à da árvore
`viewmodels-catalog-final/preview-root/viewmodels`: `/private-assets/viewmodels/<família>/<arma>-baked-runtime.glb`.
Isso vale também para os GLBs de família, `shared/` e `recoil.json`. O runtime não muda.

| Arquivo | Papel |
|---|---|
| `scripts/vm-assets.mjs` | contrato compartilhado: filtro do que é runtime, hash, `v`, política de cache |
| `tools/viewmodels/vm-assets.manifest.json` | 35 entradas (`path`, `bytes`, `sha256`, `v` = sha256[:10], `contentType`) |
| `scripts/upload-viewmodels.mjs` (`npm run vm:publicar`) | ensaio (padrão), `--manifesto`, `--check`, `--publicar` |
| `scripts/fetch-viewmodels.sh` → `.mjs` (`npm run fetch-viewmodels`) | download no build, no `buildCommand` do `vercel.json` |
| `scripts/prune-dist.mjs` | publica só o que está no manifesto |
| `tools/eval/vm-serving-prod-check.mjs` | `eval:vm-serving-prod` (dist ou `--url=`) e `eval:vm-serving-config` (no `check:deploy`) |

**O que entra no manifesto:** `*.glb`, `*.webp` e `recoil.json`. **O que não entra:**
`shared/raw-general/` (clipes crus do assado) e os relatórios `*.optimize.json`,
`optimize-report.json`, `general-report.json` e `shared-manifest.json`. Nada disso é carregado
pelo runtime. A árvore tem 106 MB; o que é servido soma 75,4 MB.

### Sem credencial (fork ou máquina local)

Sem credencial, `fetch-viewmodels.sh` imprime `AVISO viewmodel: 35 de 35 … ausentes …
BLOB_READ_WRITE_TOKEN ausente` e sai 0. O site sobe e o jogo usa o legado. **O manifesto
nunca é tocado pelo fetch.** O `upload-viewmodels.mjs` recusa árvore ausente ou vazia, e
recusa remover entradas sem `--permitir-remocao`. Assim não se repete o defeito do `npm run
audio`, que esvazia o manifesto de áudio numa máquina sem o pack.

Quando `public/private-assets/viewmodels` é o symlink de dev, o fetch **não escreve através
dele**. Ele só confere e avisa.

## Cache, tipo e CSP

| Caminho | Cache-Control | Por quê |
|---|---|---|
| `<família>/<x>-runtime.glb` (24 arquivos) | `public, max-age=31536000, immutable` | a URL do runtime do catálogo carrega `VM_BYTES` = sha256[:10], a mesma regra de `v` no manifesto |
| `shared/*` e `recoil.json` | `public, max-age=0, must-revalidate` | o runtime ainda usa `CATALOG_VERSION` fixo; se esses caminhos fossem imutáveis, o BUG-157 voltaria |

Todo `.glb` sai com `Content-Type: model/gltf-binary`, e `/private-assets/viewmodels/*` leva
`X-Robots-Tag: noindex`. As regras estão no `vercel.json` e são disjuntas, para que a ordem
de avaliação não importe.

A CSP atual já cobre a entrega. O arquivo é same-origin, então o `connect-src 'self'` do
GLTFLoader libera o fetch, e as texturas WebP embutidas decodificam por `blob:`, que o
`img-src` já permite. O SP3 confere essas diretivas.

**Vínculo URL↔bytes (SP4):** as 24 versões do `vmbytes.js` do
`origin/codex/viewmodels-catalog-final` batem uma a uma com as 24 entradas imutáveis do
manifesto. Isso foi medido pondo o arquivo no lugar e depois removendo; o mutante
`vmbytes-velho` fica vermelho. Neste ramo o `vmbytes.js` ainda não existe, então o SP4 avisa
e não mede. O SP4 passa a ser cobrado sozinho quando o runtime do catálogo entrar.

Para estender o `immutable` a `shared/` e `recoil.json`, o runtime (lane vm-launch-k) precisa
usar o `v` do manifesto nessas URLs. Depois disso basta mudar `IMMUTABLE_RE` em
`scripts/vm-assets.mjs` e a regra correspondente do `vercel.json`. A régua cobra as duas juntas.

## Operação

### Primeira publicação (dono)

1. **Token.** O store privado do áudio pode ser reaproveitado, porque o `BLOB_READ_WRITE_TOKEN`
   já existe no projeto da Vercel. Numa shell local, sem colar o token em lugar nenhum:
   `vercel env pull .env.blob --environment=production`, depois
   `set -a; . ./.env.blob; set +a; rm .env.blob`.
2. **Upload.**
   ```bash
   npm i --no-save @vercel/blob
   node scripts/upload-viewmodels.mjs                 # ensaio: lista 35 blobs, 75,4 MB
   node scripts/upload-viewmodels.mjs --publicar      # sobe, preenche blobBase, regrava o manifesto
   git add tools/viewmodels/vm-assets.manifest.json && git commit -s
   ```
   O `--publicar` recusa gravar se a base devolvida não for `*.private.blob.vercel-storage.com`.
3. **Vercel → Settings → Environment Variables:** `VM_REQUIRED=1` em **Production**, e em
   Preview se quiser que o preview também reprove. O `BLOB_READ_WRITE_TOKEN` já está lá por
   causa do áudio; se o store for outro, defina `VM_BLOB_TOKEN`.
4. **Validar o preview:**
   `VERCEL_AUTOMATION_BYPASS_SECRET=… npm run eval:vm-serving-prod -- --url=https://<preview>.vercel.app`.
   Tem que dar `SP1 35/35`.

### Re-assar uma arma

Assar e aprovar → `node scripts/upload-viewmodels.mjs` (ensaio; a arma aparece com `~`) →
`--publicar` → regenerar `vmbytes.js` na lane do runtime (`tools/viewmodels/gen-vmbytes.mjs`)
→ commitar o manifesto e o `vmbytes.js` juntos. Se os dois não andarem juntos, o SP4 reprova:
o navegador guardaria o GLB antigo sob URL imutável.

### Trocar o token

Vercel → Storage → store → gerar token novo. Atualize `BLOB_READ_WRITE_TOKEN` em
Production e Preview e faça redeploy. Depois revogue o token antigo. **Esse token é o mesmo
do pack de áudio:** a troca vale para os dois. Os blobs não mudam, e o manifesto também não.

### Rollback

- **Rápido:** Instant Rollback da Vercel para o deploy anterior. O deploy leva os GLBs dentro
  de si e não depende do Blob em tempo de requisição.
- **Por conteúdo:** `git revert` do commit do manifesto e redeploy. Os blobs antigos
  continuam no store, porque o endereço é o conteúdo e nada é sobrescrito.
- **Desligar o autorado:** `?vmauthored=0` no cliente, ou tirar o `VM_REQUIRED` e o token
  e rebuildar. O build degrada para o legado com aviso.

## Tamanho e desempenho

Medido na árvore do catálogo com `gzip -9` e `brotli -q 11`:

| Arma | GLB | | Arma | GLB |
|---|---:|---|---|---:|
| akm | 1,42 MB | | lmg | 6,17 MB |
| m92 | 1,58 MB | | sks | 5,22 MB |
| carbine / famas / m4 / md97 / scar / tavor | 1,40–1,56 MB | | mosin / rem700 | 5,05 / 4,48 MB |
| g3 / g3sg1 | 1,53 / 1,45 MB | | svd | 4,94 MB |
| mp5 / p90 | 1,48 / 1,41 MB | | uzi | 4,07 MB |
| awp / m400 | 1,42 / 1,47 MB | | revolver | 3,89 MB |
| pistol | 2,87 MB | | shotgun | 3,77 MB |
| deagle | 3,10 MB | | | |

Tudo junto são 75,4 MB. Os compartilhados somam 11,2 MB e são pagos uma vez: `general-runtime.glb`
(7,7 MB, 8 clipes), as 9 texturas de braço e `recoil.json`. **A primeira arma custa 11,2 MB
mais o GLB dela**, entre 12,6 e 17,4 MB.

Onde está o peso: **quase nada é textura.** Por GLB, as imagens somam no máximo 0,24 MB, todas
já em WebP (`EXT_texture_webp`). O resto é geometria skinned e trilha de animação.

Propostas, só documentadas:

1. **Carregar só o equipamento da rodada.** Hoje o preload do boot aquece o cache de GLTF.
   Carregando apenas a arma primária e a secundária da rodada, mais `shared/`, uma sessão
   típica fica perto de 15–20 MB em vez de tocar o catálogo inteiro. A troca no chão carrega
   sob demanda e mantém o legado até o `loadAsync` resolver. Isso já é o comportamento de
   falha do `loadFamilyGltf`.
2. **Meshopt** (`gltfpack -cc` ou `gltf-transform meshopt`), com quantização de keyframes.
   É o maior ganho, porque ataca geometria e animação. O `GLTFLoader` precisa de
   `setMeshoptDecoder`, com o decoder vendorizado em `public/vendor/`, sem CDN. O `general-runtime`
   é o primeiro candidato.
3. **Compressão no fio.** Os GLBs comprimem muito: `general-runtime` vai de 8,04 MB para
   2,00 MB em gzip e 1,36 MB em brotli; `lmg` de 6,47 MB para 1,93 MB e 1,31 MB; `akm` de
   1,49 MB para 0,83 MB e 0,68 MB. Não foi verificado se a Vercel ou a Cloudflare comprimem
   `model/gltf-binary`. O modo `--url=` da régua imprime `INFO compressão no fio`: rode num
   preview antes de decidir. Se vier `nenhuma`, o meshopt vira prioridade, porque o formato
   dele foi feito para ser comprimido depois.
4. **KTX2/Basis: baixo retorno aqui.** As texturas já são pequenas. O ganho seria VRAM, não
   download. Só vale reavaliar se as texturas de braço de `shared/` crescerem.

## O que não foi verificado

- **Upload e download reais no Blob.** Nenhum token foi usado. O caminho HTTP foi exercitado
  contra um servidor local que exige `Authorization: Bearer`. Foram testados arquivo corrompido
  (reprova por SHA), 404 (reprova), token errado (403, reprova) e conexões derrubadas (retry,
  passa). O `--publicar` depende de `@vercel/blob` com `access: 'private'`, e essa API não foi
  exercitada.
- **Cabeçalhos numa Vercel real.** O SP3 avalia o `vercel.json` com o
  `@vercel/routing-utils`, a mesma lib que a Vercel usa para transformar as rotas. O modo
  `--url=` só foi rodado contra um servidor local que aplica essas rotas.
- **Layout do runtime deste ramo (#618).** O `authoredvm.js` daqui ainda pede GLBs de família
  (`ak/ak-runtime.glb`, `grenade/…`) que a árvore do catálogo não tem. Eles continuam dando
  404 e caindo no legado até o runtime do catálogo (lane vm-launch-k) entrar. A entrega segue
  o layout da árvore, como pedido.
- **Tamanho do deploy:** cada deploy passa a levar 75,4 MB a mais em estáticos.
