# O prompt que gerou este jogo

Este jogo foi criado do zero — código, mapa, personagens, texturas, sons
sintetizados, logo e UI — pelo **Kimi K3** (Kimi Code CLI) a partir do prompt
abaixo, escrito por [@rubenmarcus](https://github.com/rubenmarcus).
Depois disso, o jogo foi refinado em iterações curtas de conversa (troca de
personagens, pacote de vozes, sons de arma, crouch, radar, rádio estilo CS,
headshots, SEO/AEO, empacotamento open source).

> ## Prompt original
>
> I want you to create a complete Three.js browser FPS game, ready to run and publish on kimi.page.
>
> Game title: AWP Brasil: Treta Suprema
>
> Concept:
> Create a satirical Brazilian political arena shooter inspired by the classic Counter-Strike 1.6 awp_map layout, but transformed into a fictional, exaggerated, humorous Brazil-themed map. This must feel like a nostalgic CS 1.6-style browser game: low-poly but polished, smooth controls, good lighting, atmospheric textures, strong silhouettes, and fast readable gameplay.
>
> Important tone:
> This is political satire, not realistic political violence. Make everything absurd, theatrical, and cartoonish. No gore. Use exaggerated fictional archetypes, not real politicians or real private people. Characters can be inspired by recognizable internet/political stereotypes, but do not copy exact real people.
>
> Visual style:
> - CS 1.6-era graphics, but polished for browser.
> - Low-poly models with good textures.
> - Warm Brazilian sunlight.
> - Dusty concrete arena.
> - Strong red vs green/yellow team color language.
> - Retro FPS feel with modern smoothness.
> - Create procedural placeholder assets if needed, but make them visually pleasing.
>
> Core gameplay:
> Build a playable Three.js FPS with:
> - Pointer-lock first-person controls.
> - WASD movement.
> - Shift sprint.
> - Space jump.
> - Mouse aim.
> - Left click shoot.
> - Right click zoom/scope.
> - Smooth recoil.
> - Bullet trails.
> - Hit markers.
> - Reloading.
> - Ammo counter.
> - Health system.
> - Simple round system.
> - Team selection.
> - Bot enemies with basic AI.
> - Scoreboard.
> - Respawn system.
> - Victory condition.
>
> Weapons:
> Primary weapon should be an AWP-style sniper rifle.
> Include:
> - AWP-style sniper with scope
> - Optional pistol sidearm
> - Knife or melee bash
> The AWP must feel satisfying: strong sound placeholder, recoil kick, zoom overlay, slow fire rate, high damage, visible tracer.
>
> Map:
> Create a compact awp_map-inspired symmetrical arena, but with Brazilian references:
> - Two elevated spawn platforms facing each other.
> - Central open combat lane.
> - Concrete ramps.
> - Crates and cover.
> - A central plaza inspired by Brasília / Praça dos Três Poderes, but fictionalized.
> - Background silhouettes inspired by Congresso Nacional architecture.
> - A parked caminhão with Brazilian flag colors.
> - A small sindicato building.
> - A fake MST camp area with tents and red flags.
> - A boteco corner with plastic chairs.
> - A pastel/feira stand.
> - Graffiti walls with fictional slogans, memes, and jokes.
> - A giant broken urna eletrônica prop in the middle as cover.
> - Loudspeaker poles, campaign posters, social media billboard props.
> Do not use copyrighted logos or real campaign material.
>
> Teams:
> There are two teams: Petistas and Bolsonaristas.
>
> Petistas side characters:
> 1. Esquerdomacho
> Description: urban leftist stereotype, beard, tote bag, political buttons, red scarf, glasses, ironic T-shirt, academic posture, slightly smug animation.
> 2. Líder do Sindicato
> Description: older union leader, red cap, vest with fictional sindicato patches, megaphone accessory, serious stance, worker boots.
> 3. Líder do MST
> Description: rural movement leader, red cap, practical clothes, scarf, field boots, backpack, flag accessory, determined posture.
> 4. Trans Lacrador
> Description: stylish activist character, colorful hair, bold makeup, red/pink accents, expressive outfit, confident animations, social-media energy.
>
> Bolsonaristas side characters:
> 1. Caminhoneiro com camisa do Brasil
> Description: truck driver, Brazil football-style shirt, cap, sunglasses, work boots, trucker gloves, bulky silhouette.
> 2. Influencer com botox que adora Dubai e EUA
> Description: luxury influencer stereotype, designer-inspired but fictional outfit, sunglasses, blonde hair, flashy accessories, phone/selfie animation, Dubai/USA travel vibe.
> 3. Cantor Sertanejo
> Description: cowboy hat, shiny belt buckle, tight jeans, boots, guitar case on back, stage-performer posture.
> 4. Senhora conspiracionista de 60 anos
> Description: older woman, green/yellow outfit, oversized sunglasses, phone with forwarded-message stickers, intense expressive animations, conspiracy-board accessory. Avoid using medical terms or mocking mental illness.
>
> For character visuals:
> Use internet image search only as broad visual reference for clothing, posture, and Brazilian cultural stereotypes. Do not copy exact people, faces, or copyrighted photos. Create original fictional characters.
>
> Character requirements:
> - Each team should have 4 selectable characters.
> - Each character needs a small portrait/avatar.
> - Each character should have a unique silhouette and color accents.
> - Add simple idle/walk/shoot/death animations or convincing procedural approximations.
> - Characters should hold AWP-style rifles.
>
> UI:
> - Main menu with game logo.
> - Team selection screen.
> - Character selection screen.
> - Settings panel for mouse sensitivity, volume, graphics quality.
> - In-game HUD with health, ammo, score, round timer, team score.
> - Scope overlay when right-clicking.
> - End round screen.
>
> Logo:
> Create a retro tactical shooter logo:
> Text: “AWP Brasil: Treta Suprema”
> Visual: cracked Brazil map silhouette, two crossed sniper rifles, red on one side and green/yellow on the other, subtle Brasília skyline behind it. Keep it original and fictional.
>
> Technical requirements:
> - Use Three.js.
> - Make it run in a single web app suitable for kimi.page.
> - Prefer self-contained code with procedural geometry and textures when possible.
> - If using external assets, use only free/open assets and clearly list the URLs/licenses.
> - Optimize performance for browser.
> - Include mobile fallback message saying desktop is recommended.
> - Include clear instructions for how to run and publish on kimi.page.
>
> Deliverables:
> 1. Complete working code.
> 2. File structure.
> 3. Instructions to deploy on kimi.page.
> 4. Short explanation of controls.
> 5. Notes on how to replace placeholder models/textures later.

## Notas da iteração

Duas decisões de conteúdo mudaram após o prompt original, por escolha editorial:

- A "Senhora conspiracionista" virou a **Tia Zilá** (nome fictício).

O jogo também mudou de nome: de "AWP Brasil" para **CS BRASIL: Treta Suprema**.
