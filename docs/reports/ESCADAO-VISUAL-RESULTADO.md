# Escadão — resultado local da revisão do PR #436

> HISTÓRICO: aparência reprovada pelo usuário após esta entrega. A revisão com cinco novas referências está no ledger; a aprovação visual mencionada abaixo foi superada.

A melhoria visual localizada recebeu aprovação independente. A implementação está em commits locais na branch `codex/escadao-visual`, worktree `/Users/ruben/csbrasil/worktrees/escadao-visual`. **Não está aprovada para produção/performance:** falta janela GPU exclusiva e o gate AM7 revela um orçamento herdado incompatível com a fauna existente. Não houve push, merge, deploy nem alteração da branch original.

## Base e intenção

PR: https://github.com/corosolto/client/pull/436. Baseline inspecionado/fetch: `4dc1f9bba764d5e3031ad2c530f7640247b48c54` (`origin/map2/escadao`). Base do PR: `feat/times-e-mapas-completo`, SHA `daa9249d1952d820bf70e58745868d2a8ae59403`; GitHub informa conflito. A checagem de integração permanece separada desta revisão local. Revalidação remota ao entregar confirmou ambos os SHAs e `OPEN/CONFLICTING/DIRTY`.

Checkpoints locais: `d814cb97` referências/baseline, `05a6514a` mapa, `b8e5f7b2` réguas, `625bb8b4` gate ambience, `151416f0` vídeo e ledger. Todos com DCO e trailer `Agent:`.

Pesquisa real foi feita antes das alterações; ficha em [ESCADAO-VISUAL-REFERENCIAS.md](ESCADAO-VISUAL-REFERENCIAS.md). As fotografias de Santa Marta foram referência de proporção, materiais, fachadas e uso das bordas. Imagens NC ou sem licença de redistribuição não entraram no jogo. Escadão preserva o eixo de subida, seus três lances, becos e patamares; Lajes conserva sua identidade de circulação entre coberturas.

## Diagnóstico e correções

| Antes observado | Depois e validação |
|---|---|
| Azulejo esticado repetido em guardas e todos os degraus | Concreto nas guardas, azulejo pontual nos espelhos e UV métrica; subida mais legível. |
| Paredes cegas e material repetido | Reboco original com quatro tons, portas, janelas e marquises nos becos. |
| Varais sobre o envelope de passagem, fios sem apoio claro | Varais nas bordas, suportes de fiação; EV1 zero sobreposição nas rotas testadas. |
| Comércio sem callout demonstrado; vegetação invisível | Bar, mercearia e dois becos identificados; vasos/folhas instanciados fora da passagem. |
| Mirante com fundo vazio/genérico | Casario externo simples com janelas na face correta e solo visual sob a base; centro caminhável preservado. |
| GLBs comerciais fora dos proxies e cadeiras atravessáveis | Quatro módulos comerciais alinhados ao footprint; mesas com proxy 2,13 m para GLB 2,124 m. |
| Puxadinhos sem colisão e capeamento invadindo 2 cm da escada | Volumes sólidos, corredor leste de 1,30 m e capeamento contido; corpo real e contrato de rotas verdes. |
| Anel CTF flutuante/largo e faces ligando cotas distintas | Faixa ~7,33 cm recortada nas fronteiras do terreno; faces entre +8,4 e +15,6 cm do piso lógico; raio/regra de captura 4,5 m intactos. |

A correção de CTF fica no `world.update` deste builder. `game.js`, `maps.js`, look e loaders compartilhados não foram alterados. Não foi criada variante noturna: o mapa usa o céu/luz diurnos existentes.

## Capturas, movimento e crítica

Artefatos locais ignorados pelo Git: `artifacts/escadao-visual/`.

- A/B definitivo: `comparison-accepted/{baseline,after}/`, **13 pares 1536×1024**, FOV 70, high, pixel ratio 1; posições e hashes em `capture.json`.
- Câmeras: subida, patamar, descida, beco oeste/leste, lateral, rua, mirante, comércio, bar, mercearia e dois enquadramentos de combate.
- Nas fotos arquitetônicas, bots ocultos; nos contadores, sete bots GLB com elenco, AK, pose e spawns idênticos. Fauna real permanece ativa. Combate usa `esquerdomacho` texturizado com AK e pose fixa, independente do elenco.
- Movimento visual no loop normal do Game: `motion-complete/{baseline,after}/movement.webm`, recibos `motion.json` e frames de chegada/retorno. Trajeto em x=1,2 m, z=13,6→−6,4→13,6 m; três lances, com entrada `KeyW`, sem avanço manual da física. A sonda física detalhada está em `restored/runtime.json`. Vídeos VP8 de 16,56/16,36 s; dimensões/bytes/hashes em `motion-complete/verification.json`. A revisão técnica independente conferiu chegada y=6,12 e continuidade dos recibos. O trace do vídeo não tem timestamps e não mede velocidade; FOV/qualidade nele são parâmetros configurados.
- Referência local de identidade: `lajes-reference/`, sem edição do Lajes e sem comparação de FPS.
- Revisão independente: antes reprovado; iterações 5,5 → 6,5 → **7/10 subjetivo**. Aprovação final da melhoria localizada e do delta de placa/solo externo. A avaliação cobre os frames apresentados, não todas as skins nem equilíbrio competitivo completo.

Capturas antigas (`before`, `after`, `comparison`, `comparison-final`, `comparison-review`) conservam o histórico rejeitado. **Não usar seus contadores como resultado final:** parte dessas tentativas tinha elenco sorteado diferente ou assets locais incompletos.

## Gates e mutantes

Com `PATH=/opt/homebrew/bin:$PATH` (Node 23.6.0) e servidor desta worktree na porta 8148:

| Verificação | Resultado / evidência |
|---|---|
| 15 contratos/checks relevantes | **15/15**, `gates-final.json` e `.log`: escadao-contract, escadao-rota, mapcontrato, ambience-registry, look, escala-casario, map-source, maptex, grafitelayout, asset-integrity, gltf-validator, props-acervo, syntax, docs:check, arch:check. `eval:look` cobre outros mapas; não foi apresentado como teste visual do Escadão. |
| Corpo/rotas reais EV0–EV7 | **8/8**, `restored/runtime.json`: 12/12 subidas e retornos em corrida/caminhada; 67/67 objetivos/pickups por time e volta ao spawn; zero headHits/piso ausente/travamentos; contatos normais registrados. |
| Tiro e spawn | 0/16 spawn×spawn e 0/16 flanco→spawn; varredura alta sem visada aberta ao spawn. Cada um dos sete observadores altos tem pelo menos duas rotas com interrupção contínua ≥ diâmetro do corpo. Maiores trechos expostos: central 22,69 m, oeste 17,63 m, leste 5,55 m. |
| Anéis ER0–ER2 | **3/3**, `ring-restored/runtime.json`; faces/arestas a cada ≤2,5 cm, min/max de altura, raio, largura e finitude. |
| Map-check e mantle | Verdes, `map-accepted.log/json`, `mantle-accepted.log`: zero corpos dentro/submersos, ≥2 rotas CTF; três cláusulas de mantle. |
| Build | **PASS**, `build-accepted.log`. |
| Ambience | **15/16**; `ambience-accepted.json/log`. Carregamento, animação, reação, continuidade, LOWQ e hooks reais passam; AM7 permanece vermelho. |

Mutantes Node finais: `sem-bloqueio-flanco`, `caveirao-perfeito`, `caminhao-bau`, `varal-sumiu`, `varal-so-no-topo`, `escada-morta`, `sem-abrigo`: **7/7** falharam na cláusula pretendida (`mutants-node-final/results.json`).

Mutantes browser: `varal-na-rota`→EV1, `escada-bloqueada`→EV2, `sem-abrigo`→EV7: **3/3 mordidos**, com objeto/colisor identificado e causalidade (`mutants-runtime-results.json`). O de cobertura prova visada fechada→aberta e restauração verde. Anéis `anel-plano`, `anel-enterrado`, `anel-colapsado`: **3/3 mordidos**; controlador e geometria compartilhados não são alterados em disco. A execução final normal voltou ao verde após os mutantes (`restoration-results.json`).

O vermelho veio antes do conserto: `red/` documenta varais/penetração; `after-review3/4/5` documentam proxies, puxadinho e instrumento; `ring-red/`, `ring-width-red/`, `ring-faces-red/` documentam altura, largura e faces. Não foram alterados limiares para passar.

Limites do instrumento: raios por frame amostram o envelope e não constituem prova contínua de toda a cápsula/todo o mapa. Dois jogadores percorrem todos os alvos; os outros seis slots têm ligação planejada verificada. Headroom é estático: fauna registrada como não sólida é identificada e excluída explicitamente, com UUIDs no recibo. Sua animação/reação é medida no gate de ambience. LOS demonstra os casos e a malha amostrados, não vantagem competitiva universal.

## Custo e pendências

Cinco frames por câmera, somando **todos os passes** do renderer; mesmo elenco/arma/pose/slots e fauna. São contadores de geometria, não benchmark de FPS.

| Vista | Calls antes → depois | Delta | Triângulos antes → depois |
|---|---:|---:|---:|
| subida | 1313 → 1382 | +5.3% | 755305 → 809958 |
| descida | 1295 → 1387 | +7.1% | 708080 → 758472 |
| lateral | 1141 → 1209 | +6.0% | 654059 → 688768 |
| rua | 1428 → 1519 | +6.4% | 769309 → 810541 |
| mirante | 1323 → 1416 | +7.0% | 738716 → 781492 |

A melhoria tem custo: nos quatro enquadramentos principais, calls aumentam cerca de 5–7%. Os tetos existentes de `cena-tetos.mjs` incluem Piscina 860 calls/870 mil tris, Ferro Velho 620/1,17 milhão e Loja H 360/1,41 milhão. Escadão supera esses tetos de calls. O teto 2060/1,81 milhão da Quebrada é descrito no próprio código como retenção de um número ruim, **não aprovação**. Escadão ainda não tem teto próprio nesse gate; não foi executado um caso vazio para fingir aprovação.

1. **FPS/GPU pendente:** nenhuma janela exclusiva foi garantida; não foram executados benchmarks concorrentes nem encerrados processos de outras frentes. Próximo passo: reservar exclusividade e medir subida/descida/lateral/rua, fauna e varais ativos, qualidade idêntica, todos os passes, antes/depois. Se o custo não couber, otimizar os detalhes locais e repetir imagens/contratos.
2. **AM7 herdado:** antes e depois têm 11 animais, 25 malhas e 41.568 tris; o teto é 6 malhas/29.000 tris. A população não foi aumentada nesta frente. O gate antes nem chegava ao navegador devido ao path `map_es.js`; corrigido o nome e oferecido `CHROME_NATIVE=1`, sem mudar asserções. Falta conciliar população/espécies obrigatórias e orçamento em integração, com medição; não elevar teto para esconder vermelho.
3. **Integração:** PR segue conflitante; merge/push/deploy não autorizados nesta entrega. Conflitos constatados por merge-tree: documentação gerada de arquitetura/status/comecando/quality-gates e traduções. Revalidar contra a base que estiver atual na integração.

## Assets e procedência

Nenhum GLB, fotografia, textura externa, áudio ou licença novos foram integrados. Os seis GLBs conferidos permanecem byte a byte; `FONTE.md` e `mint-assets.json` preservados. Inventário medido em `asset-inventory.json` inclui SHA-256, bytes e triângulos; todos abaixo são GLB 2.0. `scope-preserved.json` confirma os hashes contra o baseline e apenas a entrada/fingerprint Escadão no layout de grafites.

| Asset reutilizado | Bytes | Triângulos |
|---|---:|---:|
| `casa_favela_azul.glb` | 369,444 | 4,780 |
| `casa_favela_tijolo.glb` | 345,144 | 4,181 |
| `varal_roupas.glb` | 444,356 | 4,677 |
| `varal_roupas_01.glb` | 335,532 | 4,773 |
| `varal_roupas_02.glb` | 294,344 | 4,818 |
| `mesa_guardasol.glb` | 217,876 | 3,014 |

- Casas e `varal_roupas`: kit Mint `favela_r3`, origem/autor gerador Mint por prompt do projeto, licença de uso do assinante Mint Pro conforme `public/models/props/FONTE.md:178`; [chat do kit](https://mint.gg/chat/ph75rmydefr3btvm85a61hra6h8d74qq). Nove casas azuis, oito de tijolo, quatro varais baixos. Sem atribuição adicional declarada no registro existente.
- Varais 01/02: origem Mint/Meshy original por prompt, mesma licença documentada no lote; [varal 01](https://mint.gg/chat/ph7cqm9tnn58h1sxznpq26wgax8cr51p), [varal 02](https://mint.gg/chat/ph79avg70bbmppdah59xczz0m58cr0dg). Uma instância de cada no mirante.
- Mesa/guarda-sol: pacote Mint `piscinao_pack`, [origem registrada](https://mint.gg/chat/ph73qfvhgzbtsvr2ezgrvzwswx8bbm9p), `mint-assets.json`. O registro legado não explicita licença/atribuição individual; preservado sem novo download ou atribuição inventada. Aqui mudou o colisor de duas instâncias.
- Autoria procedural desta mudança: reboco 128×128, quatro placas 512×96, vasos/folhas, apoios e casario externo. Sem material de terceiros embutido. Vasos+folhas: 912 tris high, duas chamadas de desenho agrupadas; casario/fiação repetidos instanciados, sem novas sombras nos detalhes indicados. Grafites reutilizam acervo: 387→245 peças, com respiro em entradas/comércios.

## Reprodução

```sh
export PATH=/opt/homebrew/bin:$PATH
# Em terminais próprios, dentro desta worktree:
npm run eval:serve -- 8148
BASE=http://127.0.0.1:8148 OUT=artifacts/escadao-visual/recheck npm run eval:escadao-visual
BASE=http://127.0.0.1:8148 npm run eval:escadao-ring
BASE=http://127.0.0.1:8148 npm run eval:escadao-evidence
BASE=http://127.0.0.1:8148 OUT=artifacts/escadao-visual/motion npm run eval:escadao-evidence -- --motion
BASE=http://127.0.0.1:8148 CHROME_NATIVE=1 npm run eval:ambience
npm run build
```

O servidor estático não implementa quatro endpoints `/api/*` e o template Astro de um brasão; essas exceções exatas são registradas. Falhas inesperadas de rede/asset e erros JS reprovam as capturas. Dependências privadas necessárias foram copiadas somente quando ausentes do acervo local. Os nove sons ambiente faltantes foram recuperados das URLs já registradas em `public/audio/ambiente/FONTE.md`; bytes/hashes em `audio-restoration.json`. Nenhum áudio/decalque binário foi commitado.

## Arquivos alterados

Lista exata desde o baseline do PR (incluindo o checkpoint inicial), sem artefatos volumosos:

- `.gitignore`
- `ARCH.generated.md`
- `README.md`
- `STATUS.md`
- `docs/docs/arquitetura.md`
- `docs/docs/colaborar.md`
- `docs/docs/comecando.md`
- `docs/docs/quality-gates.md`
- `docs/docs/stack.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/quality-gates.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md`
- `docs/reports/ESCADAO-VISUAL-CONTINUATION.md`
- `docs/reports/ESCADAO-VISUAL-REFERENCIAS.md`
- `docs/reports/ESCADAO-VISUAL-RESULTADO.md`
- `package.json`
- `public/js/graffiti_layout.js`
- `public/js/map_escadao.js`
- `tools/eval/ambience-check.mjs`
- `tools/eval/escadao-evidence.mjs`
- `tools/eval/escadao-ring-check.mjs`
- `tools/eval/escadao-runtime-probe.mjs`
- `tools/eval/escadao-visual-check.mjs`
