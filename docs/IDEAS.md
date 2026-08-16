# IDEAS.md — Roadmap comunitário

Ideias válidas pra onde o CS BRASIL pode ir. Quer pegar alguma? Abra uma
issue com a tag da ideia antes de codar (ver `CONTRIBUTING.md`).
Níveis: 🟢 fácil · 🟡 médio · 🔴 grande.

## Prioridade #1: Dificuldades extras

Hoje os bots têm skill fixa. A primeira grande evolução do jogo é ter
**níveis de dificuldade selecionáveis** no menu (antes de qualquer ranking
online — dificuldade é o que dá replayability):

- 🟢 **Fácil** — bots lentos pra reagir (0,8s+), mira ruim, menos dano.
- 🟢 **Médio** (atual) — padrão equilibrado.
- 🟡 **Difícil** — reação 0,2s, mira quase perfeita, strafe rápido, rush
  coordenado em grupo.
- 🟡 **Treta Insana** — Difícil + modificadores: sem crosshair, sem radar,
  friendly fire ligado, uma vida por round (sem respawn).
- 🟡 **Modificadores avulsos** (combináveis com qualquer nível): modo só
  headshot mata, HUD mínimo, HP 50, velocidade ×1.5.

A base já está pronta: `skill`, `reactAt`, `nextShotAt` e dano dos bots em
`js/game.js` são parâmetros fáceis de escalar por nível.

## Gameplay

- 🟢 **Modo CS clássico** — sem respawn dentro do round (eliminação), com
  timer e vitória por eliminação ou tempo.
- 🟢 **Customizar partida** — tempo de round, nº de bots (1×1 até 5×5),
  friendly fire on/off, só faca, só AWP.
- 🟢 **Novos personagens fictícios** — novos arquétipos nos dois times
  (seguindo as regras de conteúdo do CONTRIBUTING).
- 🟡 **Novas armas** — escopeta (spread em cone), rifle automático, granada
  de confete (efeito visual, sem gore).
- 🟡 **Bots mais espertos** — usar cobertura, recuar com HP baixo, rush
  coordenado em grupo.
- 🟡 **Killcam / replay** — ver a kill do ângulo do matador por 3s.
- 🟡 **Conquistas locais** — primeiro headshot, 10 kills de faca, etc.
  (localStorage).

## Mapas

- 🟢 **Variações do mapa atual** — o `js/map.js` é declarativo; dá pra gerar
  "noite", "chuva", "carnaval" mudando luz/props.
- 🟡 **Novos mapas temáticos** — estádio de futebol, praia com calçadão,
  festa junina, terminal de ônibus. Mesmo esquema simétrico de arena.
- 🟡 **Editor de mapa** — exportar/importar layout em JSON.

## Gráficos & tecnologia

- 🟡 **Modelos de maior qualidade via Blender + MCP** — gerar personagens e
  props em GLB com o Blender MCP (pipeline assistida por IA) e carregar no
  lugar dos bonecos de caixas, mantendo a mesma API (`buildCharacter`).
- 🟡 **PWA offline** — service worker cacheando o jogo inteiro.
- ✅ ~~**Site Astro ao redor do jogo**~~ — FEITO: landing `/`, `/personagens`,
  `/como-jogar` e API routes `/api/*` (SSR) pro ranking. Próximos passos:
  ligar o Supabase e a página de ranking/mapa públicos.
- 🔴 **Port Unity/Godot** — cliente separado pra builds mobile/desktop,
  compartilhando assets e conceitos (o web continua sendo o principal).
- 🔴 **Mobile** — controles touch (joysticks virtuais, aim assist).
  Depende de decisão de engine (ver port acima).

## Online & backend (repo privado futuro)

- 🟡 **Ranking online** — leaderboard global e por semana (Supabase: auth +
  Postgres). Validação anti-cheat no servidor.
- 🟡 **Mapa da treta ao vivo** — presença em tempo real por cidade num mapa
  Leaflet (Edge Function + GeoIP; geo aproximado, sem IP bruto, histórico
  agregado — schema já preparado em `supabase/schema.sql`).
- 🟡 **Perfis de jogador** — nick único, stats, personagem favorito.
- 🔴 **Multiplayer real** — salas 4×4 via WebSocket/WebRTC com servidor
  autoritativo. **Alternativa sem servidor (dica do Leonardo G. Sato, 22/07):
  [trystero](https://github.com/dmotz/trystero)** — P2P WebRTC com rendezvous
  público (Nostr/MQTT/IPFS) só pro sinal; depois tráfego direto entre pares.
  Bom pra spike 1v1/salas pequenas: 1 peer vira host (roda bots+hitreg), sem
  backend; casar com Supabase p/ ranking/lobby. Ressalvas: NATs hostis sem
  TURN próprio, anti-cheat fraco (host confiável), netcode de estado/interpolação
  fica por nossa conta.
- 🔴 **Clans e torneios** — tabela de confrontos, temporadas.

## Áudio & conteúdo

- 🟢 **Novos packs de voz** — mais falas fictícias por time (sempre originais
  ou licenciadas, ver regras de conteúdo).
- 🟢 **Novos grafites/pôsteres** — slogans fictícios em `js/textures.js`.
- 🟡 **Trilha sonora procedural** — música de menu gerada em WebAudio
  (funkão 8-bit?).

## Governança

- 🟢 **Traduções** — EN/ES do UI (o jogo é pt-BR first).
- 🟢 **Acessibilidade** — modo daltônico, remapear teclas, escala de HUD.
- 🟡 **CI** — GitHub Actions: syntax check + smoke test headless a cada PR.
