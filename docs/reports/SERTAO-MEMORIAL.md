# Homenagem regional a Padre Cícero — candidato rejeitado

Pedido do dono e ficha: `plans/16-SERTAO.md`. A vila é ficcional; a homenagem não
alega que um monumento de Padre Cícero existe em Canudos. Não reconstruir a
escultura do Horto nem reutilizar sua composição protegida.

A [Fundaj registra Padre Cícero Romão Batista (1844–1934)](https://pesquisaescolar.fundaj.gov.br/pt-br/artigo/padre-cicero/).
A referência visual efetivamente aberta e examinada foi a
[fotografia histórica publicada pelo Senado](https://www12.senado.leg.br/noticias/materias/2023/08/04/em-processo-de-beatificacao-padre-cicero-pode-se-tornar-heroi-da-patria).
Ela mostra rosto idoso sem barba, chapéu de aba curva, batina fechada com botões e
mãos próximas ao tronco. Consulta em06/09/2026. A cópia de estudo fica somente em
`artifacts/sertao-astra/memorial/referencia-senado.jpg`; não foi incorporada como
textura ou asset distribuído. Não declaramos licença da fotografia.

O candidato autoral procedural e suas tentativas de remeshCPU foram REJEITADOS
pelo construtor e pelo responsável pela integração. O rosto permaneceu genérico,
sem fisionomia idosa reconhecível; primeiros olhos/boca e ombros pareciam peças
coladas. A fusão do corpo melhorou encaixes, mas não resolveu o problema facial.
Esconder a estátua ao longe não atenderia ao pedido. Não há aprovação visual.

Nenhum GLB foi exportado e nenhum código do memorial foi integrado ao mapa.
Fontes experimentais ficaram fora de `public/` e das réguas de produção, em
`artifacts/sertao-astra/memorial/`:

- `map_sertao_memorial.js`: geometria autoral experimental;
- `sertao-memorial-check.mjs`: testes técnicos do protótipo, não nota visual;
- `export.mjs`, `render.py`, `remesh.py`, `refine.py`: reprodução CPU;
- `rejected-{front,face}.png`: primeiro candidato;
- `memorial-{front,face}.png`: revisão sem fusão;
- `fused-{front,face}.png`: fusão que apagou detalhes;
- `refined-{front,face}.png`: corpo fundido e cabeça preservada, ainda rejeitada;
- arquivos `.blend`, `geometry.json` e logs: estados recuperáveis.

As réguas técnicas do protótipo verificavam presença, arena, proporções, custo,
relevo e liberação; ficaram verdes sem certificar a qualidade do rosto. Esse
resultado NÃO permite declarar a homenagem pronta. Reproduzir apenas o teste:
`node artifacts/sertao-astra/memorial/sertao-memorial-check.mjs`.

Próximo passo: obter escultura original com fisionomia adequada, usando geração
3D ou modelagem qualificada com procedência verificável, e submeter renders e
capturas reais a crítica independente. A estátua permanece fora do produto.
