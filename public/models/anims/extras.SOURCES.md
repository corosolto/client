# SOURCES — models/anims/extras.glb

Pacote único de estados extras 3P no esqueleto meshy-28. Gerado por `node tools/build-extras-pack.mjs --library=<biblioteca>/index.json`; os GLBs intermediários e FBX não são redistribuídos.

## Catálogo

| Estado | ID do catálogo | Duração | Laço declarado |
|---|---|---:|---|
| strafe_left | mixamo/pro-rifle-pack/walk-left | 1.0000 s | sim |
| strafe_right | mixamo/pro-rifle-pack/walk-right | 1.0000 s | sim |
| walk_back | mixamo/basic-shooter-pack/walking-backwards | 1.4000 s | sim |
| run_back | mixamo/pro-rifle-pack/run-backward | 0.5000 s | sim |
| strafe_left_pistol | mixamo/pistol-handgun-locomotion-pack/pistol-strafe | 0.5667 s | não |
| strafe_right_pistol | mixamo/pistol-handgun-locomotion-pack/pistol-strafe-2 | 0.6000 s | não |
| walk_back_pistol | mixamo/pistol-handgun-locomotion-pack/pistol-walk-backward | 1.0333 s | sim |
| reload_rifle | mixamo/basic-shooter-pack/reloading | 3.3000 s | não |
| reload_pistol | ual/ual1/Pistol_Reload | 1.6667 s | não |
| draw_rifle | mixamo/loose/rifle-pull-out | 2.0333 s | não |
| holster_rifle | mixamo/loose/rifle-put-away | 2.3000 s | não |
| hit_front | ual/ual1/Hit_Chest | 0.3333 s | não |
| hit_back | mixamo/loose/standing-react-small-from-back | 1.2667 s | não |
| hit_left | mixamo/loose/standing-react-small-from-left | 1.2000 s | não |
| hit_right | mixamo/loose/standing-react-small-from-right | 1.0000 s | não |
| hit_head | ual/ual1/Hit_Head | 0.4333 s | não |
| grenade_throw | ual/ual2/OverhandThrow | 1.3333 s | não |
| knife_idle | mixamo/loose/knife-idle | 4.4667 s | sim |
| knife_stab | mixamo/loose/double-dagger-stab | 3.0667 s | sim |
| victory | mixamo/loose/victory | 4.5000 s | sim |
| defeat | mixamo/loose/sad-idle | 2.8000 s | sim |

Ausentes na biblioteca e com fallback procedural/estado atual: `draw_pistol`, `holster_pistol`.

## Licenças

- IDs `mixamo/*`: Adobe Mixamo, uso em jogos e mídia, inclusive comercial; a redistribuição dos FBX brutos não é permitida. https://helpx.adobe.com/mixamo/faq/mixamo-faq.html
- IDs `ual/*`: Quaternius Universal Animation Library, CC0 1.0 Universal. https://creativecommons.org/publicdomain/zero/1.0/

A conversão para meshy-28 preserva `extras.clip.source.id` em cada animação. A mescla reaproveita os nós por nome e elimina cenas duplicadas; o jogo consome somente `g.animations`.
