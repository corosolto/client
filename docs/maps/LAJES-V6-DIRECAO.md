# Lajes V6 — somente o campo é amplo

O dono rejeitou as ruas da V5 em 06/09/2026 ao olhar a comparação: todas devem
ser muito estreitas, com abertura apenas no campo central. A V5 não está aceita.
Base local: `1621a6d8`, branch `codex/lajes-visual`; nenhum outro checkout muda.

A régua anterior cobria apenas becos laterais. A nova LRU mediu a seção física
e visual de todo o térreo antes da correção: 2.738/4.795 amostras largas, raio
máximo 5,510 m nos fundos. Evidência: `artifacts/lajes-visual/v6/gates/ruas-v5-red.json`.

## Decisões antes de implementar

- Campo/praça central conserva o retângulo x ±5,1, z ±7,5.
- Ruas centrais e laterais passam a aproximadamente 2 m entre construções;
  travessas dos respawns também são becos, sem pátios nas pontas.
- Casas ocupam os vazios com malha e colisão coincidentes. Porta continua
  0,90 × 2,05 m; pavimentos próximos de 3 m. Não reduzir prédios inteiros.
- Nascimentos no térreo, recuados numa travessa; esquina impede visada direta
  entre equipes. Preservar três trajetos, quatro escadas e circulação elevada.
- A travessa sob as pontes estreita também. Navegação recebe amostras explícitas
  nos eixos dos becos, além da grade, sempre passando por colisão e apoio reais.
- Pipas, helicóptero, morro e densidade exterior da V5 continuam presentes.

Os 2 m e o raio livre máximo 1,45 m são decisões de jogabilidade para o pedido,
não medidas inventadas das fotos. A seção visual, as capturas reais e a crítica
independente complementam a régua; aprovação numérica não significa aceite do dono.

## Validação necessária

LRU vermelha→verde, mutantes de rua aberta/barreira invisível/rota obstruída,
câmeras dentro de espaço livre, comparação V5/V6, spawn e todos os becos incluindo
cruzamentos, cinco percursos físicos, navegação/CTF/escadas/antiaprisionamento,
build e documentação. Artefatos locais sob `artifacts/lajes-visual/v6/`.
Não publicar, fazer push, merge ou alterar a PR. Sem aprovação de FPS/GPU enquanto
não houver janela exclusiva. Registrar os limites ainda herdados da entrega V5.

## Correção de medição LC6

Os seis pontos fixos antigos de aproximação ao limite ficaram dentro das casas
novas; `_collide` os desloca já na origem. Evidência vermelha preservada em
`v6/gates/audit-lajes-circuito.log`. A medição agora escolhe origens realmente
livres na componente principal, cobre oito aproximações (duas laterais por
travessa, norte/sul e diagonais), valida apoio e caminha até parar. Raio0,38 m
e folga0,18 m permanecem. Não descarta direções sem origem: reprova.

Normal8/8 verde; mutante `limite-invisivel` remove34 colisores reais e todas as
oito aproximações chegam ao clamp, derrubando somente LC6; restauração6/6
cláusulas verde. Logs e hashes em `v6/gates/complete-summary.json`. Nenhuma
geometria de produção foi mudada para corrigir essa sonda.
