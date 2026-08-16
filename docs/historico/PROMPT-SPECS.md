# PROMPT — Spec completo de produto e técnica: CS BRASIL

> Cole o texto abaixo no ChatGPT. Ele descreve o jogo inteiro — produto e técnica —
> para que o modelo entenda o projeto sem precisar ver o código.

---

# CS BRASIL: Treta Suprema — Especificação de Produto e Técnica

## 1. O que é

CS BRASIL é um FPS de arena gratuito que roda 100% no navegador, inspirado no Counter-Strike 1.6 (especialmente o awp_map), reimaginado como **sátira política brasileira cartunesca**: dois times — **Petistas** (vermelho) × **Bolsonaristas** (verde/amarelo) — se enfrentam em arenas que parodiam cenários culturais do Brasil. É teatral e absurdo, sem gore, sem pessoas reais, sem marcas reais: todos os personagens são arquétipos fictícios de internet/política.

Produção: https://www.csbrasil.online

## 2. Regras de conteúdo (tom)

- Sátira política, não violência política real: tudo exagerado e cômico.
- Proibido usar pessoas reais, rostos reais, partidos, slogans de campanha, marcas ou logos reais. Lojas/produtos são sempre paródias renomeadas (ex: atacarejo "HAVÃO").
- Sem gore: mortes são quedas teatrais; feedback é via sons e textos engraçados.

## 3. Loop de jogo (como funciona)

1. **Menu principal** (fundo 3D animado do mapa): o jogador digita o **nick** (obrigatório), opcionalmente conecta redes sociais (X, GitHub, Instagram, LinkedIn etc. — só o @, a URL é montada automática; avatar puxado via unavatar quando possível ou upload de foto), escolhe **mapa** e **modo de armas** em dropdowns.
2. **Seleção de time** (estilo CS 1.6): Petistas ou Bolsonaristas.
3. **Seleção de personagem**: cards com **preview 3D animado** do modelo (não é imagem 2D — é o próprio modelo do jogo renderizado no menu).
4. **Partida 4×4**: jogador + 3 bots aliados × 4 bots inimigos.
5. **Rounds de 99 segundos**, countdown "VALENDO!", respawn em 2,5s após morrer. Placar por rounds; **vence quem ganhar 3 rounds**.
6. **Fim de partida**: tela de resultado com stats (rounds, kills, mortes) e botões Revanche/Menu. Stats são enviadas ao ranking global (Supabase) com validação anti-cheat no servidor.
7. Durante o jogo: **TAB** mostra o scoreboard estilo CS; **M** troca de time a qualquer momento (abre a seleção de personagem do novo time); **E** pega armas do chão.

## 4. Times e personagens (5 por lado)

**Petistas (vermelho):**
- **Esquerdomacho** — barba, óculos, ecobag, bottons, cachecol vermelho, postura acadêmica.
- **Líder do Sindicato** — mais velho, boné vermelho, colete com patches fictícios, megafone.
- **Líder do MST** — boné vermelho, roupas práticas, mochila, bandeira.
- **Doutora do SUS** — personagem feminina, jaleco/estetoscópio estilizado.
- **Jovem Místico** — visual místico/hippie contemporâneo.

**Bolsonaristas (verde/amarelo):**
- **Caminhoneiro** — camisa do Brasil, boné, óculos escuros, luvas de trucker, silhueta pesada.
- **Influencer de Dubai** — loira, óculos escuros, acessórios brilhantes, pose de selfie.
- **Cantor Sertanejo** — chapéu de cowboy, fivela brilhante, capa de violão nas costas.
- **Tia Zilá** — senhora de verde/amarelo, óculos escuros grandes, celular com stickers de correntes de zap.
- **Coach Quântico** — visual de coach motivacional quântico.

Cada personagem tem silhueta e paleta próprias, segura rifles, e tem animações procedurais de idle/walk/tiro/morte. Versão atual dos modelos ("characters v2"): cabeça esférica, torso afunilado, arma segurada com as duas mãos — estilo low-poly mas com proporções mais humanas (menos "Minecraft").

## 5. Arsenal e modos de arma

Loadout padrão: AWP + pistola + faca (teclas 1/2/3). Armas espalhadas pelos mapas podem ser capturadas com **E** (respawn do pickup: 8s). Quando alguém morre, **dropa a arma** no chão.

| Arma | Apelido | Dano | Pente | Cadência | Notas |
|---|---|---|---|---|---|
| AWP | "DELIBERADOR" | 400 | 5 (+25) | 1,7s | scope (botão direito), zoom overlay, recoil forte, tracer visível |
| AK-47 | "BATE-ESTACA" | 33 | 30 (+90) | auto 0,10s | bloom/spread progressivo |
| M4A1 | "REQUINTE" | 31 | 30 (+90) | auto 0,09s | — |
| MP5 | "VASSOURA" | 26 | 30 (+120) | auto 0,075s | — |
| M3 | escopeta | 12×8 pellets | 7 (+32) | 0,9s | pump |
| Deagle | "MARTELO" | 53 | 7 (+35) | 0,28s | — |
| PT-38 | "APITO" (pistola) | 34 | 12 (+48) | 0,24s | sidearm padrão |
| Faca | melee | 55 | — | 0,55s | alcance 2,4m |

**Modos de arma** (dropdown no menu): TODAS / SÓ PISTOLAS / SÓ FACA / SÓ AWP — o modo também filtra os pickups do mapa.

Mecânicas de tiro: hitscan com oclusão pelo cenário, headshots, recoil com recuperação suave, tracers, hit marker, agachar (**Ctrl/C**) melhora a precisão, scope reduz velocidade de movimento.

## 6. Mapas

Na main (produção): **AWP Treta (Praça)** — arena simétrica inspirada no awp_map com praça central ficcional de Brasília, urna eletrônica gigante quebrada como cover, caminhão, boteco, pastelaria, acampamento de tendas, grafitis fictícios, caixas de som — e **Piscinão da Treta** (fy_pool_day, contribuição externa: deck com piscina e fileiras de armas no chão).

Em PRs abertos (testáveis por branch): **fy_sitio** (sítio com lago e pedalinhos), **fy_metro** (estação de metrô SP: trem para, abre as portas, dá pra atravessar por dentro; mezanino com escadas), **fy_masp** (vão livre do museu vermelho na Paulista), **fy_baleia** (praça com escultura gigante de baleia, estilo Faria Lima), **fy_osasco** (calçadão com lojinhas e 12 pombos que levantam voo quando atiram perto), **fy_havan** (estacionamento de atacarejo laranja "HAVÃO" com estátua da Liberdade de loja e ~25 carros de cover).

Arquitetura de mapa: cada mapa é um arquivo `map_*.js` exportando `build(scene, T)` que retorna geometria, colliders (AABB), occluders, spawns por time, pickups de armas, grafo de waypoints (grid + BFS) e opcionalmente um `tick()` para elementos vivos (pombos, trem).

## 7. Bots (IA)

- Navegação por waypoints (grade sobre o mapa com teste de colisão) + pathfinding BFS.
- Roam com eixo próprio→inimigo derivado dos spawns: 85% dos destinos na metade inimiga, 15% exploração livre; ao chegar no destino escolhe outro (bots passeiam pelo mapa todo).
- Combate: aquisição de alvo por linha de visão (até 70m), tempo de reação e precisão por skill (dificuldade 1,5×), strafe lateral; se o alvo está a mais de 25m, **avança em direção** enquanto strafeia.
- Dano dos bots com AWP: 63 (vs jogador) / 100 (bot×bot); headshots existem; bots respawnam como o jogador.

## 8. Visual e nível 3D

- Estética **CS 1.6 modernizada**: low-poly com boas silhuetas, texturas **100% procedurais** (Canvas 2D → CanvasTexture com filtro nearest), nenhum asset externo obrigatório.
- Iluminação por mapa com identidade (ex: fim de tarde quente em Osasco, manhã de sábado no Havão): HemisphereLight + DirectionalLight com shadowmap 2048, fog colorido, céu gradiente.
- Personagens low-poly articulados (animação procedural de andar/atirar/morrer), viewmodel de arma em primeira pessoa com recoil e muzzle flash.
- UI dentro do 3D: radar circular no canto com posições dos times.

## 9. UI (interface)

- Estilo geral: **CS 1.6 / Half-Life dourado** — painéis escuros com acentos dourados, fonte condensada, botões pequenos e bem distribuídos; páginas do site (ranking/perfil/mapa) seguem estética "terminal Y2K" e usam o próprio 3D do jogo como fundo.
- **Menu principal**: logo "CS BRASIL", formulário (nick + rede social + foto), dropdowns de mapa e modo de arma com ícones, botão JOGAR; botões laterais pequenos (Ranking, Mapa, Configurações, Como jogar).
- **HUD**: vida (+100 verde estilo CS), ammo (pente|reserva), nome da arma, timer do round, placar dos times (PET × BOL), radar, crosshair que expande com spread, hitmarker, kill feed, banners de round ("VALENDO!", "PETISTAS VENCERAM A TRETA!"), overlay de scope (círculo preto com retícula) e tela de eliminado com countdown de respawn.
- **Scoreboard** (TAB): tabela completa da partida como no CS.
- **Telas**: seleção de time, seleção de personagem (com preview 3D), configurações, fim de partida.

## 10. Controles

| Tecla | Ação |
|---|---|
| WASD | mover |
| Mouse | mirar (pointer lock) |
| Botão esquerdo | atirar |
| Botão direito | scope/zoom (AWP) |
| Shift | sprint |
| Espaço | pular |
| Ctrl ou C | agachar (melhora a precisão) |
| R | recarregar |
| 1 / 2 / 3 | AWP / pistola / faca |
| E | pegar arma do chão |
| M | trocar de time (abre seleção de personagem) |
| TAB | scoreboard |

Mobile: o jogo mostra uma tela de aviso recomendando desktop (não há controles touch).

## 11. Áudio

- Sons de armas reais do CS 1.6/CS:GO (arquivos próprios em `public/audio/`): AWP (`awp-cs-1-6.mp3`), zoom, clip in/out, USP, faca (slash/hit/deploy), e pasta `weapons/` com o arsenal extra (AK, M4, MP5 etc.).
- **Dublagem satírica**: pastas `petista/` e `bolsonaro/` com subpastas `ingame` (falas "go go go" estilo rádio de CS) e `round` (vinhetas de vitória de round). Ao matar ou morrer, toca fala do lado oposto.
- **Announcer Unreal Tournament** para multikills (double kill → godlike) na pasta `game/`.
- Som de pickup de arma do Half-Life/CS ao começar o round e ao pegar arma.

## 12. Configurações

Persistidas em localStorage: **sensibilidade do mouse** (slider 0.1–3), **volume** (slider), **qualidade gráfica** (low/med/high — afeta sombras/pixel ratio), **falas** (checkbox — desliga só as dublagens dos times, mantém efeitos e a vinheta de vitória), mapa e modo de arma padrão. Acessível no menu e durante o jogo.

## 13. Site, backend e ranking

- **Site Astro** (SSR na Vercel) em volta do jogo: `/ranking` (leaderboard global com avatar, K/D, kills, mortes, headshots, sequência, tempo de jogo, vitórias, lado preferido, paginação), `/u/[id]/[nick]` (perfil público do jogador com card compartilhável — **badge PNG gerado no servidor** com Satori+resvg-wasm — e links sociais), `/mapa` (mapa de calor do Brasil com presença dos jogadores por região, via headers de geo da Vercel + totais gerais).
- **APIs** (Astro server endpoints): `/api/register`, `/api/heartbeat` (presença online), `/api/submit-match` (stats da partida), `/api/leaderboard`, `/api/config`.
- **Supabase Postgres**: tabelas de jogadores/partidas + função `submit_match` que **soma** stats (não sobrescreve), RLS, migrations versionadas.
- **Anti-cheat** (após incidente real com trainer): rate limits, validação de consistência física (kills ≤ 45/round, duração mínima de partida), flags que escondem do ranking stats implausíveis ("stats não enviados: stats implausíveis").

## 14. Specs técnicas

- **Engine de jogo**: Three.js (módulo vendored em `public/vendor/`, importmap — sem CDN, sem build, sem bundler). JS vanilla ES modules. Todo o jogo vive em `public/` e roda em qualquer static server.
- **Arquivos principais**: `public/js/game.js` (loop, física, bots, armas, HUD), `characters.js` (modelos procedurais), `map.js`/`map_*.js` (arenas), `maps.js` (registry), `textures.js` (texturas canvas), `audio.js`, `main.js` (menus/fluxo).
- **Física**: AABB colliders, gravidade, crouch com transição suave de altura da câmera, sprint, coyote básico.
- **Performance**: alvo 60fps+ em Chrome desktop; qualidade ajustável; poucos draw calls por mapa (low-poly + materiais Lambert).
- **Site**: Astro 5 SSR (adapter Vercel), TS estrito, Supabase JS, badge OG com resvg-wasm (fonte embutida — serverless não tem fontes de sistema).
- **Testes**: headless com puppeteer-core + Chrome real (scripts ad-hoc que carregam `?debug=1&auto=TIME,PERSONAGEM&map=ID`, expõem `window.__game` e avançam `g.update(dt)`), syntax check com `node --input-type=module --check`.
- **Deploy**: `git push` → Vercel (site) e o jogo é servido estático de `public/`. Release `audio-pack-v1` com o zip de áudio.

## 15. Como rodar local

```bash
# só o jogo
cd public && python3 -m http.server 8123   # http://localhost:8123
# jogo + site
npm install && npm run dev
```

URL de debug: `?debug=1&auto=B,caminhoneiro&map=fy_havan` (pula menus, entra direto na partida).

## 16. Estado do projeto e roadmap aberto

- Versão v1.12.4. Sete PRs abertos do time principal (6 mapas novos + personagens v2 + fix de exploração dos bots) e **uma decisão estratégica pendente**: PR de contribuidor externo com um **port completo do jogo para Godot 4.7.1** (com testes automatizados) — em avaliação se permanece Three.js, migra ou convive com os dois.
- Próximos passos naturais: multiplayer online real, mais mapas/personagens, melhorias contínuas de bots e anti-cheat.
