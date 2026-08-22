# Áudio ambiente (vida 1, plans/22)

Loops posicionais e one-shots de bioma do `public/js/soundscape.js`. Os 16 sons
de natureza/cidade são **CC0** (Freesound, preview lq 128kbps, filtro
`license:"Creative Commons 0"` na busca — verificação 19/08/2026). O `funk-bar.mp3`
é **geração Mint** (projeto CSBRASIL Audio Original, asset original por prompt,
licença de assinante Mint Pro — não existe funk instrumental CC0; chat:
<https://mint.gg/chat/ph75v74kr4gx586vr21b1e4qq98csn32>). Esta pasta é
gitignored (regra do `public/audio/`): os binários shipam pelo audio-pack.zip;
só este FONTE.md é versionado (exceção no `.gitignore`).


| arquivo | título do som | autor | URL da página | ID | preview URL | duração medida |
|---|---|---|---|---|---|---|
| grilos.mp3 | Ambiance_Nature_Night_Cricket_Calm_Loop_Stereo.wav | Nox_Sound | https://freesound.org/people/Nox_Sound/sounds/637083/ | 637083 | https://cdn.freesound.org/previews/637/637083_9250976-lq.mp3 | 59.86s |
| passaros.mp3 | Windy nature ambience, with birds chirping (TASCAM stereo XY) | Khanyisile56 | https://freesound.org/people/Khanyisile56/sounds/707499/ | 707499 | https://cdn.freesound.org/previews/707/707499_14710583-lq.mp3 | 129.50s |
| vento.mp3 | Soft Wind | florianreichelt | https://freesound.org/people/florianreichelt/sounds/459977/ | 459977 | https://cdn.freesound.org/previews/459/459977_6253486-lq.mp3 | 35.74s |
| ondas.mp3 | By the sea | OSFX | https://freesound.org/people/OSFX/sounds/404696/ | 404696 | https://cdn.freesound.org/previews/404/404696_7583126-lq.mp3 | 78.05s |
| agua-corrego.mp3 | WATRFlow-Ext_Small FLowing Creek_HvD_OwSFX_Loop | Hano_van_Dalen | https://freesound.org/people/Hano_van_Dalen/sounds/767320/ | 767320 | https://cdn.freesound.org/previews/767/767320_15758192-lq.mp3 | 139.27s |
| piscina.mp3 | Water Laps in Tank | craigsmith | https://freesound.org/people/craigsmith/sounds/817173/ | 817173 | https://cdn.freesound.org/previews/817/817173_2524442-lq.mp3 | 62.14s |
| cidade.mp3 | ambience, street, traffic, city, Moscow | AlexanderChe | https://freesound.org/people/AlexanderChe/sounds/362949/ | 362949 | https://cdn.freesound.org/previews/362/362949_6598647-lq.mp3 | 32.38s |
| obra.mp3 | city_scape_construction_piledriver_Hermanni_2.wav | AMPI_sound | https://freesound.org/people/AMPI_sound/sounds/651254/ | 651254 | https://cdn.freesound.org/previews/651/651254_14160594-lq.mp3 | 87.41s |
| hum-indoor.mp3 | Computer Fan Loop | Ezcah | https://freesound.org/people/Ezcah/sounds/242042/ | 242042 | https://cdn.freesound.org/previews/242/242042_1900515-lq.mp3 | 60.67s |
| latido-1.mp3 | Barking Dog | WakabaClamp | https://freesound.org/people/WakabaClamp/sounds/591459/ | 591459 | https://cdn.freesound.org/previews/591/591459_9300632-lq.mp3 | 4.78s |
| latido-2.mp3 | Dog.wav | Weak_Hero | https://freesound.org/people/Weak_Hero/sounds/612858/ | 612858 | https://cdn.freesound.org/previews/612/612858_13194336-lq.mp3 | 3.26s |
| galo.mp3 | Rooster Crow 1 | BenjaminNelan | https://freesound.org/people/BenjaminNelan/sounds/435508/ | 435508 | https://cdn.freesound.org/previews/435/435508_1196020-lq.mp3 | 2.21s |
| passaro-1.mp3 | Bird Chatting Smack | qubodup | https://freesound.org/people/qubodup/sounds/812025/ | 812025 | https://cdn.freesound.org/previews/812/812025_71257-lq.mp3 | 1.90s |
| passaro-2.mp3 | Bird Freaking Out | qubodup | https://freesound.org/people/qubodup/sounds/812026/ | 812026 | https://cdn.freesound.org/previews/812/812026_71257-lq.mp3 | 1.85s |
| panela.mp3 | Pots and Pans Clatter 1 | OwlStorm | https://freesound.org/people/OwlStorm/sounds/209002/ | 209002 | https://cdn.freesound.org/previews/209/209002_140737-lq.mp3 | 3.71s |
| buzina.mp3 | 05 Horn.wav | 15HPanska_Ruttner_Jan | https://freesound.org/people/15HPanska_Ruttner_Jan/sounds/461679/ | 461679 | https://cdn.freesound.org/previews/461/461679_9679617-lq.mp3 | 3.58s |
| funk-bar.mp3 | funk-bar (tamborzão instrumental abafado) | Mint audio gen | https://mint.gg/chat/ph75v74kr4gx586vr21b1e4qq98csn32 | xd745m189rxh0wfv21tcfd22q98cs3tq | https://cdn.mint.gg/audio/xd745m189rxh0wfv21tcfd22q98cs3tq/funk-bar-8fdc01-f30c8badaba82fde.mp3 | 45.04s |

## Notas de seleção

- A lista pedia 15 arquivos mas enumera 16 (9 loops + 7 one-shots); os 16 foram baixados.
- `hum-indoor.mp3`: o primeiro candidato ("air conditioner hum", kyles 177726) foi
  descartado por conter vozes distantes no início; os loops de ar-condicionado puros
  eram curtos demais (4-10s). Ficou "Computer Fan Loop" (60s, sem voz).
- `piscina.mp3`: a query original ("water splashing pool gentle loop") não tinha
  resultado CC0 bom; usado "Water Laps in Tank" da query alternativa "water lapping/pool water loop".
- `cidade.mp3`: candidatos longos demais (604s, 2585s) foram rejeitados pelo teto de 180s.
- Nenhum item FALHOU — todos os 16 têm fonte CC0 verificada.
