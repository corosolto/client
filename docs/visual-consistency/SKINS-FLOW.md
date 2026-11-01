# Fluxo de skins — F1/F2/F3/F4

2026-10-31, WT `consistencia-visual-release-20261031`. Escopo desta entrega: F1, F3 e F4 do
`CRITICO-SKINS-FLUXO-R1.md`. F2 foi integrada posteriormente para as facas Caveira/MAGA
em 1P/3P: cobertura da lâmina, rig e orientação longitudinal estão descritos em
[KNIFE-SKINS.md](KNIFE-SKINS.md), com revisão Ego por representação. Esse aceite focal
não aprova todo o catálogo, distâncias ou dispositivos; F1/F3/F4 continuam válidas.

## F1 — trocar lado/personagem perdia o mapa de skins do controlador autorado

`AuthoredViewModels.setProfile` substitui o perfil inteiro (authoredvm.js:496–498) e
`_applyWeaponSkin` lê `this.profile.weaponSkins?.[weaponId]`. Os perfis montados por
`Game._switchTeam` (tecla M) e `Game._trocarPersonagem` (confirmação online) não levavam
`weaponSkins`, então a próxima montagem de arma perdia a pintura equipada, mesmo com
`Game.playerWeaponSkins` intacto.

**Correção:** os dois perfis agora passam `weaponSkins: this.playerWeaponSkins` (mapa
congelado no constructor — passado por referência, sem cópia). Facção, luva e paleta
preservadas como antes.

## F3 — a faca do pack não recebia a própria skin no 3P do jogador

O pack separa `weaponSkins` de `knifeSkin`; o boot guarda a faca em `playerKnifeSkinId`
(1P já usa via `KnifeMeleeViewModel`). `_ensurePlayerTP` resolvia TODA arma por
`playerWeaponSkins[w]` — para `w==='knife'` isso é `null` e o `buildCharacterModel`
montava a faca com acabamento default.

**Correção:** `_ensurePlayerTP` resolve `w==='knife'` por `this.playerKnifeSkinId`;
armas comuns seguem pelo mapa. O kill-switch `?skin3p=0` continua valendo para os dois
caminhos, e o critério de reconstrução (`_tpArmaSkin !== skinTP`) já cobre a troca.
Bots/remotos não recebem a skin do jogador (ownership inalterado). O boot agora também
pré-carrega `preloadWeaponSkinCandidate(playerKnifeSkinId)` — as marcas dos perfis de faca
precisam da textura no 3P frio.

## F4 — rejeição cedo no `Promise.all` do boot derrubava a barreira com loads pendentes

O `Promise.all` único do boot (main.js) rejeitava no primeiro erro e o `catch` seguia para
`new Game` enquanto outras promessas continuavam pendentes; aplicação com textura fria
podia marcar `userData.weaponSkin` sem o símbolo, sem reattach posterior.

**Correção:** novo `aguardarPreloads(loads)` exportado de `game.js` (mesmo módulo que o
main já importa): espera TODOS os loads independentes, converte a falha de cada um em
`null` e a loga (`console.error('preload da partida falhou parcialmente', …)` — mesma
mensagem de antes). Sem retry, sem engolir falha em silêncio, sem mudar compra/posse.
O bug D1 de cache por skinId NÃO foi reaberto (rejeitado pelo crítico): próximo jogo
recria o Game e o caminho frio normal já faz preload.

## Régua (causal)

`tools/eval/skin-profile-flow-check.mjs` (CLI: `node tools/eval/skin-profile-flow-check.mjs`
nominal; `--mutante=f1|f3|f4-earlyall|f4-missingawait` e/ou
`--probe=f3-entrega|throw-f4`). Formato imposto pelo `CRITICO-SKINS-FLOW-R1.md` (3 P2):
**nominal real verde primeiro via o MESMO CLI** — qualquer modo mutante/probe faz
`spawnSync(process.execPath, [o próprio script])` sem args e exige status 0; nominal não
verde (ou signal) ⇒ exit 3, e a variante nem roda. Mutante edita a fonte REAL em memória
e os MESMOS predicados decidem — nunca o predicado muda de lado. Placar do mutante tem
que ser EXATAMENTE o esperado (falha certa + demais cláusulas verdes); **exceção em
cláusula é infra, não detecção**: TODO catch de seção registra num array `infra` separado
(não preenche `falhou`) e o main recusa com exit 3 ANTES de comparar o conjunto exato —
a raiz literal nunca é decidida por semântica de exceção. CLI desconhecida ⇒ exit 2;
erro de infra (âncora não-única, fonte sumida, nominal não-verde) ⇒ exit 3.

Instrumento: o gate sobe o `game.js` real numa cópia em memória do módulo (arquivo
temporário criado/removido em `node_modules/.skinflow-*`, imports relativos reescritos
para URL absoluta) e instrumenta `buildCharacterModel` com um shim que registra o
`opts` entregue — a mesma instrumentação no nominal e nos mutantes. F1 chama os métodos
reais `_switchTeam`/`_trocarPersonagem` num Game real do arnês.

Cláusulas:

- **F1a/F1b** — `profile.weaponSkins` idêntico ao mapa após `_switchTeam` e
  `_trocarPersonagem` reais.
- **F3a/F3d** — faca: `_tpArmaSkin = playerKnifeSkinId` **e o mesmo ID entregue no
  `opts.weaponSkinId` do `buildCharacterModel` real** (o cache sozinho não prova nada —
  P2-2 do crítico; a pintura só existe se o builder receber o ID).
- **F3b/F3e** — controle positivo AK: cache e entrega pelo `playerWeaponSkins`.
- **F3c/F3f** — sem skin de faca: cache nulo e builder sem `weaponSkinId`.
- **F3g** — kill-switch `?skin3p=0` anula cache E entrega (módulo próprio com QS no boot).
- **F4a/F4b** — `aguardarPreloads` real: barreira continua pendente com rejeição cedo +
  load lento manual (ordem, sem timer/sono); falha logada.
- **F4c** — o bloco REAL de boot do `main.js` executa com promessas controladas:
  nenhum nascimento de Game enquanto a última promessa da barreira está pendente
  (remover o `await` do fonte real = falha). Sem `includes`/regex como aceitação.
- **F4d** — a promessa de `preloadWeaponSkinCandidate(playerKnifeSkinId)` está entre os
  loads **efetivamente passados** à barreira (medido no argumento recebido, não no texto).

Mutantes (todos editam fonte real em memória; o placar tem que bater exato):

| Mutante | Edição na fonte real | Deve reprovar exatamente |
|---|---|---|
| `f1` | remove `weaponSkins: this.playerWeaponSkins` dos perfis de `_switchTeam` e `_trocarPersonagem` | F1a, F1b |
| `f3` | `(this.playerKnifeSkinId \|\| null)` → `(null)` no ternário da faca | F3a, F3d |
| `f4-earlyall` | corpo do `aguardarPreloads` vira `Promise.all(loads).catch(...)` (barreira precoce) | F4a |
| `f4-missingawait` | `await aguardarPreloads([` → `aguardarPreloads([` no bloco de boot do main | F4c |

Probes (não são mutantes do placar; provam independência e a semântica de infra):

| Probe | O que faz | Deve sair |
|---|---|---|
| `f3-entrega` | remove APENAS o `weaponSkinId: skinTP` do call real de `buildCharacterModel` (`_tpArmaSkin` preservado) | reprovar exatamente F3d e F3e (mesmo call site serve faca e AK); F3a/F3b verdes |
| `throw-f4` | roda o bloco real de boot do main e injeta `throw` no meio do calc da seção F4; combinável com `--mutante=f4-missingawait` | exit 3 (infra) — a exceção nunca vira DETECTADO, mesmo com o mutante presente |

**Limites declarados:** o marcador `new Game` do F4c é o nascimento logo após o bloco
extraído — os guardas `lancamentoPerdeu` entre a barreira e o `new Game` real ficam fora
do trecho executado; a cópia em memória resolve `new URL(..., import.meta.url)` relativa
ao temporário (irrelevante: sem rede, o GLB nunca carrega e o spy mede o `opts`, não a
malha); o mutante `f1` não toca a terceira ocorrência de `weaponSkins` (perfil do
constructor), que não é o defeito. **Wiring no `check:fast` cabe ao Root** (package.json
fora dos writers desta lease).

## Não verificado aqui

Captura visual (fontes/imagens fora desta etapa); `?debug=1&weaponskin=…` segue não sendo
evidência da rota autorada (desliga `AUTHORED_VM_ENABLED` — E1 do crítico). F2 permanece
aberto: facas com `markAsset` declarado continuam sem a marca anexada.
