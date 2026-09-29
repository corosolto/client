# 0005. Cliente Godot recusado como direção

Status: aceita (07/2026; saiu da árvore em 09/2026)

## Contexto

Contribuição externa de qualidade com o jogo portado para Godot 4.7.1
(72 testes GUT reais, tipagem estática total, lógica pura testável).
O PR que reorganizava a raiz foi recusado; o merge isolado em `godot/`
(PR #14) aconteceu e conviveu com o cliente web.

## Decisão

**Recusado como direção**, mantido o cliente Three.js. A execução era
boa; a tese não: 39,5 MB de wasm contra ~1,5 MB, paridade de ~30%,
estimativa de 25 a 45 dias para alcançar a main enquanto ela andava, e
manutenção dupla eterna com contribuidor único como bus factor. O
convívio "dois clientes para sempre" foi a alternativa rejeitada junto.

## Consequências

- As ideias boas foram cherry-pickadas: contrato de baseline com
  valores dourados, suíte Playwright adaptada ao cliente atual e o
  padrão de lógica pura testável extraída do `game.js`.
- O código portado saiu da árvore pública em 09/2026; os commits do
  autor seguem no histórico da `main` (ver `docs/LICENCA.md`, crédito
  preservado).
- Reabrir esta decisão exige ADR nova respondendo ao custo de aquisição
  com número medido no dispositivo alvo, não no desktop do dev.
