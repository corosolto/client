# Mapas e PRs testáveis — auditoria de 10/09/2026

Auditoria somente leitura. Nenhum mapa, asset, checkout, servidor, navegador, merge ou deploy foi alterado. Os estados abaixo foram lidos das worktrees locais, dos relatórios versionados e do GitHub com `gh`. “Verde técnico” não significa aprovação visual, competitiva ou de FPS.

## Ordem recomendada para feedback humano

1. **Carandiru (#556)** — candidato mais completo e prioritário; jogar as três famílias de rota, muralha, guaritas, Pavilhão 6 e todas as escadas.
2. **Escadão (#567)** — verificar as duas casas de mirante, portas viradas para os spawns, janelas de tiro/contrafogo e circulação superior/inferior.
3. **Piscina (#566)** — revisar o novo layout, cobertura, gargalos em 8x8 e legibilidade da piscina como mapa mais popular.
4. **Campinho (#530)** — revisar cobertura dos portões, bancos, placar decorativo, beco leste e partida 3:2.
5. **Joá (#561)** — testar a recuperação completa e CTF multinível; a fonte local não coincide hoje com o head remoto do PR.
6. **Amazônia na `main`** — reproduzir o lag 8x8 reportado. O trabalho de escadas/vegetação foi incorporado, mas não existe PR aberto que resolva esse relato de FPS.
7. **Posto e Atacadão (#562)** — feedback útil apenas sobre escala/UV; a abertura excessiva e a falta de pontos táticos do Atacadão continuam sem solução.
8. **Parque (#542/#560)** — feedback útil apenas sobre material/palmeiras; a reestruturação do campo aberto ainda não foi feita.

## Candidatos prontos para abrir e jogar

| Mapa / PR | Worktree e estado local | O que mudou | Gate e evidência | Como testar local | Situação |
| --- | --- | --- | --- | --- | --- |
| **Carandiru #556** | `carandiru-c1`; `codex/carandiru-c1`; `8b4718ef7`; limpa e sincronizada; 141 commits atrás e 46 à frente de `origin/main` por ser pilha | Renomeia visualmente Penitenciária para Carandiru preservando ID `penitenciaria`; abre Pavilhão 6, muralha, guaritas e três famílias de rota; adiciona linguagem institucional e viatura Mint; refaz dez escadas | CAR1–CAR9, Penitenciária, spawn, CTF, build e `check:deploy` verdes localmente; recibos WebGL 1200×800 5x5/8x8; C4 tem percurso real das rotas. Visual independente ainda pede avaliação humana das passarelas, cobertura, contrafogo e conforto das escadas | Na worktree: `npm run dev -- --host 127.0.0.1 --port 8136`; abrir `http://127.0.0.1:8136/?debug=1&auto=P,mst&map=penitenciaria`. Gate: `npm run eval:carandiru` | **Pronto para feedback humano.** PR empilhado sobre #555. O `pr-fast` remoto está vermelho por auditoria atual de dependências (`astro` crítico; `js-yaml`, `sharp`, `svgo` altos), portanto não está pronto para merge |
| **Escadão #567** | `escadao-r6-stack`; `codex/escadao-r6-stack`; `867d06a43`; limpa/sincronizada; 141 atrás e 58 à frente de `main` | Move portas das duas casas de mirante para as faces dos spawns; abre janelas opostas para tiro e resposta; fecha buracos laterais; preserva acesso superior/inferior da casa central e acrescenta guardas | Contratos/casas/ambiência 33/33, rota 10/10, zero observadores altos vendo spawn; navegador registrou quatro rotas nos dois sentidos e quatro LOS com contrafogo; dez capturas 1200×800; CI atual verde | `npm run dev -- --host 127.0.0.1 --port 8148`; abrir `http://127.0.0.1:8148/?map=escadao&lang=pt`, entrar em Single Player. A galeria 58555 é histórica e não substitui o build R6 | **Pronto para feedback humano.** Playtest e FPS/GPU exclusivo ainda pendentes. #567 substitui o candidato antigo #558 |
| **Piscina #566** | `piscina-rework-stack`; `codex/piscina-rework-stack`; `ad6dbd89e`; limpa/sincronizada; 141 atrás e 60 à frente | Reconstrói layout arquitetônico, ilhas de cobertura, degraus/patamares e acabamento, preservando oclusão e CTF | Contrato 17, grafite 83,4%, campo 92%, build e `check:deploy` verdes localmente; capturas 5x5/8x8; crítica independente 8/10 após recaptura. Medidas são chamadas/triângulos, não FPS | `npm run dev -- --host 127.0.0.1 --port 8152`; abrir `http://127.0.0.1:8152/?debug=1&auto=P,mst&map=piscina_treta&perfilauto=0` | **Pronto para feedback humano**, principalmente congestionamento/balanceamento 8x8. Build remoto vermelho pela mesma auditoria de dependências. #566 substitui o PR direto #557 |
| **Campinho #530** | `campo-morro-release`; `astra/campo-morro-release-audit`; `c885b2104`; limpa; um commit local à frente do remoto do PR; PR está em conflito com `main`. Preview destacado antigo: `previews/pr530-378e400` | Reforça cobertura visível/sólida nos portões e laterais, corrige colisões giradas, fecha passagem leste não intencional, cria detornos e inclui placar físico 0–0 | Sintaxe, contrato, rotas, pickups, botsim, build/docs e `check:deploy` verdes no relatório; mutantes de cobertura mordem. Não houve navegador nessa lane | A alteração está no mapa técnico `quebrada`: `npm run dev -- --host 127.0.0.1 --port 8530`; abrir `http://127.0.0.1:8530/?debug=1&auto=P,mst&map=quebrada&perfilauto=0&ctf=1` | **Pronto para feedback humano**, mas testar o commit local `c885b2104`, não presumir que o PR remoto o contém. Merge bloqueado por conflito e divergência de head |
| **Joá #561** | `joa-recuperacao`; `v2/mansao-joa-recuperacao`; `c68f5a7f7`; limpa, porém 42 commits atrás do upstream do PR. Preview destacado antigo: `previews/pr561-2590fe1` | Recupera Mansão do Joá, assets/ambiência/horizonte e CTF multinível por integração seletiva | `eval:mansao`: 528 nós, 7.110 arestas, zero nó ocupado/bloqueado; mapcontract, map-check, mapid, botsim, build e CI remota verdes. Captura real existe, mas aprovação visual humana permanece separada | Com a fonte correta do PR: `PATH=/opt/homebrew/bin:$PATH node_modules/.bin/astro dev --host 127.0.0.1 --port 4382 --ignore-lock`; abrir `http://127.0.0.1:4382/?debug=1&auto=P,mst&map=mansao&perfilauto=0` | **Pronto tecnicamente, mas a worktree atual não representa o head remoto.** Antes do feedback final, criar/usar preview limpo do head `86461d6`; PR está em conflito com `main` |

## Amazônia: trabalho entregue, regressão de desempenho ainda aberta

`amazonia-8x8-perf-stairs` está limpa em `astra/amazonia-8x8-perf-stairs`, HEAD `8fbd1358c`, sem commits exclusivos diante da `main`: a rodada foi absorvida. Ela criou nove acessos reais às varandas, escadas laterais de 1,60 m, mais vegetação, araras/canoa e agrupamento estático por material/setor. Os recibos registram redução agregada de chamadas de 13,8% em médio e 19,8% em baixo, mas declaram expressamente que isso **não prova FPS**; colisão/raycast linear aumentou.

Forma histórica de revisão: `http://127.0.0.1:8157/?map=amazonia&perfilauto=0&lang=pt-BR`. AMZ/AMV, MAP1/MAP6, build e navegação 51/51 passaram; crítico visual marcou 8/10 no recorte. Como o usuário ainda reproduz travadas em single player 8x8, o teste correto agora é na `main` atual, com GPU exclusiva e telemetria de frame/CPU. O PR #551 altera apenas escala UV e está empilhado/instável; não corrige o lag nem deve ser apresentado como solução.

## Ajustes parciais: podem ser vistos, mas não fecham os mapas

| Mapa / PR | Estado | Escopo real | Teste local | Veredito |
| --- | --- | --- | --- | --- |
| **Posto + Atacadão #562** | `mapas-stack-545-v2`; `codex/mapas-stack-545-v2`; `efda5185d`; limpa/sincronizada; PR limpo e checks verdes | Somente escala de material/UV em `map_posto.js`, `map_atacadao.js` e `map_uv.js` | `npm run dev -- --host 127.0.0.1 --port 8146`; Posto: `http://127.0.0.1:8146/?debug=1&auto=P,mst&map=posto_treta&perfilauto=0&ctf=1`; Atacadão: trocar `map=atacadao_treta` | **Pronto para feedback de textura**, não para aceite integral. Atacadão continua muito aberto, com MID 36×67 m, poucas rotas e exposição desbalanceada; Posto continua precisando polish/ambiência |
| **Parque da Treta / Madureira #542 e #560** | `mapas-stack-542-v2`; `codex/mapas-stack-542-v2`; `58f36b42d`; limpa/sincronizada. #560 tem checks verdes mas base conflitante; #542 tem build/Vercel vermelhos. Preview antigo: `previews/pr542-6f8c892` | Escala UV 35→128 e alameda de palmeiras; duas tentativas anteriores foram rejeitadas | `npm run dev -- --host 127.0.0.1 --port 8137`; abrir `http://127.0.0.1:8137/?debug=1&auto=P,mst&map=parque_treta&perfilauto=0&ctf=1` | **Pronto apenas para feedback do acabamento.** O campo aberto de 68×34 m, a relação com quatro spawns, corredores/cobertura e ambiência seguem sem reautoria |
| **Obras da Prefeitura #563** | #563 está limpo e verde na pilha de anisotropia; não há PR próprio de reautoria | Somente anisotropia/material. Auditoria #538 mediu exposição de aproximadamente 88,5–89%, bandeiras em lama e diferença de altura de 0,79 m | Servir uma worktree que contenha #563 e abrir `/?debug=1&auto=P,mst&map=obras_prefeitura&perfilauto=0&ctf=1`; gates base: `node tools/eval/map-check.mjs obras_prefeitura` e `node tools/eval/ambience-registry-check.mjs --map=obras_prefeitura` | **Não existe “depois” estrutural para aprovar.** Precisa de uma lane própria para corredores, cobertura verdadeira, interiores/pontos de tiro e ambiência |
| **Praça dos Poderes** | `praca-poderes-claude`; `claude/praca-poderes-visual`; `01eb7d8d7`; 308 atrás e 5 à frente de `main`; dirty em três JS e com capturas locais sem commit; sem PR | Implementação visual em andamento, mapa distinto de `obras_prefeitura` | Não usar como candidato oficial enquanto os arquivos não forem checkpointados, auditados e publicados em PR | **Não pronto para feedback formal**; o estado é recuperável, mas não reproduzível por commit |

## Demais PRs de mapa abertos

- **#555 Penitenciária UV/janelas:** limpo e verde, base técnica de #556; não testar isoladamente quando o objetivo é Carandiru completo.
- **#564 Escadão/Loja/Piscina UV:** checks remotos verdes, mas o próprio relatório registra divergência de spawn/rota. É infraestrutura da pilha, não o candidato visual final; usar #567 e #566.
- **#563 Ferro/Piscina/Obras/Loja anisotropia:** verde e testável para leitura de textura. Não resolve jogabilidade.
- **#565 e #550 Córrego/Quebrada/Ferro:** empilhados e instáveis. Medidas de chamadas/triângulos não são prova de FPS; Córrego continua pesado e precisa benchmark GPU limpo.
- **#467 Córrego rota inferior:** antigo e instável; não é a frente atual para feedback.
- **#538 inventário dos seis mapas legados:** documentação limpa/verde. É briefing, não implementação.
- **#545, #541, #548 e #547:** predecessores instáveis ou substituídos pelas pilhas mais novas; não devem consumir rodada humana.

## Bloqueios comuns antes de merge

1. Resolver conflitos/rebases na ordem da pilha, evitando testar heads locais que divergem do PR remoto.
2. Corrigir a auditoria de dependências que hoje deixa #556 e #566 vermelhos; os gates do mapa continuam verdes, mas CI vermelha bloqueia merge.
3. Obter playtest humano em 3:2 para Carandiru, Escadão, Piscina, Campinho e Joá; registrar mapa, commit, modo 5x5/8x8 e problemas concretos.
4. Rodar FPS/GPU em janela exclusiva para Amazônia 8x8 e para qualquer alegação de performance; contagens de draw calls e triângulos não substituem frametime.
5. Abrir frentes estruturais próprias para Obras da Prefeitura, Atacadão e Parque. Os PRs atuais nesses mapas são acabamento parcial.

## Decisão operacional

Há cinco candidatos que justificam tempo humano agora: #556, #567, #566, #530 e #561, nessa ordem. Amazônia exige reprodução de performance na `main`. Posto/Atacadão/Parque/Prefeitura ainda não devem ser considerados próximos de release integral só porque um PR de UV ou material passou.
