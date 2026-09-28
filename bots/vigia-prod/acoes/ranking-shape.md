---
nome: ranking-shape
quando: sempre
ativo: true
checagem: ranking-shape
---
Classe: o ranking quebrado que o `site-smoke` não pega fora do CI — API de
Supabase fora, shape mudado, ou rota devolvendo erro onde o jogo espera dados.

Mede: GET `/api/leaderboard` → 200 + JSON parseável; `disabled: true` é
ESTADO VÁLIDO (escolha, ver main.js); ligado ⇒ precisa ter lista de entradas
em algum campo conhecido. 503/HTML/vazio é defeito.
