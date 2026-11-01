# Continuidade — régua do contexto de desempenho

## Objetivo e estado

Reparar o falso vermelho PCAMPO3 sem mudar produto: o recorte de `_perfFinish`
contém o spread real, mas a regex legada não seguia `_clientSessionContext`, onde
o renderer fornece `dprEfetivo`. R460 é proposta histórica UNRUN, com correções
Native explícitas; não aprova esta implementação.

Branch `codex/perf-context-gate-r488-20261101`, base
`4d23731b540a27b27d6d38b6f2be837f5dbcbb97`. Lease somente checker e este ledger.
Autoria R490: uma proposta GLM5.3 low/no-tools, RAW preservado antes da
adjudicação/aplicação Native. Pacote externo `PERFCAMPO-AUTHOR-R490-*` em
`audits/2026-10-31-visual-consistency/` no workspace pai.

A autoria R490 encerrou com funcional UNRUN e somente sintaxe/whitespace verdes.
Root recebeu a lease, leu o código, ledger, REPORT e RAW inteiros e conferiu
56 pins sem divergência antes das provas R495 abaixo. Nenhuma prova funcional
foi executada pelo autor.

## Contrato do instrumento Node

PCAMPO1/2/4/5 conservam os predicados de fonte. PCAMPO3 extrai duas funções reais
de `main.js`, por nome/assinatura única e fronteira de seção única no formato
de topo suportado. Exige um fechamento de topo, compila o trecho completo e
recusa forma ausente/duplicada/não suportada como INFRA. Não é parser geral JS.

Cada caso cria contexto VM novo com `window === globalThis`, DPR de dispositivo2,
shape real de `telemetryGameContext` sem DPR e dependências controladas. As duas
funções reais e a chamada de `_perfFinish` ficam na mesma execução com prazo.
`sendJsonKeepalive` captura os payloads reais; as comparações estritas acontecem
dentro da VM antes da serialização. Prazo500ms protege o instrumento; não é teto
de FPS, latência ou desempenho do produto.

Casos exercitados por Root: renderer0,75, renderer1, getter que lança e retorna null pelo
catch real; consentimento negado exige zero envios e zero acessos ao renderer.
Nos permitidos: uma rota `/api/perf`, DPR próprio efetivo exato, dpr2 e sentinelas
boot1234/frames57/load4321. Saída expõe casos, erros, payloads, contadores, hashes,
aplicações de mutação e failset PCAMPO. Valores não finitos não viram igualdade
com null por serialização: a decisão ocorre antes do JSON, com tipo/finito expostos.

Mutações in-memory com alvo encontrado exatamente uma vez: `sem-contexto` remove
o spread real de `_perfFinish`; `dpr-dispositivo` substitui o return real do getter
no helper; `sem-mapa` conserva a remoção da linha do beacon e o PCAMPO1 esperado.
Ausência/duplicidade, leitura, compilação ou throw/timeout de VM são INFRA/exit2.
Mismatch semântico dá exit1. Sem mismatch dá exit0; mutante sobrevivente é
NO_DETECTION, nunca RED forçado ou crédito de detecção. ALVO_RED só indica que
o PC alvo falhou; Root exige nominal anterior verde e failset exato para dar crédito.

## Provas executadas por Root — R495

- Nominal primeiro: exit0, cinco PCAMPO OK, failset vazio, quatro casos corretos.
  Payloads enviaram DPR de dispositivo2 e efetivo0,75/1/null conforme o renderer;
  consentimento negado produziu zero envios e zero acessos ao renderer.
- `--mutar=sem-contexto` e `--mutar=dpr-dispositivo`: exit1, somente PCAMPO3 RED,
  aplicação1x e zeroINFRA. `--mutar=sem-mapa`: exit1, somente PCAMPO1 RED,
  PCAMPO3 continuou passando. Alvos e fontes foram mutados apenas em memória.
- Dezessete dos dezenove controles em fixtures externas: declarações0/2, assinatura ausente,
  fronteiras0/2, compilação inválida, throw inesperado e timeout da VM deram
  INFRA/exit2 nas fases esperadas, sem crédito semântico. Alvos de mutação0/2
  foram recusados antes da execução das funções mutadas.
- Retorno NaN permaneceu mismatch semântico PCAMPO3/exit1, apesar de a
  serialização do payload mostrar null; o diagnóstico conservou tipo/finito.
  Mutação sintática sem mudança semântica sobreviveu como NO_DETECTION/exit0 e
  foi explicitamente rejeitada pela prova causal externa.
- Os primeiros builders dos controles foram preservados como V1 e V2 REJECTED:
  V1 procurava um spread único no main inteiro, que contém três chamadas reais;
  V2 comentava uma cauda de expressão no fixture de duplicação. Nenhum desses
  erros de preparação recebeu crédito. V3 limitou o spread à função real e usou
  comentário de bloco; os dezenove controles completaram os resultados previstos.

Recibos externos: `PERFCAMPO-AUTHOR-ROOT-REBIND-R495.json`,
`PERFCAMPO-NOMINAL-R495.{json,log}`, `PERFCAMPO-MUTANTS-R495.json` e
`PERFCAMPO-CONTROLS-R495.json`; script e fixtures por caso permanecem fora do Git.
Comandos reproduzíveis do checker: `node tools/eval/perf-campo-check.mjs` e o
mesmo comando com `--mutar=sem-contexto`, `--mutar=dpr-dispositivo` ou
`--mutar=sem-mapa`. Exit1 dos mutantes é o RED semântico esperado, não aprovação
isolada: o julgamento causal externo exige nominal verde e failset exato.

Próximo: checks focais, congelamento dos dois arquivos e revisão integral GLM e
independente do ponto atual antes de checkpoint, push normal e CI. O ledger
externo `CURRENT-STATE-20261031.json` acompanha a missão e a fila de PRs/release.

O RAW R490 continha consent invertido, failset placeholder e ramo de sobrevivência
morto; não foi aplicado literalmente. A extração foi endurecida e o julgamento
movido para dentro do prazo. Não há veredito CLEAN ou validação funcional nesta autoria.

## Missão integral preservada

PRs elegíveis/release e consistência de mapas, personagens, skins, movimento,
AK/ADS e backend continuam. Flávio/#1158 excluído; fluxos UI/redes sociais são
posteriores. Esta régua Node não prova dispositivo físico, WebGL/FPS real, rede,
persistência backend nem aceite artístico. Produto, Piscina e armas não mudam.
