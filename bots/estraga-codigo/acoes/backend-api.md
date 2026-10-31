---
nome: backend-api
quando: src/pages/api/**, src/lib/**, src/middleware*, game/**, signaling/**, scripts/**, server.js, server-*.js
ativo: true
---
Revisão de rota/biblioteca de SERVIDOR (nunca vai ao browser, mas decide coisa séria):

1. SEGREDO: nenhuma chave/service_role/token em código, tipo ou log. logInternalError com nick/uid no payload é vazamento (TL9).
2. RATE LIMIT E INPUT: rota nova que aceita POST precisa de validação de corpo e rate limit (padrão: rateLimit() no Postgres, ver ratelimit.ts). Campo de usuário que vai pro banco tem slice/teto de tamanho.
3. CONSISTÊNCIA ANTI-FRAUDE SEM FALSO POSITIVO: trava que recusa jogador legítimo é defeito GRAVE da mesma ordem que deixar trainer passar — e pior se der strike/_flag antes de recusar (BUG-35/#87/#116). Teto/piso com premissa de um modo aplicada noutro é o padrão.
4. READ-MODIFY-WRITE: contador/estatística que faz select+update em vez de RPC atômica tem condição de corrida (TL7).
5. TIMEOUT: fetch para fora sem timeout segura a serverless (o caso dos 504 de 300s, #269).
6. DUPLO ENCODE E OFFUSCAÇÃO: caminho gravado não codifica; quem monta URL codifica. Espelho ofuscado (nomes trocados) precisa acompanhar o schema — se o diff muda um, pergunta do outro.
7. PRERENDER: rota dinâmica precisa `export const prerender = false`; o contrário também é defeito (página estática que lia estado).
