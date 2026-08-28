# CORO SOLTO: Treta Suprema

[![license: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
[![CI](https://github.com/corosolto/client/actions/workflows/ci.yml/badge.svg?branch=v2%2Falpha-release)](https://github.com/corosolto/client/actions/workflows/ci.yml)
[![pr-gates](https://github.com/corosolto/client/actions/workflows/pr-gates.yml/badge.svg)](https://github.com/corosolto/client/actions/workflows/pr-gates.yml)
[![astro](https://img.shields.io/badge/site-astro-ff5d01?logo=astro)](https://astro.build)
[![three.js](https://img.shields.io/badge/jogo-three.js%20r160-000000?logo=three.js)](https://threejs.org)
[![supabase](https://img.shields.io/badge/ranking-supabase-3fcf8e?logo=supabase&logoColor=white)](https://supabase.com)
[![vercel](https://img.shields.io/badge/deploy-vercel-000000?logo=vercel)](https://vercel.com)
[![Discord](https://img.shields.io/badge/Discord-entrar-5865F2?logo=discord&logoColor=white)](https://discord.gg/fmunXnaj)
[![Telegram](https://img.shields.io/badge/Telegram-entrar-26A5E4?logo=telegram&logoColor=white)](https://t.me/corosolto)

**AI generated & AI friendly** — construído em par com agentes de IA, e cada
commit diz qual escreveu (trailer `Agent:`, convenção em `CONTRIBUTING.md`):

[![Claude Fable 5](https://img.shields.io/badge/agente-Claude_Fable_5-d97757?logo=claude&logoColor=white)](https://claude.com/claude-code)
[![Claude Opus](https://img.shields.io/badge/agente-Claude_Opus-d97757?logo=claude&logoColor=white)](https://claude.com/claude-code)
[![Kimi K3](https://img.shields.io/badge/agente-Kimi_K3-1a1a2e)](https://www.kimi.com)
[![Codex GPT](https://img.shields.io/badge/agente-Codex_GPT-412991?logo=openai&logoColor=white)](https://openai.com/codex/)
[![GLM](https://img.shields.io/badge/agente-GLM-0f62fe)](https://z.ai)
[![Gemini](https://img.shields.io/badge/arte_2D-Gemini-4285f4?logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![OpenRouter](https://img.shields.io/badge/API-OpenRouter-6566f1)](https://openrouter.ai)
[![Tripo3D](https://img.shields.io/badge/3D-Tripo3D-ff6b35)](https://www.tripo3d.ai)
[![Meshy](https://img.shields.io/badge/rig-Meshy-00c4b3)](https://www.meshy.ai)
[![mint.gg](https://img.shields.io/badge/3D-mint.gg-8a2be2)](https://mint.gg)

![CORO SOLTO: Treta Suprema — FPS satírico de navegador com facções brasileiras](public/og-image.jpg)

**FPS gratuito de navegador em Three.js**: 5 facções brasileiras caricatas, 44
personagens originais, 5 mapas satíricos e 26 armas — rounds e Capture the Flag
contra bots, direto na aba. Sem download, sem instalação, sem cadastro.

<!-- BEGIN:GERADO:numeros — não edite à mão, rode `npm run docs` -->

| O que | Quanto | Onde confere |
|---|---:|---|
| Código do jogo | 32.700 linhas em 47 arquivos | `git ls-files public/js/*.js \| xargs wc -l` |
| `game.js` | **6.917** linhas | `wc -l public/js/game.js` |
| `main.js` | 2.702 linhas | `wc -l public/js/main.js` |
| Armas com GLB | 26 | `git ls-files 'public/models/weapons/*.glb' \| wc -l` |
| GLBs de personagem | 45 | `git ls-files 'public/models/characters/*.glb' \| wc -l` |
| Props em GLB | 108 | `git ls-files 'public/models/props/*.glb' \| wc -l` |
| Clipes de animação versionados | 573 | `git ls-files public/models/anims \| wc -l` |
| Personagens jogáveis | 44, em 5 facções | array `CHARACTERS` de `characters.js` |
| Mapas no registro | 13 | objeto `MAPS` de `maps.js` |
| Arnêses visuais em HTML | 15 | `git ls-files 'public/*.html' \| wc -l` |
| Scripts do arnês | 205 | `git ls-files 'tools/eval/*.mjs' 'tools/eval/*.py' \| wc -l` |
| Scripts de pipeline | 55 | `git ls-files 'tools/*.mjs' \| wc -l` |
| Tarefas de entrada escritas | 26 | `git ls-files 'docs/issues/[0-9]*.md' \| wc -l` |
| Versão | `2.0.0-alpha.190` | `public/js/version.js` e `package.json` (batem) |

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `o comando da coluna direita de cada linha`

<!-- END:GERADO:numeros -->

> **Hoje o jogo é só contra bots.** Não existe multiplayer entre humanos: um
> `grep RTCPeerConnection` no repositório devolve zero, e não há netcode em
> `public/js/` nem em `src/`. Multiplayer por WebRTC é a maior frente aberta do
> projeto — quando existir, esta linha muda junto com o código, não antes.

▶ **Jogue:** <https://www.csbrasil.online>

> **O jogo já se chamou CS BRASIL.** É o mesmo jogo — o domínio continua o
> mesmo, e o nome antigo segue registrado como nome alternativo pra quem
> procura por ele.

> Este jogo nasceu gerado por IA a partir de um único prompt —
> [o prompt original está em `docs/historico/PROMPT.md`](docs/historico/PROMPT.md).

---

## Comece por aqui

| Você é… | Leia |
|---|---|
| curioso | esta página, e depois <https://www.csbrasil.online> |
| dev novo (ou agente) | [`STATUS.md`](STATUS.md) → [`docs/README.md`](docs/README.md) → [`CONTRIBUTING.md`](CONTRIBUTING.md) |
| quer entender a stack | [`docs/docs/stack.md`](docs/docs/stack.md) — Three.js, Astro, Supabase, geração de asset, skills |
| quer contribuir hoje | [`docs/issues/`](docs/issues/) — tarefas de entrada com arquivos e critério de aceite |
| quer saber o que está quebrado | [`KNOWN-BUGS.md`](KNOWN-BUGS.md) — defeitos com `arquivo:linha` e passo de reprodução |

**Site de documentação** (Docusaurus, com instrumentação de IA, quality gates e
arquitetura): `cd docs && npm install && npm start` → <http://localhost:3000/docs/>.

## Stack

<!-- BEGIN:GERADO:stack — não edite à mão, rode `npm run docs` -->

| Camada | Ferramenta | Versão |
|---|---|---|
| Motor 3D (WebGL) | **Three.js**, vendorizado | `r160` |
| Jogo | ES modules vanilla, **zero build** | 47 arquivos |
| Site | **Astro** com SSR | `^7.1.1` |
| Hospedagem | adapter **Vercel** | `^11.0.6` |
| Banco | **Postgres gerenciado** (RLS; schema privado, fora do repo) | `^2.110.7` |
| Browser nas réguas | **Playwright** | `^1.62.1` |
| Pipeline de GLB | **gltf-transform** | `^4.4.1` |
| Compressão de malha | **meshoptimizer** | `^1.2.0` |
| Imagem (build e API) | **sharp** · **resvg** | `^0.35.3` · `^2.6.2` |
| Esta documentação | **Docusaurus** | `3.6.3` |
| Runtime de CI | **Node** | `22` |

Three.js sai de `public/vendor/three.module.js` (**sem CDN, sem npm no runtime**). Astro e Vercel de `package.json` + `astro.config.mjs` + `vercel.json`. Dos scripts de `tools/`, **111** importam Playwright, **39** importam gltf-transform e **4** importam meshoptimizer.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `dependencies/devDependencies do package.json · REVISION de public/vendor/three.module.js`

<!-- END:GERADO:stack -->

O detalhe de cada uma — por que o jogo não tem build, como o asset é gerado
(mint.gg, Tripo3D, Meshy, OpenRouter), o que Playwright e gltf-transform fazem
aqui, e o que são as skills de agente — está em
[Stack e ferramentas](docs/docs/stack.md).

## Arquitetura

Um repositório, **duas zonas com regras diferentes**:

- **O JOGO — `public/`** · JavaScript vanilla com ES modules, Three.js
  vendorizado em `public/vendor/` (a revisão está na tabela de stack acima),
  **zero build**. Nunca vira framework.
  **Não existe `public/index.html`:** o HTML do jogo é `src/pages/index.astro`,
  servido na rota `/`. (Este README já afirmou o contrário por meses e mandava
  todo dev novo para o arquivo errado.)
- **O SITE — `src/`** · [Astro](https://astro.build) com SSR na Vercel. Landing,
  ranking global, perfis públicos, páginas de conteúdo e as rotas `/api/*`. Aqui
  framework é bem-vindo — mas o jogo continua intocado.

O ranking e a telemetria vivem num **Postgres gerenciado** (schema privado, fora do repo) — o ranking está
**desligado por flag** hoje, a coleta não parou (ver a seção abaixo). A
`service_role` key fica só no servidor; a `anon` key é pública por design, e a
segurança vem das policies e dos grants por coluna.

Sem contagem na árvore abaixo — os números vivem no bloco gerado lá em cima.
Índice por número escrito à mão desatualiza no primeiro commit; é a mesma razão
de o `tools/eval/ARCH.md` ser gerado.

```
STATUS.md              estado de hoje (leia primeiro)
astro.config.mjs       Astro + adapter Vercel · `site` COM www (canonical)
vercel.json            build, headers de segurança (CSP…) e cache
src/
  layouts/Layout.astro shell do site: nav, footer, CSS global, JSON-LD base
  lib/site.ts          nome, host, descrições e @id de JSON-LD (fonte única)
  lib/supabase.ts      client admin (service_role, só no servidor)
  lib/safe-url.ts      allowlist de avatar + fetch com trava de SSRF
  lib/ratelimit.ts     rate limit durável (contado no Postgres)
  data/jogo.ts         armas/mapas/personagens em forma de dado, pro site
  pages/index.astro    O JOGO, na rota `/`
  pages/ranking.astro  leaderboard (SSR, com cache de CDN)
  pages/u/[...path]    perfil público por jogador + badge PNG
  pages/sitemap.xml.ts sitemap dinâmico, cobre os perfis
  pages/api/*          register, submit-match, leaderboard, badge, avatar…
public/                O JOGO (vanilla, zero build)
  js/ vendor/ models/ style.css robots.txt llms.txt og-image.png
  audio/                 ⚠ NÃO versionado — ver "Áudio" abaixo
tools/                 pipeline de asset (gen-asset, gen-image, otimização de GLB)
  gen-arch.mjs         GERA tools/eval/ARCH.md (índice + tabela de conflito)
  gen-docs.mjs         GERA os blocos numéricos deste README e de docs/
tools/eval/            o arnês de medição e os quality gates de qualidade
docs/                  documentação para devs (Docusaurus) + as issues de entrada
.agents/skills/        skills de agente (.claude/skills/ são symlinks pra cá)
```

**Duas pastas NÃO vêm no clone**, por decisão registrada: `public/audio/` (direitos
incertos) e `references/` (telas-alvo da UI e frames de referência, que ficam só na
máquina do dono). O que sobrevive das `references/` são os **números medidos**:
`tools/eval/ref_ui.json` e `tools/eval/ref_viewmodel.json`, esses versionados. Régua que
precisa rodar em CI lê o JSON, nunca o PNG.

## Rodar localmente

**O site completo** (é o modo que você quer — inclui o jogo):

```bash
git clone https://github.com/corosolto/client.git
cd csbrasil
npm install
cp .env.example .env      # opcional: sem envs, o ranking responde 503 e o resto roda
npm run fetch-audio       # opcional: sem o pacote, o jogo usa sons sintetizados
npm run dev               # http://localhost:4321 — o jogo está em /
```

Build e preview:

```bash
npm run build             # gera dist/ (client + server)
npm run preview           # serve dist/client estaticamente
```

`python3 -m http.server -d public` serve **só os assets** do jogo — o HTML não
está lá. Use `npm run dev`.

## Quality gate de qualidade

Comandos atuais do quality gate: veja [`ARCH.generated.md`](ARCH.generated.md) (gerado — não editar à mão).

```bash
npm run arch         # regenera tools/eval/ARCH.md (índice + tabela de conflito)
npm run docs         # regenera os blocos numéricos deste README e de docs/
```

Nada commita com invariante vermelha. O catálogo do arnês está em
[`tools/eval/README.md`](tools/eval/README.md).

**Documentação que carrega número é gerada.** `npm run docs:check` (dentro do
`check:fast`) reprova quando um bloco gerado diverge do código — foi assim que
uma linha afirmando "`game.js` tem 3.234 linhas" sobreviveu até o arquivo
dobrar de tamanho.

> `npm run check` lê GLBs de `public/models/`. Numa árvore sem os assets
> baixados, `eval:invariants` e `eval:vm` falham com `ENOENT` — é ambiente, não
> regressão.

## Knowledge graph com Graphify

O repo agora inclui integração project-scoped do [Graphify](https://github.com/Graphify-Labs/graphify)
para múltiplos adapters:

- Claude Code
- Codex
- OpenCode
- Kimi
- adapters compatíveis com `agent skills` via `.agents/`

Arquivos principais:

- `AGENTS.md` e `CLAUDE.md`: instruções de uso do grafo
- `.codex/`, `.claude/`, `.opencode/`, `.kimi/`, `.agents/`: skills/config por adapter
- `graphify-out/graph.json`: grafo consultável
- `graphify-out/GRAPH_REPORT.md`: resumo navegável
- `graphify-out/graph.html`: visualização local do grafo

Build inicial do grafo:

- foi gerado em modo `code-only`, local e determinístico
- inclui SQL (`supabase/schema.sql` e migrations)
- não usa API externa

Atualizar depois de mudanças de código:

```bash
./scripts/graphify update .
./scripts/graphify cluster-only . --graph ./graphify-out/graph.json --no-label
```

Regenerar do zero:

```bash
./scripts/graphify extract . --code-only --out . --force
./scripts/graphify cluster-only . --graph ./graphify-out/graph.json --no-label
```

Observação: a versão atual do Graphify extrai este repo muito bem em JS/TS/SQL, mas ainda
reporta parsing parcial em arquivos `.astro`. Isso é limitação do extrator atual, não do
projeto.

## Controles

| Tecla | Ação |
| --- | --- |
| W A S D | Mover |
| Mouse | Mirar |
| Shift | Correr |
| **Ctrl ou C** | **Agachar — mira bem mais estável** |
| Espaço | Pular |
| Clique esq. | Atirar |
| Clique dir. | Luneta / ADS |
| R | Recarregar |
| 1 / 2 / 3 | Primária / pistola / faca |
| **Z / X / V** | **Rádio estilo CS (comandos de voz)** |
| **M** | **Trocar de time (a qualquer momento)** |
| Tab | Placar |
| Esc | Pausar |

**Regras**, lidas das constantes de `public/js/game.js`:

<!-- BEGIN:GERADO:regras — não edite à mão, rode `npm run docs` -->

| Regra | Valor | Constante |
|---|---|---|
| Facções · personagens | 5 · 44 (B 9 · C 9 · E 8 · F 9 · U 9) | `CHARACTERS` |
| Mapas no menu | 13 — 3 abrem em rodadas, **10 em captura** | `MAPS` / `ctfMode` |
| Respawn | 2,2 s | `RESPAWN_DELAY` |
| Round | 99 s, 3 vitórias | `ROUND_TIME` / `ROUNDS_TO_WIN` |
| Captura | alvo = **todas as bandeiras do mapa**, 2 rodadas (rede de segurança 480 s) | `capsToWin = ctfPts.length` / `CTF_ROUNDS_TO_WIN` |
| Regeneração de vida | **DESLIGADA — `?regen=1` religa** | `REGEN` |
| Ranking / páginas `/u/` | **DESLIGADOS — é uma flag, volta numa linha** | `RANKING_ON` em `src/lib/site.ts` |

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `constantes de public/js/game.js · RANKING_ON de src/lib/site.ts`

<!-- END:GERADO:regras -->

O menu aceita de 1 a 8 bots por lado (`settings.bots`); o padrão é 4×4. O time
com mais abates leva o round. AWP mata com um tiro em qualquer lugar do corpo.
Multikills disparam anúncios estilo Unreal Tournament.

**Regeneração de vida está DESLIGADA** (decisão do dono, 05/08/2026): vida só
volta com respawn. `?regen=1` religa a regra antiga — inteira, com a simetria
jogador↔bot. Ela foi desligada porque era **invisível**: sem ícone, sem som e
sem linha nas configurações, e regra que o jogador não percebe é
indistinguível de defeito.

Os mapas registrados, e em que modo cada um abre:

<!-- BEGIN:GERADO:mapas — não edite à mão, rode `npm run docs` -->

| Id | Nome no menu | Abre em | Arquivo em `public/js/` | Linhas |
|---|---|---|---|---:|
| `praca_poderes` | Praça dos Três Poderes | rodadas | `map_brasilia.js` | 1.830 |
| `piscina_treta` | Piscina da Treta | rodadas | `map_piscina.js` | 810 |
| `loja_h` | Loja H (Estacionamento) | **captura** | `map_havan.js` | 1.964 |
| `ferro_velho` | Ferro Velho do Zé | **captura** | `map_ferrovelho.js` | 1.888 |
| `quebrada` | Quebrada (Rua do Baile) | **captura** | `map_quebrada.js` | 1.599 |
| `posto_treta` | Posto da Treta | **captura** | `map_posto.js` | 489 |
| `upa_24h` | UPA 24h da Treta | **captura** | `map_upa.js` | 288 |
| `obras_prefeitura` | Obras da Prefeitura | **captura** | `map_obras.js` | 240 |
| `atacadao_treta` | Atacadão da Treta | **captura** | `map_atacadao.js` | 255 |
| `parque_treta` | Parque da Treta | **captura** | `map_parque.js` | 402 |
| `velho_oeste` | Velho Oeste da Treta | **captura** | `map_velho_oeste.js` | 433 |
| `penitenciaria` | Penitenciária da Treta | **captura** | `map_penitenciaria.js` | 247 |
| `treta_no_gelo` | Treta no Gelo | rodadas | `map_gelo.js` | 250 |

**13 mapas registrados** — 3 abrem em rodadas e 10 em captura. `ctfMode` **abre** o mapa em captura, não prende: o jogador troca no menu (é a `MOD1`). Há 15 arquivos `map_*.js` em `public/js/` — arquivo no disco **não** implica mapa jogável.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `objeto MAPS de public/js/maps.js`

<!-- END:GERADO:mapas -->

## Ranking global — DESLIGADO

`RANKING_ON = false` em [`src/lib/site.ts`](src/lib/site.ts). Decisão do dono em
04/08/2026: *"vamos desabilitar o ranking por enquanto, depois a gente ajeita"*.
O motivo é o de sempre nesta base — o modelo é **client-authoritative**, o placar
é forjável, e publicar classificação forjável é publicar número errado.

**É flag, não remoção.** Com `false`:

- `/ranking` e `/u/*` respondem **200 com aviso + `noindex`** — não 404. As URLs
  estão indexadas e vão voltar no mesmo endereço;
- o link some do nav e do rodapé do site;
- `/api/leaderboard` responde `{disabled:true}`; o cliente não conhece a flag,
  ele reage à resposta da API. Uma fonte de verdade, no servidor.

**O que NÃO parou: a coleta.** `submit_match` continua gravando (valida token,
rate limit por nick/IP/dia, tetos absolutos e consistência física) e a telemetria
nova continua medindo. Quando o ranking voltar, o histórico está lá.

- Schema e migrations: [`supabase/`](supabase/) (a contagem está no bloco
  gerado no topo)
- O que foi endurecido no pré-release: [`docs/seguranca.md`](docs/seguranca.md)

A correção definitiva é o servidor de jogo escrever com `service_role` e o RLS
bloquear o cliente; está na fila junto do multiplayer.

## Áudio (`public/audio/`)

A pasta **não é versionada**: as vozes e memes têm direitos incertos, e o
repositório público leva só o código. Sem o pacote, o jogo usa sons
sintetizados e funciona normalmente.

```bash
npm run fetch-audio     # ou: AUDIO_PACK_URL=<zip> bash scripts/fetch-audio.sh
```

O jogo carrega `audio/manifest.json` (veja `audio/manifest.example.json`, esse
sim versionado). Samples originais do CS 1.6 são propriedade da Valve e **não**
são distribuídos aqui.

## SEO / AEO

- `site` com `www` no `astro.config.mjs` — todo canonical sai daí
- `/sitemap.xml` **dinâmico**, cobrindo uma URL por jogador
- `public/robots.txt` e `public/llms.txt`
- JSON-LD: um único nó `VideoGame` com `@id` estável, mais `ItemList`,
  `ProfilePage`/`Person`, `HowTo`, `FAQPage` e `BreadcrumbList` por página
- `Cache-Control` de CDN em `/ranking`, `/u/*` e `/mapa`

## Licenças / créditos

<!-- BEGIN:GERADO:licenca — não edite à mão, rode `npm run docs` -->

O código está sob **AGPL-3.0** (GNU Affero General Public License, versão 3) — é o que vale hoje, e a fonte é o arquivo `LICENSE` na raiz do repositório. Nenhum outro arquivo tem autoridade sobre isso.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `título lido do texto do LICENSE, conferido contra o campo license do package.json`

<!-- END:GERADO:licenca -->

> **Migrado de MIT para AGPL-3.0 em 07/08/2026.** As contribuições feitas antes
> da troca entraram sob MIT — licença permissiva e compatível com a AGPL: elas
> continuam MIT dentro do todo, e o conjunto é distribuído sob AGPL-3.0. Quem
> contribuiu antes não perde nada nem precisa de novo consentimento (a direção
> incompatível seria a inversa).

- Three.js r160 — MIT (© Three.js authors), em `public/vendor/`.
- Código, texturas, personagens e logo: originais.
- Áudios: fornecidos pelo usuário; verifique direitos antes de uso comercial.
  Sons do CS 1.6 **não inclusos** (Valve).
- Paródia independente, sem afiliação com a Valve. Counter-Strike é marca da
  Valve Corporation.

*Feito para rir, não para brigar.*
