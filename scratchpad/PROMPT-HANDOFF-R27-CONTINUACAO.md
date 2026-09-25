# HANDOFF — continuação da rodada R27 (Lajes sistêmico + occluders globais)

Repo: `/Users/ruben/game`, branch `feat/times-e-mapas-completo`. **Tudo não commitado.
Não faça commit sem autorização explícita do Ruben. Não reverta sujeira alheia.** Um único
browser por vez. Servidor de eval: `node tools/eval/serve.mjs 8124` (pode já estar no ar).

Escreva isto assumindo que você não viu nada da conversa. Leia nesta ordem:
`AGENTS.md` → `docs/LICOES.md` → `KNOWN-BUGS.md` (BUG-54) → `plans/10-LAJES.md` →
`.agents/skills/bug-hunt/SKILL.md` + `regua` + `asset-review`.

## O que a R27 já ENTREGOU (medido, verde, não refaça)

### Lajes (BUG-54) — gameplay + contrato de tiro + REVISÃO ADVERSARIAL APROVADA
- **`groundHeightAt(x,z,yRef)` multinível** em `public/js/map_lajes_authored.js` (regra da
  Havan: camadas + pé-direito; sem yRef devolve o topo). Prova em física real: queda de cima
  pousa na laje, quem está embaixo fica no térreo, túneis cruzáveis a pé.
- **Térreo é UM circuito**: 14 componentes → 99,1% das células livres num componente só
  (beco central + 3 ramais + faixas laterais de perímetro + 2 túneis de mirante sobre
  pilotis — o túnel do MN tem VÃO na parede leste onde o ramal 1 cruza; sem ele a boca
  do ramal era uma parede pelada). Esquinas por mitra de muros visíveis (corta DEPOIS de
  estender, senão a mitra invade poço de escada); muro de perímetro visível nos 4 lados.
- **Occluder = malha visível** em fy_lajes: casas instanciadas (PropBatch) estão em
  `occluders`; proxies invisíveis de bala eliminados (corpos de bloco são collider puro).
- **Gate novo (browser)**: `npm run eval:occluders` (`tools/eval/occluder-ray-check.mjs`)
  — mede hitA (occluders) × hitB (malha visível) em raios dos waypoints. fy_lajes: **0
  tiro-no-ar / 0 atravessa-parede / 0 grupos** (era 977 tiro-no-ar). FORA do check:fast
  de propósito (browser). Mutantes `occluder-invisivel|proxy-inflado|grupo-sem-raycast|vao-fechado`.
- **Gate novo (node, no check:fast)**: `npm run eval:lajes-circuito` — LC1 yRef, LC2
  circuito ≥92%, LC3 três escadas no circuito, LC4 beco+ramais, LC5 nada em sólido, LC6
  limite para antes do clamp. Mutantes `ignora-yref|ramal-fechado|rota-inferior-partida|limite-invisivel` mordem.
- **Visuais C1-C4**: caixas d'água (GLB Tripo com tampa/frisos, tinta preta/azul por
  instância, cano PVC até a fachada); fascia/remendos quebrando as bordas retas das lajes;
  faixas de fachada do chão à laje em cada bloco (fim de laje flutuando; modelo profundo
  do kit nunca atravessa bloco fino — troca por raso); **cachorro caramelo**
  (`public/models/ambient/dog_caramelo.glb`, Quaternius CC0 tingido, idle/walk/flee em
  `ambientlife.js`, rota no beco [-2,12.5]→[-2,18.5], FONTE.md atualizado).
- **Alívio de térreo** (nasceu da 1ª reprovação do crítico): muros têm porta com batente
  clara+soleira, janela com peitoril, medidor com conduite, remendos — ver `wallWithRelief`
  no mapa. O crítico APROVOU na 3ª passada ("fy_lajes R27 fecha pela revisão adversarial").
- **`tools/eval/pickup-check.mjs`**: flood em 2 camadas (térreo/topo) + descida livre
  (subida ≤0,30). VM14 fy_lajes 31→0 pickups sem alcance. Todos os mapas 0 (corrego tem 2
  "abaixo do piso" pré-existentes, outra cláusula).

### Outros mapas já corrigidos (gate 0/0/0)
- **praca_poderes** (map_brasilia.js): 38 grupos-letra-morta → `occMesh` (malhas filhas);
  proxies de procuração removidos (ministérios, palácio, ônibus); props com `occlude:true`.
- **fy_escadao** (map_escadao.js): gprop/propAt idem; muros/muretas/degraus/caveirão
  viraram occluders reais. **ATENÇÃO**: `tools/eval/escadao-contract-check.mjs:31-33`
  teve o observador "topo" movido de z=−20 para z=−12 (a visada antiga só media limpa
  porque a bala atravessava o degrau — defeito da classe BUG-54). Ruben precisa saber
  disso no relatório.
- **ferro_velho** (map_ferrovelho.js): 863→0 tiro-no-ar. Caixas proxy fora da cena
  (`coverProxy`) eliminadas — a malha visível dos carros/pilhas é o occluder; folhagem
  com vãos (alphaTest) marcada `nonSolidSurface`.
- **loja_h** (map_havan.js): 518→0 tiro-no-ar, 368→0 atravessa. `carCover` idem;
  InstancedMeshes dos batches entraram em occluders; cornija/vigas/montantes/paletes/
  trilhos viraram occluders reais. As 21 bordas MAP6 de loja_h são dívida declarada
  (JOG2:loja_h) — NÃO é regressão.

## O que FALTA (ordem de trabalho)

1. ~~Wave 2~~ ENTREGUE: ferro_velho 863→0 e loja_h 518→0 (0/0/0 nos dois).
2. **Wave 3 (rodando)**: `quebrada` (546), `fy_campomorro` (307), `fy_corrego` (89+217),
   `fy_mansao` (129+81), `piscina_treta` (0/28). Verifique
   `node tools/eval/occluder-ray-check.mjs --map=quebrada,fy_campomorro,fy_corrego,fy_mansao,piscina_treta`.
3. **Perf medido em fy_lajes** (16/08, swiftshader, raycast da bala): 0,55-0,58 ms/raio
   com 1.201 occluders (248 instanciados) contra ~0,08 ms/raio do esquema de caixas. O
   backdrop (cenário além do muro) ficou FORA dos occluders justamente por isso. Custo
   aceitável porque o raio é por evento (tiro/sense-tick de bot), não por frame — mas se
   o dono sentir queda de fps em tiroteio, a saída é grade espacial no caminho do
   `_fireHitscan`/`_losClear` (game.js), não menos malha.
4. **Cachorro in-game**: `npm run eval:ambience` (browser) nunca rodou com o dog (a régua
   AM1-AM10 não conhece a espécie — não deve quebrar, mas rodar).
5. **MAP4 do invariants em fy_corrego** (3/62, caixas y≤0,2 m): coberto pela wave 3.
6. **Capturas de aceite finais**: `tools/eval/asset-evidence/maps/fy_lajes/r27-final3/`
   é a leva aprovada pelo crítico (3 passadas — 1ª reprovou térreo plano, 2ª aprovou
   empilhamento e pediu alívio de porta/janela, 3ª APROVOU tudo).
4. **Cachorro in-game**: `npm run eval:ambience` (browser) nunca rodou com o dog.
5. **MAP4 do invariants em fy_corrego** (3/62, caixas y≤0,2 m): pré-existente, verificar
   na wave 3.
6. **Capturas finais de aceite** (3:2, jogo real): já existem em
   `tools/eval/asset-evidence/maps/fy_lajes/r27-final/` (20 poses). Faltam: tiros através
   de vãos com prova visual, quatro limites com enquadramento melhor (limite-sul ficou
   colado no muro), travessia completa das duas rotas de laje. Script:
   `node tools/eval/lajes-evidence-capture.mjs <outdir> <prefixo>` (BASE=127.0.0.1:8124).
7. **Crítico adversarial**: um agente com contexto limpo foi lançado para revisar as
   capturas (veredito por item). Se ele não tiver entregue, rode de novo com a skill
   `.agents/skills/asset-review/SKILL.md` e os PNGs de r27-final/.
8. **Rodar a bateria final e atualizar o cabeçalho do KNOWN-BUGS.md** com o placar real:
   `npm run check` (12 min; VM14 deve ter saído do vermelho; MAP4 corrego pode continuar),
   `npm run check:fast` (vermelhos pré-existentes: shaderbudget SB7, mapid, feet:check,
   camera-grip, char-thumbnail, asset-integrity camera-roxa, devport — TODOS já estavam
   vermelhos antes da R27, verificar com `git stash` mental, não consertar nesta frente),
   `npm run docs && npm run docs:check`, `npm run arch && npm run arch:check`,
   `graphify update .`.
9. **Bugs adjacentes encontrados (não corrigidos — fora de escopo, registrar)**:
   - `game.js:665`: swap de pickup faz `scene.remove(pk.mesh)` — no-op para placeholders
     pendurados em `root` (7 mapas): a caixa-placeholder renderiza junto do GLB.
   - fy_corrego: 2 pickups submersos no canal (m400 em (1.4,-11), awp em (-1.4,17),
     chão -1,75 m) — cláusula `abaixoDoPiso` do VM14/pickup-check. Pré-existente da R27;
     mexer é 2 linhas de posição em map_corrego.js (fazer DEPOIS da wave 3, que edita
     esse arquivo).
   - MAP4 em fy_corrego (acima).

## Estado dos gates de Lajes no fim da R27 (todos verdes)
lajes-spatial (6/6 + 5 mutantes mordem) · lajes-circuito (6/6 + 4 mutantes) · lajes-gap ·
lajes-authored · lajes-rooftop · map-check fy_lajes (0 FALHA) · eval:spawn (160/160) ·
pickup-check (0 sem alcance) · eval:occluders fy_lajes (0/0/0).

## Não repetir (erros que custaram nesta rodada)
- Caixa proxy com bounds nativos do GLB cobre pergolado/recuo: bala morre no ar sobre a
  fachada. Por isso occluder = malha instanciada, não caixa.
- Muro de beco não pode ser caixa independente por trecho: cruza boca de vizinho. O
  construtor atual usa intervalos com cortes (túnel, escada, boca de ramal, mitra).
- Mitra estendida precisa respeitar faixa de escada/túnel (corta DEPOIS de estender).
- Modelo profundo do kit (casa_02, 6,2 m) atravessa bloco de 5,8 m: perímetro usa modelos
  rasos quando não cabe.
- O flood de camada única não vê passagem sob tábua/túnel — por isso pickup-check tem 2
  camadas.
- `git stash` em worktree sujo compartilhado: NÃO usar para A/B.
