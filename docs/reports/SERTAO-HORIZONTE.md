# Horizonte de Caatinga — revisão do dono

O dono aprovou cerca de 90% do mapa, mas identificou horizonte vazio. Antes desta
mudança, `tools/eval/asset-evidence/sertao-review/praca-depois.jpg` e
`artifacts/sertao-astra/runtime-revision/{leste,sul}.png` mostram céu quase contínuo
acima das casas; no leste, o exterior da cerca perde-se num chão nu. A presença de
arbustos no código antigo não invalida essa evidência visual.

A [Embrapa descreve](https://www.embrapa.br/en/web/territorial/bioma-caatinga/s.i.t.e/natural)
a diversidade de formações arbustivas/arbóreas da Caatinga. O
[juazeiro conserva folhas mesmo na seca](https://www.embrapa.br/en/web/agencia-de-informacao-tecnologica/tematicas/bioma-caatinga/flora/forrageiras/juazeiro),
enquanto a [vegetação caducifólia expõe ramos](https://www.embrapa.br/agencia-de-informacao-tecnologica/tematicas/bioma-caatinga).
Consulta em 06/09/2026: trechos oficiais indexados disponíveis; algumas aberturas
diretas responderam 403. Nenhuma fotografia foi incorporada nem asset baixado.

A r5 usa seis exemplares do GLB local `sertao_juazeiro`, com troncos tortuosos,
raízes largas e ramificações contínuas, normalizados entre 4,6 e 6 metros. Cada
copa tem 96 sprigs de folhas pequenas, assentadas em vértices superiores reais
do tronco; são 576 sprigs no total. O acervo existente, sua procedência, geometria,
material e texturas são reutilizados: não há aquisição nem autoria externa nova
atribuída por este módulo. As folhas usam `sertaoLeafSprig` e o material `folha`
do mapa. Há 27 arbustos pequenos, em oito manchas irregulares, incluindo duas
mais distantes. A arena de 68 × 92 m mais margem de 5 m fica livre inclusive das
bordas das malhas. Não foram adicionados colisores, oclusores ou sombras.

API: `createSertaoHorizon(root, { low, enabled, leafMaterial, heroTemplate })`.
Requer `sertaoLandscape` pronta e o preload do juazeiro existente. `heroTemplate`
é opcional para injetar o GLB normalizado em testes; em jogo usa `placeProp`.
Retorna `{ group, sites, leafOwners, report, dispose }`. Sem GLB ou material de
folhas, registra `missingHeroes` em vez de criar uma árvore substituta grosseira.
`?sertaoHorizon=0` permite A/B. `dispose` libera buffers das instâncias e recursos
próprios uma só vez; conserva geometria, materiais e texturas compartilhados.

O alvo inicial de 15 mil triângulos foi revisto para **até 48 mil / 3 draws / zero
texturas novas**, porque as quatro soluções de baixo custo foram reprovadas em
imagem. O teto da cena continua **503 calls / 368.208 triângulos**. A revisão foi
uma troca explícita de geometria, não uma aprovação de primitivas por números.
R5 mede 46.230 triângulos: 6 × 5.023 nos troncos, 576 × 24 nas folhas e 27 × 84 nos
arbustos. Low usa três árvores, 64 sprigs por copa e 14 arbustos: 20.853 triângulos.
A integração real medida pelo coordenador passou de 496 calls / 305.718 triângulos
(r4) para **496 calls / 337.248 triângulos** (r5); restam 30.960 triângulos no teto.
Essa reserva pode acomodar as outras frentes, mas exige medição após integração.

A régua `node tools/eval/sertao-horizon-check.mjs` passa **HZ1–9**. Ela lê o binário
do GLB local, seus índices e atributos intercalados; usa texturas sem pixels apenas
para verificar compartilhamento de recursos. Não simula um tronco para se aprovar.
Mede presença do GLB, instancing, margem da arena, custo, low/off, alturas reais,
raízes sobre o terreno por raycast, determinismo/liberação, escala das folhas e
conexão das folhas em vértices do tronco. O maior erro de raiz é 0,000000564 m;
a maior aresta de folha é 0,221 m, com limite de 0,5 m. Esses critérios protegem
regressões técnicas; não avaliam beleza por pontuação.

Treze mutantes isolados deixam sua régua vermelha: `horizonte-vazio`,
`glb-ausente` (HZ1), `invade-rota` (HZ2), `sombra-cara`, `geometria-cara` (HZ3),
`low-cheio` (HZ4), `arvore-gigante` (HZ5), `flutuando` (HZ6), `sem-dispose`,
`sem-dispose-instancias`, `dispose-compartilhado` (HZ7), `folha-gigante` (HZ8),
`folha-solta` (HZ9). Logs em `artifacts/sertao-astra/horizon/r5/*.log`.
As regras antigas de cotovelos artificiais e profundidade de copas a 11 metros
foram substituídas pelos contratos do GLB e escala real; não foram relaxadas para
aceitar a árvore reprovada. As fontes da r4 estão preservadas em `horizon/*-r4.*`.

Rejeições preservadas: r1 `fauna2-horizon/{praca,leste,aerea}.png`, copas dissolvidas
na névoa; r2 `fauna2-horizon-r2/leste.png`, discos opacos; r3 árvores em Y como
antenas; r4 `life-polish-r4/horizonte.png`, árvore principal como vassoura/armação.
A r4 foi reprovada apesar de 10 gates verdes: acrescentar cotovelos não resolveu.
O diagnóstico independente está em `docs/reports/SERTAO-CRITICA-FAUNA2.md`.

Depois: capturas reais 1536 × 1024 em `fauna2-horizon-r5/{praca,leste,sul,aerea}.png`
e `life-polish-r5/horizonte.png`. Examinadas pelo construtor: o exemplar fora da
cerca tem tronco espesso irregular e copa baixa ramificada; a forma de vassoura
saiu. O crítico independente liberou a frente para revisão humana, conforme o
coordenador, sem transferir essa aprovação aos animais ou ao mapa inteiro.
`fauna2-horizon-r5/report.json` passou RV1–12; `life-polish-r5/report.json` passou LP.
Movimento de 30 segundos com sete bots em `motion-fauna2-controlled-velho_oeste/report.json`:
109,39 m percorridos, frame p50 de 8,4 ms e p95 de 12,6 ms. Resultado local, não
promessa de FPS em hardware diferente nem prova de equilíbrio competitivo.

Limitação para revisão humana: o fundo permanece árido e esparso, e os arbustos
muito distantes continuam simples. Não ampliar a mata, as árvores ou seu custo
sem nova comparação 3:2. Nenhuma aprovação final do dono ou publicação é alegada.
