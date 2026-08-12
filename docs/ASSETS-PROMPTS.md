# Prompts de geração de personagens (Mint / Meshy / Tripo) — CS BRASIL

Objetivo: gerar cada arquétipo **customizado** (mantém a sátira, sai do Minecraft) como modelo 3D **riggado**. Não usar GLB genérico pronto.

## Especificação comum (cola no começo de TODO prompt)

> Low-poly game-ready 3D character, single humanoid in a clean **T-pose**, stylized **cartoon caricature**, readable silhouette, flat-shaded **PBR**, ~2–4k tris, **rigging-friendly proportions**, centered at origin, facing +Z. Brazilian political-satire archetype — **fictional, not a real person, no real-world logos or text**. Output **GLB**.

Se a ferramenta permitir, peça também: **rigged skeleton with animations: idle, walk, run, shoot, death**. Se só sair o mesh estático, rode depois no **Mixamo** (auto-rig grátis) e exporte as animações — eu ligo no jogo.

## Onde soltar

`public/models/characters/<id>.glb` — usando o `id` exato de cada um abaixo (pra eu mapear automático).

---

## Os 10 personagens

**esquerdomacho** (time P) — *Esquerdomacho*
> ...intellectual "esquerdomacho": thick hipster beard, round glasses, dark red t-shirt, canvas tote bag over the shoulder, jeans, sneakers, several small pin-buttons on the chest, calm academic pose.

**sindicato** (P) — *Líder do Sindicato*
> ...union leader: red baseball cap, gray shirt, open assembly vest, mustache, jeans, work boots, a megaphone held at the hip.

**mst** (P) — *Líder do MST*
> ...rural landless-movement leader: olive/straw work shirt, weathered tan skin, muddy boots, a backpack with a small red flag on a short pole, simple cap.

**doutora** (P) — *Doutora do SUS*
> ...female public-health doctor: white lab coat, stethoscope around neck, hair in a ponytail, ID badge, holding a clipboard, scrubs, sneakers.

**mistico** (P) — *Jovem Místico*
> ...young mystic/hippie: cloth headband, long hair, purple shirt, a crystal pendant on the chest, beaded bracelets, sandals, serene relaxed pose.

**caminhoneiro** (time B) — *Caminhoneiro*
> ...truck driver: yellow soccer-style shirt, driving gloves, cap, jeans, boots, big belt, sturdy build, friendly generic face.

**influencer** (B) — *Influencer de Dubai*
> ...flashy male influencer: gold sunglasses, white designer t-shirt, gold pants, blond hair, white sneakers, thick gold chain, holding a smartphone.

**sertanejo** (B) — *Cantor Sertanejo*
> ...Brazilian country "sertanejo" singer: leather cowboy hat, white t-shirt, large gold belt buckle, jeans, boots, an acoustic guitar on the back, generic friendly face (NOT a real person).

**senhora** (B) — *Tia Zilá*
> ...cheerful 60-year-old auntie: gray hair in a bun, glasses, green blouse, yellow pants, holding a phone, a small board of paper clippings on her back.

**coach** (B) — *Coach Quântico*
> ...motivational "quantum coach": slick blazer, headset microphone, dark slicked hair, white shirt, black pants, dress shoes, confident arms-crossed pose.

---

## Novos (sessão 22/07 — gerados no Mint com imagem de referência)

Estilo pedido pelo usuário nesta leva: **semi-realista** (pelugem/tecido com textura real), NÃO flat cartoon.

**bozo** (time P) — *Bozo*
> ...classic circus clown mascot: white clown face makeup, big round red nose, wide red smile, fluffy red wing-hair tufts on the sides of a bald white head, royal-blue long-sleeve top and matching pants, wide light-blue-and-white cape collar with red zigzag trim, red waist sash, white gloves, white boot covers with red trim over brown shoes. Semi-realistic fabric/latex/greasepaint materials.

**canarinho** (time B) — *Canarinho Pistola*
> ...angry canary bird mascot ("canarinho pistola"): bright yellow feathered body, pointed feather crest on top of the head, big white furrowed angry eyes, orange beak, stocky build with big head, yellow soccer jersey with green collar trim and green number 24 on the chest, blue soccer shorts, white socks, blue soccer boots. Semi-realistic feather/fabric materials.

**proerd** (time B) — *Leão do Proerd*
> ...upright-standing lion mascot (PROERD): tan golden fur, full fluffy dark-red to orange-brown mane, friendly smiling lion face, BLACK t-shirt with red cursive script "Proerd" logo across the chest (white outline), dark blue jeans, sneakers, lion tail with dark-red tuft. Semi-realistic fur/fabric materials. A camisa PRETA com o logo vermelho é OBRIGATÓRIA — sem ela vira um leão genérico (feedback do usuário).

---

## O que eu faço quando os GLB chegarem

1. Adiciono GLTFLoader + AnimationMixer ao jogo (uma vez).
2. Troco os bonecos de caixa pelos modelos reais, mapeando pelo `id`.
3. Ligo as animações no estado do jogo: parado → idle, movendo → walk/run, atirando → shoot, morto → death.
4. Ajusto escala/altura pra bater com a hitbox (afinável, igual às armas).

Armas já estão resolvidas (Quaternius CC0). Props de mapa a gente faz depois, mesmo fluxo (prompt → GLB → eu integro).

---

## 🤡 Time dos Palhaços (gerado via Mint — modelos individuais, riggable T-pose/mãos vazias)

Paródia fictícia, sem logos/nomes reais. Asset IDs Mint em geração (31/jul→01/ago).

**palhacomal** (time Palhaços) — *Palhaço do Mal* — asset `ks72yk4ea6ppq14ganv1dwzs4s8bjvjg`
> Evil circus clown villain: bald bone-white face, sharp-tooth grin, black eye makeup, cracked red nose, dark hair tufts, tattered crimson/black ringmaster costume, spiked collar, black gloves. (ref: da tatuagem)

**jozo** (time Palhaços) — *Jozo* (ex-Gozo) — asset `ks79s9ytd4h4e5cqvd9kbby3ys8bjpz7 (v2)`
> Fast-food mascot parody: white face, red wig, big pointy yellow collar, red top, blank white chest badge (no logo), big red shoes.

**adjim** (time Palhaços) — *Adjim* (ex-Atchim) — asset `ks7dp8j58z0j3p9rqfmh8ax2k98bk43q`
> Kids-show clown: green curly wig, tiny felt hat, green/yellow polka-dot jumpsuit, ruffled collar, suspenders.

**esbirro** (time Palhaços) — *Esbirro* (ex-Espirro) — asset `ks7fq5y2grzmhgxjwak33mb2qn8bjx0p`
> Partner clown: orange wig, mini bowler hat, red/blue striped jumpsuit, giant polka-dot bow tie.

**titica** (time Palhaços) — *Titica* (ex-Tiririca) — asset `ks76jc6erk6hrfx702qzzmvr3d8bj0vk`
> Mustache, white-blond wig, red firefighter cap, geometric-patchwork shirt, red pants, colorful sneakers.

**padati** (time Palhaços) — *Padati* (ex-Patati) — asset `ks7cvjrkwj0jnbj18vcfs0bpf58bka5d (v2)`
> Blue curly wig, blue/yellow patchwork overalls, striped shirt, yellow bow tie, big blue/yellow shoes.

**padata** (time Palhaços) — *Padata* (ex-Patatá) — asset `ks7czxcg8qmhm17815m0pfqg798bjrdf (v2)`
> Red curly wig, red/yellow patchwork overalls, polka-dot shirt, green bow tie, big red/yellow shoes.

**cadequinha** (time Palhaços) — *Cadequinha* (ex-Carequinha) — asset `ks70tg282r0esw7c97qp7v7esd8bka79`
> Small red top hat, red/white checkered suit, round white ruffle collar, pom-pom buttons, big red shoes.

**bonzo** (time Palhaços) — *Bonzo* (ex-Bozo, reaproveita `bozo.glb` existente, só renomear)

---

## 🎤 Time dos Funkeiros (5ª facção - gerado via Mint em 02/08, integrado antes da linha alpha atual)

`team:'F'` + `tribe:'funkeiros'`. Raul/Oakley/Cria RJ/Chave regerados com as referências
de `references/funkeiros/`; Pagodeiro (slot dos Tribos) é novo; Mandrake = antigo
`funkeiro.glb` renomeado. Todos riggados offline (`tools/rig-from-donor.mjs`) — os GLBs
da Mint vêm sem esqueleto.

**mandrake** — *Mandrake* — reusa `mandrake.glb` (ex-`funkeiro.glb`)
**raul** — *Raul da Franja* — asset `ks7602v45wgd5n8nbjc32g2k058bq2kq` — franja açucarada, polo navy, cordões de ouro, chinelão
**oakley** — *Oakley* — asset `ks787xw7teermt7cyrf8605eyd8bpzhj` — chapéu Medusa + goggles, colete tático, tattoos
**criarj** — *Cria RJ* — asset `ks73dqymge0qwfqd7ny000gd318bpvay` — cabelo platinado zebrado, camisa vermelho/preto
**chave** — *Chave SP* — asset `ks77yzh9sfhcm56vy5qgthe7gx8bq0se` — polo, boné, corrente, óculos
**pagodeiro** (time U/tribos) — *Pagodeiro* — asset `ks7339yj2w2ks6yr8xkt9bkx298bqyrc` — platinado, roupa toda branca, corrente
**funkraiz** — *Funk Raiz* — asset `ks7f6wrqj6xk4ppkvnzsg965gx8bn0jq` (pack original)
**trapfunk** — *Trap Funk* — asset `ks70b059ka7pbhyc13tc8avrmn8bmkdb` (pack original)
**fluxo** — *Fluxo* — asset `ks73q540vsa53vg5eevwbtshv98bn82a` (pack original)
**ostentacao** — *Ostentação* — asset `ks74pa780389fayggzj5yezjmh8bnkh0` (pack original)
