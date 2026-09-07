# Claude Opus 5 — concluir o padrão visual do catálogo de mapas

Use exclusivamente `/Users/ruben/csbrasil/worktrees/mapas-polish-integral`, branch
`codex/mapas-polish-integral`. Leia `docs/maps/POLISH-CATALOGO-CONTINUIDADE.md`. O checkpoint
observado `506b82c7` está limpo, com recuperações, gates e 18 prompts individuais em
`docs/maps/prompts/`. Confirme isso antes de retomar e faça novo checkpoint antes de regenerar.

Continue a partir da recuperação seletiva dos PRs fechados sem merge #437 (Campinho do Morro), #440
(Parque) e #441 (Penitenciária), sem importar suas cadeias inteiras. Campinho próprio não é o
campo da Quebrada/#530. Reavalie o draft #538, que só contém inventário medido.

Percorra os 16 mapas registrados: Amazônia, Escadão, Praça dos Três Poderes, Piscina, Loja H,
Ferro Velho, Quebrada, Córrego, Lajes, Posto, UPA, Obras da Prefeitura, Atacadão, Parque,
Sertão e Penitenciária; acrescente Campinho e Joá quando suas recuperações estiverem integradas.
Priorize identidade brasileira, escala de materiais, silhueta, profundidade, ambiência, animais
e performance, preservando gameplay, CTF, spawns e colisões salvo bug medido.

Faça lotes pequenos por mapa, com baseline, mutantes, capturas 3:2, qualidade low/med e orçamento
de draw calls/frametime. Parque deve ganhar referência brasileira coerente; Penitenciária pode
buscar linguagem arquitetônica Carandiru sem retratar pessoas/eventos reais nem usar fotos como
textura. Posto, Atacadão, UPA e Prefeitura precisam preservar autoria de Emerson. Commit/push e
PRs pequenos por lote; não declare o catálogo pronto após um passe superficial.
