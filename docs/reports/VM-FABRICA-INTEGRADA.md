# Fábrica de armas integrada — uma branch, um PR

**Branch:** `vm/fabrica-integrada` (sobre a `main` alpha.300) · 26/09/2026.
O dono aprovou as armas ("estão muito boas, vamos criar um PR e mergear"). Esta branch junta
todo o trabalho da fábrica num PR só, atrás da chave `VM_LAUNCH` (desligada).

## 1. O que entrou, em ordem

| # | fonte | PR | head |
|---|---|---|---|
| 1 | `vm/integracao-k` (runtime K; já com #643, #640 e #641) | #638 | `2ccecd678` |
| 2 | `vm/fabrica` (ferramentas, lotes 1–2, rodada final, AK golden) | #643 | `4aed6b66f` |
| 3 | `vm/fabrica-variantes` (variantes e plano B; contém `vm/fabrica-bullpup`) | #653, #649 | `26b41fef9` |
| 4 | `vm/maos-por-time` (mãos por time nos rigs K, L e A; `eval:vm-maos-time`) | #661 | `25ae5801b` |
| 5 | `vm/fabrica` de novo, até o fim (ADS da AK golden atrás de `?vmgoldenads=1`) | #643 | `a9d595b34` |

**Fora:** `vm/blob-delivery` (#623). Não há o que juntar: o #623 foi fechado e recriado como
#655, que a `main` já tem como squash (`1f1060b40`, árvore idêntica a `d4732832c` da
`vm/blob-delivery`). Os commits da branch depois disso são só merges da base e autofix.

Depois dos merges: bump de versão para `2.1.0-alpha.0` (pedido do dono) e os consertos da
seção 3.

## 2. Conflitos e como foram resolvidos

Regra: fora do viewmodel, a `main` vence; no viewmodel, vence a branch mais nova dona da arma;
`package.json` é a união dos scripts; arquivo gerado se regera, não se escolhe lado.

### 2.1 Base sintética no merge da `integracao-k`

A `main` recebeu o viewmodel do #623 como **squash**, sem história. Para o git, `main` e
`integracao-k` tinham criado os mesmos arquivos (`authoredvm.js`, `vmconfig.js`, 40 réguas…)
cada uma por conta própria: 64 conflitos add/add, que obrigariam a escolher um lado inteiro
e perder ou o Blob do #623 ou o runtime K. O merge foi calculado contra um commit temporário
com a árvore da `main` e dois pais (`main` + `d4732832c`). Assim o ancestral comum dos arquivos
do viewmodel é o real (`6e93f2d23`, a linhagem `vm-unificado` que as duas têm) e sobraram 31
conflitos de verdade. O commit gravado tem os pais reais (`main`, `integracao-k`): o commit
temporário não entra na história.

### 2.2 Tabela

| arquivo | merge | resolução |
|---|---|---|
| `package.json` | 1, 2, 4, 5 | união: `check:fast`/`check:deploy`/`check:vm` como união de tokens (a `main` trouxe `eval:killstreak`, `eval:obras`, `eval:mapasparados`, `eval:vm-serving-config`…; as branches `eval:vm-launch`, `eval:vm-placar`, `eval:vm-reguas`); scripts novos das branches entram; `build` com o `--assert-clean` da integracao-k (a main não mexeu) |
| `KNOWN-BUGS.md` | 1 | as duas entradas: BUG-180 (cant da PT-38, integracao-k) e BUG-179 (portões do #623, main) |
| `public/js/main.js` | 1, 2 | **igual à main, byte a byte**. A integracao-k trocara os seis `onclick` dos cards de facção por um no laço; mesmo comportamento, mas o `eval:miticos-lobisomem` (verde na main) procura `pickTeam('M')` e reprovava. Não é viewmodel: main vence |
| `public/js/game.js` | 1 | agendamento ocioso do preload: o da main (`typeof requestIdleCallback`); o resto do arquivo é o runtime K |
| `public/js/vmattach.js` | 1 | comentário da integracao-k (cita o BUG-180, que agora existe) |
| `map_atacadao.js`, `map_ferrovelho.js`, `map_piscina.js`, `graffiti_layout.js`, `graffiti_census.json`, `pickup_check.json`, `map-contrato-check.mjs` | 1 | main |
| `char_probe.json`, `map_check.json`, `mat_check.json`, `mat_scenes.json` (sem conflito textual) | 1 | main: medição de mapa/personagem que a integracao-k tinha de um merge antigo |
| `docs/reports/MAPAS-PRS-TESTAVEIS-2026-09-10.md` | 1 | fora (a main apagou; voltava pela integracao-k) |
| `public/models/weapons/deagle.glb`, `revolver38.glb` (modelos de mundo) | 1 | main (as duas consertaram o MAT1; mundo não é viewmodel). `WORLD_VER` regerado com os bytes deles |
| `tools/eval/serve.mjs` | 1 | varredura genérica de atributo da integracao-k + servidor da main (com o shell `/eval-character.html` e o `stripTypeScriptTypes`) |
| `tools/eval/authored-transition-check.mjs` | 1 | integracao-k inteira (a régua é do runtime K; a da main media o runtime do #623) |
| `tools/eval/vm_kick_sim.json` | 1 | integracao-k (gerado pela régua do viewmodel) |
| `public/js/authoredvm.js` | 5 | as duas constantes: `GOLDEN_QS` (`?vmgolden=ak`, #661) e `GOLDEN_ADS` (`?vmgoldenads=1`, fábrica) |
| `tools/eval/vm-reguas-placar*.json`, `artifacts/vm-reguas/PLACAR.md` | 5 | re-medidos na árvore integrada (seção 3) |
| README, STATUS, `docs/docs/*`, `docs/i18n/*`, `ARCH.generated.md`, `tools/eval/ARCH.md` | todos | regerados (`npm run docs`, `npm run arch`) |

Sem conflito textual: o merge das variantes (3) e o resto dos arquivos do viewmodel.

### 2.3 Geradores conferidos na árvore integrada

`vmfabrica.js` (de `fabrica-candidates.json`, 24 produtos: igual), `vmbytes.js` (igual),
`goldenver.js` (15 GLB, em dia), `vmsharedver.js` (11 arquivos, igual), `weaponver.js`
(`--so=grenade`: só o `WORLD_VER` da deagle/revolver38 mudou, pelo item acima).

## 3. Consertos que a integração pediu

- **`eval:vm-foundation`** cobrava o estado de antes do #661 (golden sem atlas de time, 48
  atlas). Agora cobra o atlas pelo layout do próprio rig (`handLayoutOfMesh`), o molde
  GoldSrc/retarget fora dele e os 108 atlas versionados (K 54 · L 18 · A 36).
- **Placar das réguas de imagem.** O da fábrica foi medido com os produtos K de antes do #640;
  a árvore integrada serve os do #640 (`vmbytes.js` da integracao-k), então o `eval:vm-placar`
  reprovava P1 (entradas mudaram) e P2 (células vermelhas cujas dívidas o #640 tinha fechado).
  Re-medido nas duas proporções: ver seção 5.

## 4. Segurança de produção

- **`VM_LAUNCH = false`** (`public/js/data/vmconfig.js`). Nenhum `ready` mudou: família
  `ak`, `pistol`, `grenade` prontas, `akm`/`m92` `ready:false`, faca `ready:true` — igual nas
  quatro branches de origem.
- **Sonda no jogo real, sem parâmetro de revisão** (arma por arma, 26 + granada):
  - integrada: `VM_RUNTIME.mode = legado`, nenhum controlador autorado nem faca autorada; as 27
    no legado.
  - **main hoje: NÃO é só legado.** Sem `vmlaunch.js`, o portão é por família (#618): a `ak`
    serve a golden pública (`gold#ak`, `coro/ak-hires.glb`) e a faca autorada aparece mesmo
    sem catálogo privado; a `pistol` tenta `pistol#pistol` (privado; sem Blob publicado não
    carrega e fica no legado).
  - **Consequência do merge:** AK e faca voltam ao legado em produção até o `VM_LAUNCH`. É a
    regra tudo-ou-nada do dono (23/09, `eval:vm-launch`), que a integracao-k já trazia: nada
    de duas linguagens de mão na mesma partida. Se o dono quiser manter a AK golden e a faca
    em produção até o lançamento, é uma decisão dele (não mexi em chave nem `ready`).
- **Nada licenciado no Git:** `git diff --stat origin/main` não acrescenta nenhum `.glb`,
  `.fbx`, `.blend` ou `.unitypackage`. Os 90 binários novos são os atlas de mãos por time
  (`public/models/viewmodels/coro/hands/{pistol,ak,knife}/*.webp`, pintura do projeto sobre as
  UVs). `eval:vm-foundation` verde: "nenhum asset privado entrou no Git", "produtos K de AK,
  faca e granada ficam fora do Git". `public/private-assets/` segue no `.gitignore`.
- **Build sem token degrada:** `scripts/fetch-viewmodels.mjs` sem `BLOB_READ_WRITE_TOKEN`
  avisa e sai 0 ("o jogo publicado cai no viewmodel LEGADO"). O manifesto
  (`tools/viewmodels/vm-assets.manifest.json`, 63 entradas) foi regravado sem rede e segue
  **sem `blobBase`**: nada foi publicado. Upload no Blob é do dono.
- Sem segredo: nenhum token no diff (só nomes de variável).
  `git diff --unified=0 origin/main HEAD | gitleaks stdin --redact` não encontrou segredo
  (27/09). A varredura de todo o histórico encontra alertas antigos de
  `public/js/graffiti_layout.js`; nenhum apareceu no diff desta integração.
  Comparação dos objetos `VM_FAMILY` e `VM_WEAPON` com a `main`: 16 famílias e 25 armas
  compartilhadas, **zero mudanças de `ready`**; `VM_LAUNCH=false`.

## 5. Réguas: integrada × main

Rodadas em 27/09, Node 23.6.0 (`/opt/homebrew/bin/node`), baseline destacada e limpa em
`worktrees/vm-fabrica-integrada-base` no SHA `5b9c9bec3` (`origin/main`). Logs completos
ficam fora do Git em `artifacts/vm-fabrica-integrada/gates/`.

| portão | integração | main | conclusão |
|---|---|---|---|
| `check:fast` | 164/167; vermelhos `eval:mapid`, `audio:check`, `eval:audiovoicemix` | os três reprovados isoladamente com as mesmas mensagens | somente falhas herdadas; log `check-fast.log` (SHA-256 `b1f9d79b94c162f38d8715eb0be7f1ab4e3dd34b39b81b508999f715242c0491`) |
| `check:deploy` | 46/46 verde | comparação desnecessária: integração inteira verde | log `check-deploy.log` (SHA-256 `1b25b582eff9981160fb573b549761d8f9685ab174ccf8e830c8a41042692ff2`) |
| `check:vm` | 8/9: só `eval:vm-serving` vermelho; `eval:vm-reguas` verde em 1026 s | serving vermelho para 11 GLBs de família e uma cobrança espúria de pistola baked | `check-vm.log` (SHA-256 `cc2097aed2d5fccf73c0dd08b7b02539af1d43fa174e96ac590618cea8fc4339`); após conserto da sonda, serving tem só os mesmos 11 GLBs de família ausentes |
| `eval:vm-launch` | verde, mutante `ak-servida-pelo-k` vermelho | script inexistente | `eval-vm-launch.log` |
| `eval:vm-placar` | 26 armas em 3:2 e 16:9; 29 células vermelhas atribuídas, 0 falhas de placar | script inexistente | `eval-vm-placar.log` |
| `eval:authored-vm` | 26 armas, 15 famílias, 0 falhas | 26 armas, 15 famílias, 0 falhas | `eval-authored-vm.log` |
| `eval:vm-cache` | verde | vermelho, chaves de bytes/caches ausentes | integração corrigiu a regressão; `eval-vm-cache.log` |
| `eval:vm-orientacao` | verde; mutante original vermelho nas quatro armas esperadas | script inexistente | `eval-vm-orientacao.log` |
| `eval:vm-maos-time` | verde: passe principal sem falhas, sonda de escala verde; mutantes `golden-sem-time` (6), `faca-time-errado` (12), `atlas-trocado` (2) vermelhos | script inexistente | `eval-vm-maos-time.log` (SHA-256 `5dc3d363b0037e57190c13b09fdf36c726914a93654eb4ca9b8f0b4b4e0fa202`) |
| `eval:vm-mira-janela` | P90 e LMG verdes (1 px da cruz); mutante `janela-fora` vermelho (P90 a 78 px) | script inexistente | `eval-vm-mira-janela.log` |
| `eval:vm-mira-golden` | AK golden verde em 3:2 e 16:9 (8 px da cruz); mutante `golden-mira-acima` vermelho (234 px) | script inexistente | `eval-vm-mira-golden.log` |
| `eval:vm-manga-tela-fabrica` | vermelho: Uzi 0,63% de extensão no fim da recarga vazia; teto 0,5% | script inexistente | ressalva já registrada em `VM-FABRICA.md` §7.3; `eval-vm-manga-tela-fabrica.log` |
| `eval:vm-foundation` | 23/23 verde (inclui 108 atlas públicos e nenhum asset privado no Git) | não comparado | `eval-vm-foundation.log` |

O mutante `p90-tubo` da régua de manga também ficou vermelho (extensão 3,51%).
O script `eval:vm-manga-tela-fabrica` usa `&&` e por isso não chegou a esse mutante
após reprovar na Uzi; ele foi executado isoladamente. A falha de Uzi é dívida
visual conhecida, sem precedente na `main` porque a régua ainda não existe nela.

O `authored-serving-check.mjs` antigo cobrava `*-baked-runtime.glb` também de armas
com `runtime:'family'`, embora `authoredvm.js:urlForKey` sirva o GLB da família.
Isso inventou três falhas novas (MP5, Deagle, .38) e uma na baseline (pistola).
O commit `65653de93` alinhou a sonda à rota real. A execução isolada depois do
conserto mostrou só os 11 GLBs de família ausentes que já faltavam na `main`;
o mutante `familia-fantasma` trocou a granada presente (200) por um caminho
ausente (404) e aumentou a contagem de falhas de 11 para 12.

## 6. Overlay privada da revisão local

`~/csbrasil-private-assets/generated/viewmodels-fabrica-integrada/overlay` — só hardlinks,
nenhuma overlay de outra branch foi tocada. 79 arquivos: os comuns (idênticos em todas as
overlays de origem), os produtos K do #640 (de `viewmodels-w3-pose`: akm, carbine, g3, mosin,
p90, rem700, scar, shotgun, svd, uzi, os bytes que o `vmbytes.js` pede) e os 24 produtos da
fábrica escolhidos pelo sha do `vmfabrica.js`: akm, awp, carbine, g3sg1, m400, m92, md97,
mosin, rem700, revolver38, scar, sks e uzi de `viewmodels-fabrica-variantes`; deagle, famas,
g3, lmg, m4, mp5, p90, pistol, shotgun, svd e tavor de `viewmodels-fabrica`.

## 7. Continuidade do handoff de 27/09

**Objetivo:** integrar as 26 armas e mãos por time num PR para `main`, validar contra a
baseline, fazer merge commit apenas com CI obrigatório verde no head atual e conferir o
release 2.1.0. Depois, entregar câmera de 3ª pessoa visível, página de revisão e manifesto
privado para o dono, sem ativar `ready`/`VM_LAUNCH` ou publicar no Blob.

**Worktree/branch:** `worktrees/vm-fabrica-integrada`, `vm/fabrica-integrada`; baseline
`worktrees/vm-fabrica-integrada-base` destacada em `5b9c9bec3`. A integração herdada
terminava em `efc892db0`. O checkpoint `1721c26a5` versionou
`.claude/skills/fabrica-armas/SKILL.md` e o link em `AGENTS.md`; `skills:check` e
`docs:check` verdes. Os derivados `npm run docs` e `node tools/gen-arch.mjs` não mudaram.
`65653de93` corrigiu a sonda de serving para respeitar `runtime:'family'`.

**Validado nesta continuação:** `check:fast` só tem as três falhas reproduzidas na main;
`check:deploy` 46/46; segurança estática e diff sem segredo/binário privado; as demais
réguas concluídas estão na tabela acima. Resultado rejeitado: chamar a Uzi de verde na
`vm-manga-tela-fabrica`; a ressalva 0,63% permanece explícita.

**PR aberto:** [#666](https://github.com/corosolto/client/pull/666), não draft. A branch
foi publicada em `2bde96913` com o pre-push `check:deploy` verde (102 s), sem
`PREPUSH=0`. Os portões pedidos no handoff terminaram; as falhas estão atribuídas
na tabela, com uma dívida nova medida da Uzi. Logs persistentes (ignorados pelo
Git) estão em `artifacts/vm-fabrica-integrada/gates/`. O jogo de revisão serve
na porta 4711 e a página de vereditos na 4712.

**Bloqueio de CI:** no head `a046ec515`, o DCO do `pr-fast` reprovou 32 commits
sem `Signed-off-by` trazidos pela ancestralidade das branches de origem. Os
commits desta continuação têm o trailer. O script `scripts/ci/dco_check.py`
verifica todos os commits não merge de `main..HEAD`; um commit adicional no
mesmo branch não corrige esses ancestrais. Não fazer force-push no branch
compartilhado. Próximo passo: abrir um branch limpo sobre `5b9c9bec3` com a
árvore integrada em commit assinado, conferir igualdade de árvore e portões,
e abrir um PR substituto; deixar o #666 com referência ao sucessor.

**Depois do DCO:** acompanhar o CI no head atual e fazer merge commit somente
com checks obrigatórios verdes. Antes do merge, resolver com o dono o retorno
temporário da AK e da faca ao legado com `VM_LAUNCH=false`. Depois, conferir
o release 2.1.0 e fechar com referência ao PR integrado os PRs substituídos.
Nenhum upload ou ativação foi feito.

## 8. Entrega privada preparada para o dono

`tools/viewmodels/vm-assets.manifest.json` lista 63 assets de runtime (24 produtos
`fabrica/`, 159,7 MB), sem `blobBase`. Em 27/09, `upload-viewmodels.mjs --check`
comparou a overlay integrada com o manifesto: **0 novos/alterados, 0 removidos**.
Log: `artifacts/vm-fabrica-integrada/gates/blob-manifest-check.log`.

Depois do merge, o dono obtém `BLOB_READ_WRITE_TOKEN` do projeto Vercel `csbrasil`
(`rubenmarcus-projects`) e executa, no checkout já atualizado:

```bash
node scripts/upload-viewmodels.mjs --publicar \
  --fonte=/Users/ruben/csbrasil-private-assets/generated/viewmodels-fabrica-integrada/overlay/viewmodels
```

O comando grava `blobBase` no manifesto versionado; conferir o diff e publicar essa
mudança antes de exigir os assets. Depois, `VM_REQUIRED=1` em Production. O upload,
essa configuração e a revisão final das 26 armas permanecem com o dono.

## 9. Página local de veredito

`artifacts/fabrica-integrada/index.html` reúne 26 armas e uma granada, mais 18
amostras de mãos por time. Em 27/09 ganhou botões APROVADA/RESSALVA/REPROVADA,
notas por arma e exportação de `vm-fabrica-integrada-vereditos.json`. Os 26 cartões
de arma e as 45 imagens foram contados; HTML e imagens responderam 200 em
`http://127.0.0.1:4712/` (`python3 -m http.server 4712 --directory
artifacts/fabrica-integrada`). No Chromium, clique em APROVADA, nota, recarga da
página e exportação produziram 1/26, estado persistido e JSON com 26 armas, sem erro
de página; o veredito de teste foi apagado. O arquivo e as imagens são artefatos
locais ignorados pelo Git; o JSON exportado é o registro durável que o dono pode
guardar após a revisão.
