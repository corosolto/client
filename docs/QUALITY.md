# QUALITY BAR — CS BRASIL vs ev.io

Referência: ev.io (three.js). Critérios mensuráveis por sistema, em ordem de impacto.
Cada item fecha com evidência (vídeo/screenshot/número) antes de ser dado como pronto.

## 1. Movimento (impacto: ALTÍSSIMO)
| # | Item | Estado atual | Barra (ev.io) | Critério de aceite |
|---|---|---|---|---|
| M1 | Aceleração/atrito | velocidade instantânea fixa (CS 1.6) | rampa suave de aceleração, atrito no chão | vel atinge max em ~0.15–0.25s, para com atrito visível |
| M2 | Air control | pulo sem controle | controle parcial no ar | mudar direção no ar altera trajetória de forma visível |
| M3 | Sprint/FOV | FOV fixo | sprint com FOV kick sutil | FOV sobe ~5° correndo, volta suave |
| M4 | Landing dip | nenhum | camera abaixa ao pousar | dip de ~5cm com retorno em ~0.15s |
| M5 | Head bob | seno simples | bob ligado à velocidade/cadência | bob proporcional à vel, some parado |

## 2. Gun feel (impacto: ALTÍSSIMO)
| # | Item | Estado atual | Barra | Critério |
|---|---|---|---|---|
| G1 | Recoil padrão | kick simples | padrão por arma (sobe + volta) | padrão de recuo distinto AK vs AWP, retorno ao ponto |
| G2 | ADS transição | ease linear | curva suave (easeOut) | ADS entra/sai em ~0.15s com curva não-linear |
| G3 | Viewmodel bob/sway | bob básico | sway por rotação do mouse | arma balança com o mouse, defasada |
| G4 | Hit feedback | hitmarker + número | hitmarker + dano direcional + kill confirm | indicador direcional de dano na tela |
| G5 | Muzzle/tracer | existe | nitidez + impacto claro | tracers legíveis, impacto com feedback |

## 3. Leitura visual (impacto: ALTO)
| # | Item | Estado atual | Barra | Critério |
|---|---|---|---|---|
| V1 | Tone mapping | nenhum (linear) | ACES | cena com contraste/rolloff de highlight |
| V2 | Sombras | 2048 shadow map | nítidas, sem acne/ghost | sombras de personagens/prédios limpas |
| V3 | Céu/atmosfera | sprite de sol + fog simples | gradiente + névoa coerente | céu com gradiente, fog com distância certa |
| V4 | Contraste/cor | branco lavado | valor estruturado (lê silhueta) | landmarks legíveis a 50m+ |

## 4. Animação (impacto: ALTO)
| # | Item | Estado atual | Barra | Critério |
|---|---|---|---|---|
| A1 | Idle/andar | hold pose + walk/run | transições suaves entre estados | fade idle↔walk↔run sem pop |
| A2 | Foot planting | timeScale por clipe medido | pés plantam (sem deslize visível) | vídeo: zero deslize percebido em walk/run |
| A3 | Morte | clip de morte | queda convincente | corpo cai com peso, some depois |

## 5. UI/HUD (impacto: MÉDIO)
| # | Item | Estado atual | Barra | Critério |
|---|---|---|---|---|
| U1 | Kill feed | básico | feed nítido com arma | feed mostra arma usada, fade |
| U2 | Dano recebido | vinheta | indicador direcional | arco/flash na direção do tiro |
| U3 | Scoreboard | tabela simples | leitura em 1s | ranking limpo, ping/clan legível |

## 6. Performance (impacto: BASE)
| # | Item | Estado atual | Barra | Critério |
|---|---|---|---|---|
| P1 | FPS | não medido | 60fps estáveis | ≥58fps em hardware de referência |
| P2 | Frame pacing | não medido | liso | p95 frame time < 18ms |
| P3 | Bundle/load | não medido | abre rápido | first paint do jogo < 3s em 4G |

## Ordem de ataque
1. M1–M5, G1–G5 (feel central — onde o jogo mais ganha na hora)
2. V1–V4 (fica "caro" na hora)
3. A1–A3
4. U1–U3
5. P1–P3 (benchmark contínuo a cada fase)

## Status medido (2026-07-20, branch feat/evio-feel)
- **M1–M5 ✅** acel 55/12, atrito contínuo, air control, landing dip (verif. 0.86 @ -12),
  sprint FOV (já existia), bob escalonado.
- **G1–G5 ✅** recoil com retorno (verif. 0.024→0), ADS ease (existia), sway do viewmodel,
  dano direcional (verif. rotate=π/2 à direita), tracers (existiam).
- **V1–V4 ✅** ACES (já existia) + contraste (hemi 0.82/sol 1.65); sombras PCFSoft 2048;
  céu gradiente + fog coerente (já existiam); landmarks legíveis (mapeval).
- **A1–A3 ✅** fades entre estados; foot planting (refs medidos: walk 0.78/run 1.92);
  death clip.
- **U1–U3 ✅** kill feed com arma+fade; dano direcional (novo); scoreboard ordenado
  por kills, números monospace alinhados, linha do jogador destacada.
- **P1–P3 📐 baseline** (`studio benchmark 10`): 98 draw calls, 316.685 tris,
  108 geometrias, 89 texturas — dentro do orçamento web (cena <500k tris).
  FPS real: medir no hardware do usuário (headless swiftshader não é representativo).
