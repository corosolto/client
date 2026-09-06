# Escadão: revisão pelas referências do usuário

Revisão local de 06/09/2026 sobre 9911d554 (entrega visual rejeitada pelo usuário),
na branch `codex/escadao-visual`, worktree `/Users/ruben/csbrasil/worktrees/escadao-visual`.
O PR #436 continua sendo a origem desta frente; não houve push, merge ou deploy.

## O que mudou

| Aspecto | Antes 9911d554 | Revisão R2 |
|---|---|---|
| Escada |5 m de largura, faixa de azulejo repetida |3,6 m, concreto com UV em metros |
| Patamar |Camburão atravessado na subida |Anexo de alvenaria no mesmo footprint de abrigo |
| Corredores |Casas afastadas, espaços vazios e repetição |Frentes próximas/altas, tijolo/reboco parcial, portas, grades e lajes |
| Mirante |Poucos blocos soltos no fundo |Casario contínuo em camadas nas bordas, circulação central preservada |
| Detalhes |Arestas e encontros com tracejados |Chanfros, volumes sem juntas sobrepostas, marcos apoiados |
| Colisão |Peitoril atravessável pelo ombro |191 colliders de portas, janelas, peitoris, pilares, canos e marquises |

Espelho de 0,17 m e piso de 0,29 m continuam regulares: o desgaste das fotos não virou
buraco físico. Há três rotas iniciais, três lances centrais e continuidade do
flanco oeste. Spawns, objetivos e alcance dos pickups foram preservados.

## Evidência visual

Galeria local: `artifacts/escadao-visual/references-r2/gallery.html`.
Pares finais: `artifacts/escadao-visual/references-r2/delivery-closed/comparison/`.
São 13 pares de 1536 × 1024: 11 vistas de arquitetura e 2 de combate. Mesmas posições,
FOV 70 e qualidade alta; metadados runtime em `capture.json`, incluindo combate.
Só o aviso transitório de início de rodada foi ocultado pelo arnês nos dois lados.
GLBs de 17 casas e fauna foram confirmados carregados; ator de combate texturizado,
pose e sete bots são controlados. O registro não congela toda animação ambiental.

Movimento: `delivery-closed/motion/{baseline,after}/movement.webm`, com KeyW
no loop normal entre z13,6 e −6,4, subida até y6,12 e retorno. Vídeo/trace não medem FPS.

Crítico independente confirmou melhoria dos corredores, mirante e contraste nos
dois combates. Conferiu separadamente que o tracejado na fachada do patamar e o
reboco serrilhado desapareceram. As casas distantes continuam simplificadas.
Aceitação do usuário não foi presumida; crítica de frames não prova todos os ângulos.

## Procedência e escopo

As cinco fotos são referências privadas, com licença não validada; nenhuma foi
integrada ao jogo nem convertida em textura. Inventário em
`references-r2/reference-inventory.json`; cópias e FONTE em
`references/escadao-visual/user-20260906/`.

Nenhum novo binário: tijolo reutiliza `lajes_tijolo_baiano_color.webp`, autoral,
conforme `public/img/FONTE.md`. Concreto/reboco são canvas procedurais locais;
geometria original usa materiais compartilhados e instâncias. GLBs existentes,
Game, registry, loaders, look e fauna não foram modificados nesta R2.
`delivery-closed/scope.json` verifica os fontes compartilhados e que apenas
Escadão mudou no layout/fingerprint de grafites.

## Validação e limites

O contrato mudou porque o veículo foi explicitamente rejeitado: agora exige sua
ausência e abrigo arquitetônico visível, colisor e oclusor. O ponto antigo de
exposição estava dentro do próprio cover; foi corrigido de (x0, z1,5) para (x0,6, z1,5).
Observadores laterais passaram de x±4, z8 para x±1,5, z7, posições livres/conectadas na
nova escada. Exigência de três ângulos de exposição foi mantida e mutada.

Nova régua de fachada nasceu vermelha: ombro atravessava peitoril em z11,92.
Depois da correção, caminhada de 110 frames, contato e retorno passam. Remover
apenas os 191 colisores reproduz 78 interseções no mesmo peitoril; restaurar volta a
verde. A física mantém raio 0,38 m; epsilon de 0,00001 m nos raios distingue tangência
numérica de penetração. O caso também foi reproduzido e corrigido com KeyW no
navegador. Essa régua é local, não uma varredura exaustiva de todas as fachadas.

AMBIENCE mantém o vermelho herdado AM7: Escadão tem 11 animais, 25 malhas e 41.568 tris,
contra teto de 6 malhas/29.000 tris. As demais 15 cláusulas passaram; não elevamos o teto
nem removemos espécies para esconder a falha. Recibo `references-r2/delivery-ambience.json`.

FPS/performance aguardam janela exclusiva. Contadores do renderer somam todos os
passes, mas não são benchmark temporal nem aprovação para produção. Integração
com a base do PR e aceitação humana permanecem separadas desta entrega local.

## Resultados consolidados

| Régua | Resultado final | Recibo em references-r2/ |
|---|---|---|
| Escadão contrato | 6/6 | facade-validation/contract/contract.json |
| Rotas / alto→spawn | 7/7; 0/920 visadas | facade-validation/routes.log |
| MAPCHECK | 0 dentro / 0 submersos; MAP1 sem penetrações | facade-validation/map_check.json |
| Fachada | 3/3; 110 frames, 75 contatos, zero interseções, retorno | facade-validation/normal/facade.json |
| Corpo no navegador | 8/8; 12 percursos, 134/134 visitas e retorno; 18 contatos sem travamento | delivery-closed/runtime-restored/runtime.json |
| Anéis CTF | 3/3 | delivery-closed/ring/runtime.json |
| Mutantes | 13/13 detectados causalmente | delivery-closed/final-verification.json |
| Contratos/checks globais | 14/14 após regenerar grafite | delivery-closed/final-verification.json |
| Mantle | PASS | delivery-closed/mantle.log |
| Build, docs, arch, comentários | PASS | delivery-closed/final-docs-build.json |
| AMBIENCE | 15/16; AM7 herdado vermelho | delivery-ambience.json |
| Galeria desktop/celular | 31 imagens carregadas; 13 vistas; controles funcionando; sem overflow/erros | gallery-browser-check.json |

Os 14 checks globais são mapcontrato, ambience-registry, look, escala-casario,
map-source, maptex, grafitelayout, asset-integrity, gltf-validator, props-acervo,
syntax, docs:check, arch:check e fixture. Checks verdes não apagam AM7.

Os seis mutantes de contrato são sem-bloqueio-flanco, cobertura-perfeita,
veiculo-no-patamar, cobertura-sem-colisao, varal-sumiu e varal-so-no-topo.
Os três de corpo são varal-na-rota, escada-bloqueada e sem-abrigo; os três de anel
são anel-plano, anel-enterrado e anel-colapsado. O décimo terceiro remove somente
os colisores de fachada. Contrato/fachada retornam exit 1 quando detectam mutação;
os testes browser retornam exit 0 para detecção esperada. O status JSON e a cláusula
causal, não apenas o exit, determinam o resultado registrado.

O fingerprint de grafite antigo foi recusado antes das capturas finais. Logs vermelhos
preservados em delivery-closed/preflight-red; nenhuma imagem rejeitada entrou na galeria.
O arnês agora bloqueia esse caso antes de iniciar o navegador. Regeneração manteve
262 peças; scope.json confirma que nenhuma entrada de outro mapa mudou.

Vídeos finais: 1536×1024, 17,20 s antes e 17,12 s depois; 1003/1009 amostras finitas,
subida até y6,12 e retorno. Hashes/dimensões em delivery-closed/motion/verification.json.
O trace sem tempo não mede velocidade; corpo/contatos/LOS são cobrados pelas réguas
separadas. Crítica independente aprovou as correções pontuais, não a produção.

## Custo e pendências

Contadores de todos os passes do renderer, média de cinco frames controlados, sete
bots, fauna ativa, qualidade alta e pixel ratio 1. Mesmas câmeras nos dois lados:

| Vista | Draw calls antes → depois | Triângulos antes → depois |
|---|---:|---:|
| subida | 1382 → 1203 | 809,958 → 1,153,861 |
| descida | 1387 → 1241 | 758,472 → 1,102,907 |
| lateral | 1209 → 1121 | 688,768 → 1,043,759 |
| rua | 1518 → 1340 | 810,529 → 1,163,895 |

As chamadas caíram, os triângulos aumentaram. Não inferimos ganho de FPS ou a causa
exata da diferença a partir desses contadores. Os tetos em tools/eval/cena-tetos.mjs
para mapas pesados são Piscina 860 calls/870 mil tris, Ferro Velho 620/1,17 milhão e
Loja H 360/1,41 milhão. Escadão excede suas faixas de calls e não tem orçamento próprio
aprovado nessa tabela. O teto retido de Quebrada também não serve como aprovação.

Próximo passo: reservar janela exclusiva para FPS/GPU antes/depois nas quatro vistas;
resolver o orçamento de fauna AM7 sem afrouxar a régua; revisão humana do visual e,
em etapa de integração, conflitos com a base vigente do PR. Sem variação dia/noite
introduzida. Esta entrega permanece local e não está aprovada para produção.

## Checkpoints e arquivos exatos

Commits locais desta revisão: 53f0c6b6 (composição), f6ac4bb3 (colisão de fachada),
dee96483 (preflight de capturas). O commit final contém relatório, ledger e blocos
gerados da documentação. Baseline de comparação: 9911d554.
PR #436 reconsultado: OPEN, CONFLICTING/DIRTY, head 4dc1f9bb, branch map2/escadao,
base feat/times-e-mapas-completo; recibo delivery-closed/pr.json. Sem push/merge/deploy.

Arquivos alterados nesta R2 em relação a 9911d554:

- `ARCH.generated.md`
- `README.md`
- `STATUS.md`
- `docs/docs/arquitetura.md`
- `docs/docs/colaborar.md`
- `docs/docs/comecando.md`
- `docs/docs/quality-gates.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/quality-gates.md`
- `docs/reports/ESCADAO-REFERENCIAS-R2.md`
- `docs/reports/ESCADAO-VISUAL-CONTINUATION.md`
- `docs/reports/ESCADAO-VISUAL-REFERENCIAS.md`
- `docs/reports/ESCADAO-VISUAL-RESULTADO.md`
- `package.json`
- `plans/12-ESCADAO.md`
- `public/js/graffiti_layout.js`
- `public/js/map_escadao.js`
- `tools/eval/escadao-contract-check.mjs`
- `tools/eval/escadao-evidence.mjs`
- `tools/eval/escadao-facade-check.mjs`

As mudanças em README/STATUS/ARCH e na documentação bilíngue são blocos regenerados,
sem refatoração compartilhada. Artefatos de comparação, vídeos e cópias privadas das
referências ficam ignorados, fora dos commits. Galeria local servida em
http://127.0.0.1:58555/gallery.html; o arquivo gallery.html é autocontido e pode ser
aberto depois de encerrar o servidor. O servidor do jogo permanece na porta 8148;
nenhum processo de outra frente foi interrompido.
