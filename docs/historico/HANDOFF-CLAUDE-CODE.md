# Prompt pronto pra colar no Claude Code

> Cole tudo abaixo (a partir de "MISSÃO") num Claude Code aberto na raiz do repo `csbrasil`.

---

MISSÃO: elevar o visual do CS BRASIL ao nível do Krunker.io **mantendo o jogo na web e com load instantâneo**, e **sem descaracterizar** — nada de asset genérico pronto; todo personagem/props é gerado **sob medida** (via Mint) preservando a sátira brasileira do jogo. Você é um engenheiro de jogos web sênior.

## Contexto do projeto
- CS BRASIL: FPS satírico BR estilo CS 1.6, **Three.js vanilla sem build**, em `public/` (entry `public/index.html`, código em `public/js/`). Site Astro na raiz (`src/`), backend Supabase. Deploy Vercel: https://www.csbrasil.online
- Regras invioláveis: (1) **web, load instantâneo** — nunca trocar por Godot nem por asset pesado; (2) **sátira 100% ficcional** — nenhuma pessoa/partido/marca real, tom cartunesco; (3) não quebrar o build Astro nem a API Supabase; (4) baixo download (Krunker é low-poly de propósito).
- O visual atual é ruim porque personagens, mãos e geometria de mapa são **caixas primitivas em código** (parecem Minecraft). A arma já melhorou ao usar modelo real. O resto precisa do mesmo: **modelos reais, porém customizados**.

## Setup (rode primeiro e confirme que carregou)
```
npx skills add https://github.com/majidmanzarpour/threejs-game-skills --skill threejs-aaa-graphics-builder
npx skills add https://github.com/majidmanzarpour/threejs-game-skills --skill threejs-gameplay-systems
npx skills add https://github.com/majidmanzarpour/threejs-game-skills --skill threejs-3d-generator
npx skills add https://github.com/majidmanzarpour/threejs-game-skills --skill threejs-game-director
npx skills add https://github.com/gamedev-skills/awesome-gamedev-agent-skills --skill threejs-materials-lighting
npx skills add https://github.com/gamedev-skills/awesome-gamedev-agent-skills --skill threejs-scene-setup
npx skills add https://github.com/gamedev-skills/awesome-gamedev-agent-skills --skill threejs-gltf-loading
npx skills add https://github.com/omer-metin/skills-for-antigravity --skill threejs-3d-graphics
npx skills add https://github.com/opusgamelabs/game-creator --skill game-3d-assets
claude mcp add --transport http mint https://mcp.mint.gg/mcp
npx skills add mintdotgg/mint-threejs-skills -a claude-code -g -y
```
Liste as skills e ferramentas MCP disponíveis e confirme que o `mint` respondeu antes de continuar.

## O que JÁ existe (não refaça — construa por cima)
- `ASSETS-PROMPTS.md` — os **10 arquétipos** com prompt customizado pronto pra Mint e o `id` de cada (esquerdomacho, sindicato, mst, doutora, mistico, caminhoneiro, influencer, sertanejo, senhora, coach). Definição em `public/js/characters.js` (array `CHARACTERS`).
- Branch remota `feat/graphics-textures` — texturas de pixel nítidas em `public/js/textures.js` (todos os mapas herdam).
- Branch remota `feat/weapons-models` — armas 3D reais (Quaternius CC0) via `public/js/objgun.js` (parser OBJ+MTL) integradas no viewmodel `this.vm.models` de `public/js/game.js`, com tuner `?vmtune=1`.
- Sistema de personagem: `public/js/characters.js` (`buildCharacter(def)` monta o mesh; `poseCharacter` anima). Bots usam esse mesh no mundo.

## Tarefas (nesta ordem, cada uma num branch próprio)
1. **Personagens (prioridade máxima).** Pelo Mint, gere os 10 arquétipos de `ASSETS-PROMPTS.md` como GLB **riggado** (idle, walk, run, shoot, death; se sair estático, auto-rig no Mixamo). Salve em `public/models/characters/<id>.glb`. Adicione GLTFLoader + AnimationMixer, substitua os bonecos de caixa mapeando pelo `id`, e ligue as animações ao estado do jogo (parado/movendo/atirando/morto). Ajuste escala à hitbox.
2. **Mãos FPS.** Gere/monte braços em 1ª pessoa que **herdam a pele/manga do personagem** selecionado; substitua os cubos de mão do viewmodel.
3. **Mapas.** Mantendo o tema de cada mapa (`public/js/map*.js`), aplique flat shading + iluminação (sol/sombra/fog) e props melhores (gerados ou CC0), preservando colliders/waypoints/spawns. Não reescreva a lógica dos mapas — melhore geometria/material/luz.
4. **Verificação obrigatória.** Rode `cd public && python3 -m http.server 8123`, abra `http://localhost:8123/?debug=1&auto=P,sertanejo&map=awp_map`, tire screenshots antes/depois e confirme: (a) abre instantâneo, (b) personagens não parecem Minecraft, (c) FPS estável, (d) nada quebrou (armas, HUD, round, ranking).

## Restrições técnicas
- Mantenha **zero-build** no cliente (sem bundler/framework novo). GLTFLoader pode vir do importmap apontando pro mesmo three vendorizado (r160).
- Peso: só commite os GLB usados (poucos MB), não packs inteiros. `.blend/.fbx` ficam fora do repo.
- Preserve o loop viral: primeiro tiro em <10s do clique, inclusive em máquina fraca.
- Ao mergear contribuições de terceiros (ex. cliente Godot do @woliveiras), use **merge commit**, nunca squash, pra preservar autoria.

Entregue em branches revisáveis, com screenshots do antes/depois em cada PR.
