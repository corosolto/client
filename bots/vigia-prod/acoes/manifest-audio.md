---
nome: manifest-audio
quando: sempre
ativo: true
checagem: manifest-audio
---
Classe: **BUG-19** (o drift 306/308) — o build da Vercel copia o
`manifest.example.json` (62 folhas) por cima do real (308) quando o fetch do
pacote falha em silêncio, e o jogo sobe sem voz.

Mede: baixa `/audio/manifest.json` do ar, conta FOLHA DE STRING (a mesma
métrica do `tools/eval/assets-check.mjs` — contando item de lista o número
mintia) e compara com o piso do config e com a última rodada salva: encolheu
= pacote veio pela metade de novo.
