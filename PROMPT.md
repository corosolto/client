# PROMPT — sessão nova no CORO SOLTO

> Cole isto como **primeiro prompt** numa sessão nova de CLI, na raiz do repo
> (`/Users/ruben/game`). Ele dá a **ordem de trabalho**; o [`HANDOFF.md`](HANDOFF.md) dá o
> **contexto e as leis da casa**, e o [`KNOWN-BUGS.md`](KNOWN-BUGS.md) dá o **estado dos
> defeitos**. Atualizado em **2026-08-04**.
>
> *(O prompt histórico — o texto único que gerou a v1 do jogo em 2026 — é
> `docs/historico/PROMPT.md`. Não é este arquivo, e não serve para trabalhar.)*

---

## Antes de escrever a primeira linha

```bash
cat STATUS.md HANDOFF.md KNOWN-BUGS.md      # nesta ordem
cat tools/eval/ARCH.md                       # índice por linha + tabela de conflito do game.js
```

Três regras que já custaram dias neste repo, resumidas — o porquê de cada uma está no
`HANDOFF.md`:

1. **Régua antes do conserto.** Escreva a medição, prove que ela **reprova** o estado atual, só
   então conserte. Intenção que não vira invariante é otimizada para fora na rodada seguinte.
2. **Teto sem procedência é opinião.** Todo número novo cita arquivo de referência + pixel
   medido + o script que reproduz. Três dias já foram gastos perseguindo números asseridos que
   a referência contradizia.
3. **Toda invariante vem com a mutação que a faz ficar vermelha.** Se ela não morde, ela não
   existe — um mutante que desfazia inteiramente uma correção já passou 20/22 verde.

E o específico desta semana:

```bash
npm run eval:vm     # SEMPRE antes de invariants.mjs. Sem isto você mede o viewmodel de ontem
                    # e persegue defeito que não existe (BUG-02: VM5 acusava 26/26 armas fora;
                    # com o JSON regenerado, 3/26).
```

---

## A ordem

A fila abaixo está em ordem de execução. Cada bloco é entregável sozinho — **feche um antes de
abrir o próximo**, e não misture frente visual com frente de rede no mesmo commit.

### 1 · Barato e fecha vermelha (faça hoje)

| | Tarefa | Onde | Régua |
|---|---|---|---|
| 1.1 | Ordem do portão: `eval:vm` antes de `eval:invariants`, ou `invariants.mjs` falha explícita se o JSON for mais velho que o `game.js` | `package.json`, `tools/eval/invariants.mjs` | BUG-02 |
| 1.2 | Bandeira de CTF no HUD de partida de rodadas | `game.js:4161`, `index.astro:589` | **cláusula nova**, com mutação |
| 1.3 | Bot com LOS e sem tiro: mover `hasTurn` para dentro do `if` | `game.js:5361` | BOT8 (já morde) |
| 1.4 | Alvo do CTF derivado de `world.ctfPoints.length` | `game.js:1092` | atualizar `UI4` junto |
| 1.5 | Link do GitHub dentro do jogo (menu + pausa) | `src/pages/index.astro` | — |
| ~~1.6~~ | ~~`.gitignore`~~ **feito em 04/08** — `references/` e `issues/` fora do git | `.gitignore` | — |
| 1.7 | Label de cidade só no clique | `src/pages/mapa.astro` **feito em 04/08** | — |

**1.2 é o pedido mais recente do dono e é o mais visível dos seis.** A causa raiz está
confirmada: `#ctf-hud` nasce escondido e `_updateCtfHud()` faz `remove('hidden')` sem guarda —
e **não existe um único `add('hidden')` para esse elemento em todo o repo**.

**Consequência do 1.6, que vale lembrar antes do item 3:** as telas-alvo da UI saíram do git.
Quem clonar não tem `references/telas/`. O que sobrevive é `tools/eval/ref_ui.json`, com os
números medidos delas — é de lá que a régua tem que ler.

### 2 · Licença e documentos (bloqueia contribuição externa)

Trocar para **AGPL** — decisão do dono, e **reverte** a recomendação de `docs/historico/plans/06 §1.2`, que
argumentava MIT por causa do Steamworks SDK e dos programas de crédito de IA. Se você achar que
a recomendação antiga tem mérito, **diga isso em uma frase e siga com AGPL**: a decisão é dele
e já foi tomada.

Num commit só: `LICENSE`, `README.md:3` (badge), `README.md:155` e `:177`,
`CONTRIBUTING.md:138` (o texto que faz o contribuidor concordar com MIT),
`src/layouts/Layout.astro:235` ("Código (MIT)").

**Antes de mexer:** licença só troca retroativamente com consentimento de quem já contribuiu.
Se houver PR de terceiro mesclado, isso é levantamento — não é linha de comando. Depois, revisar
`README.md` e `CONTRIBUTING.md` (o README ainda descreve um jogo só contra bots).

### 3 · UI contra as telas de referência

Alvo: `references/telas/` (9 PNGs). Medido: `tools/eval/ref_ui.json`. Dois desvios
sistemáticos — **cor** (tokens `--bg-*` azuis h≈253° contra marrom-neutro h 84-129°) e
**escala** (corpo 1,8% da altura contra 1,17%; margens 1,4-2,2% contra 4,5/3,1/3,5%).

Bloqueio conhecido: metade dos scrims do HUD é `rgba(5,8,11,…)` **literal** no CSS. Token e
literal mudam no mesmo commit, ou a tela fica bicolor. **Exige browser** — `#btn-jogar` é
sticky e `.cs-setup` tem largura fixa; mexer em tipografia sem olhar overflow já quebrou tela
aqui.

**Gere a figura, olhe a figura, descreva o que você viu.** Número sem imagem já enganou este
projeto quatro vezes.

### 4 · Formulário de feedback no e-mail do dono

Não existe nada hoje (`src/pages/api/` tem 7 rotas, nenhuma de contato). Decisões antes de
codar, em uma passada: provedor de envio (Resend é o de menor atrito no runtime da Vercel),
onde o formulário aparece (pausa e fim de partida pegam o jogador com o problema fresco; página
do site pega quem já saiu) e **anti-spam** — a rota vai ser abusada. Reuse `src/lib/ratelimit.ts`,
que já conta no Postgres e não em memória de lambda; não invente outro.

### 5 · Multiplayer por WebRTC — **plano antes de código**

O dono quer: o usuário **cria um servidor próprio**, e escolhe entre **público** (aparece numa
lista de servidores) ou **por código** (só convidado entra).

Não existe nenhum netcode no repo (`grep -rl "WebSocket\|geckos\|socket.io"` em `public/js/` e
`src/` volta vazio) e o modelo hoje é client-authoritative, com o anti-cheat vivendo no RPC
`submit_match`. Isto também **contradiz `docs/historico/plans/03`**, que assumia servidor autoritativo 4v4 —
aquele plano precisa ser reescrito ou aposentado, não seguido em paralelo.

**Entregue um plano antes de qualquer linha**, respondendo três coisas:

1. **Topologia** — malha P2P ou host-autoritativo com um par fazendo de servidor? Muda tudo
   sobre trapaça e sobre o custo de quem hospeda.
2. **Signaling e lista pública** — WebRTC não descobre par sozinho. Quem faz o signaling, onde
   mora a lista de servidores públicos, e **quem modera** essa lista. É serviço com custo
   recorrente e com exposição legal; não é detalhe de implementação.
3. **Ranking** — partida P2P **não pode** submeter no `submit_match` como está, ou o ranking
   morre no primeiro fim de semana. As saídas são separar ranking de partida casual, ou
   restringir submissão a servidor oficial. Decida explicitamente.

---

## Antes de entregar qualquer coisa

```bash
npm run syntax
npm run eval:vm                      # SEMPRE antes das invariantes
node tools/eval/invariants.mjs       # ~10-12 min; nenhuma verde pode virar vermelha
node tools/eval/botsim.mjs 60 all    # determinístico; divergência sem explicação = regressão
node tools/eval/ui-check.mjs all
node tools/eval/pickup-check.mjs     # 246 pickups, 0/0/0
```

Estado do portão em 04/08: **36/48 críticas passam**. Vermelhas: VM1, VM3, VM5, VM12, VM16,
VM18, VM18b, VM19, BOT8, CHR1, CHR3, CHR4.

E, ao fechar qualquer item: **atualize `KNOWN-BUGS.md` junto** — bug que sai do código e fica no
arquivo vira mentira em uma semana.

---

## Vetos (do `HANDOFF.md`, repetidos porque são violados)

- **Não reduza o número de armas no chão.** É a única forma do jogador escolher arma — não há
  menu de compra.
- **Não afrouxe teto de invariante** para fechar placar. Se achar que um teto está errado,
  **meça na referência e mostre o pixel**.
- **`AUD1` fica verde.** É a invariante que garante que o auditor mede o que o jogo desenha —
  foi ela que pegou o portão mentindo em 04/08. Mexeu no caminho do viewmodel, estende a `AUD1`
  junto e prova com mutação.
- **O dono acerta mais que a métrica.** Quando ele diz que está errado e o portão está verde, o
  defeito é do portão.
