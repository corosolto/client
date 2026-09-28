---
nome: frontend-publico
quando: public/js/**, public/style.css, src/pages/*.astro
ativo: true
---
Revisão do lado CLIENTE (zero build, vai cru pro navegador):

1. ZERO BUILD É LEI: public/js não pode ganhar dependência de npm, import de CDN, ou passo de build. Three.js é vendorizado. Um `import` novo de pacote = reprovação.
2. PISTA DE BACKEND PROIBIDA (decisão do dono 15/08): nada de nome de provedor (supabase/postgres/firebase/service_role) em comentário, string ou texto de UI servido — quem abre o jogo vê o JOGO. Detalhe de provedor mora em doc interna.
3. CACHE-BUST: mudou public/js/**/*.js? O import map do index.astro deriva a versão dos bytes (module-cache.mjs) — não existe bump manual. Procure `?v=` escrito à mão.
4. BOOT É SENSÍVEL: main.js roda cedo; código novo no topo do módulo que depende de DOM/estado posterior quebra o boot em silêncio (lição do _sendPerf e do ping de presença: ordem de declaração importa).
5. ERRO EM SILÊNCIO: catch vazio em caminho que "funciona mesmo sem" — a casa prefere fail-silent COM telemetria ou comentário de por quê. Catch novo sem nada precisa se justificar.
6. EM-DASH/HTML: CSS não tem comentário `//` (engole o bloco seguinte); texto público sem travessão —.
7. LOOP DE SIMULAÇÃO: dt vem fatiado do main.js (passos ≤ 50 ms, teto 4, só o último renderiza) — game.update(dt) novo assumindo frame = passo quebra a semântica de #295.
