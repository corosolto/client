# Produção CSBrasil — coordenação e janela de 24 horas

## Objetivo e decisões do dono

Ruben autorizou em 06/09/2026 reorganizar globalmente as frentes para reduzir consumo,
preservar qualidade e concluir os trabalhos abertos. Logo depois esclareceu que quer
concluir todas as frentes nas próximas 24 horas, mantendo a capacidade visual do Astra.
Janela operacional: 06/09 05:55 UTC a 07/09 05:55 UTC (06:55 Lisboa).
É meta de entrega, não garantia nem autorização para afrouxar critérios, comprar
créditos, aprovar visuais automaticamente ou fazer merge/deploy sem aprovação concreta.

O catálogo completo de armas continua no objetivo; áudio, menus, mapas e personagens
não podem desaparecer da fila. Escopo não especificado deve ser identificado antes de
implementar. O prazo não transforma trabalhos desconhecidos em concluídos.

## Operação

- Coordenador: tarefa `01a073e4-50fa-7c52-9ac7-729a088fc976`, lane
  `vm-prep-precisao`, branch `codex/vm-prep-precisao`. Este arquivo é a fila global;
  evidências detalhadas ficam nos ledgers de cada frente, sem repetir investigações.
- Astra mantém direção visual, decisões difíceis e revisão de marcos. Terra executa
  tarefas delimitadas; Luna/scripts servem para rotinas. Não migrar tudo sem comparar
  resultados em um marco real. Nenhum modelo compra créditos ou aumenta gasto máximo.
- Transição por checkpoints seguros, sem descartar ou arquivar frentes. Iniciar com
  duas frentes de produção; reavaliar capacidade após o primeiro marco para o prazo.
  Mais paralelismo exige arquivos/recursos independentes, não apenas modelos livres.
- Um escritor por lane, um browser/captura por vez. Asset worker M4 permanece offline.
  Runtime de armas/mãos/câmera/HUD segue exclusivo da integradora vm-astra-pistol.
- Cada despacho define artefatos, critério de pronto e limite de tentativas. Após duas
  tentativas sem progresso, salvar e escalar uma pergunta técnica com evidências.
- Construtor não aprova seu resultado. Crítica independente em contexto delimitado;
  aprovação do dono preservada. Não reabrir aparência/poses aceitas sem defeito novo.
- Acompanhamento usa metadados e snapshots compactos. Não ler turnos inteiros/logs
  JSONL. Revisões/render/testes só quando mudança ou falha concreta justificar.
- Priorizar terminar candidatos próximos da entrega antes de iniciar melhorias novas.
  Separar implementado, validado, aprovado, pronto para release e publicado.
- Checkpoints do prazo: T+2h inventário/bloqueios, T+8h primeiras entregas, T+16h
  foco em integração/pendências, T+22h congelar novos incrementos para validação final.
  Não prometer catálogo completo antes de medir esforço restante.

## Fila e checkpoints

| Frente / tarefa exata | ID | Estado observado / próximo passo |
|---|---|---|
| Preparar frente Snipers e Precisão | 01a073e4-50fa-7c52-9ac7-729a088fc976 | Coordenação; catálogo integral no ledger específico abaixo |
| Prepare a frente Rifles do CSBrasil. Leia integralmente: /V… | 01a073e3-1632-73d3-9683-e1394339fa8e | DESPACHADA Terra/high: M4 tactical do checkpoint Claude, somente offline, aguardando início confirmado |
| Elevar visual do Escadão | 01a073e5-b003-7993-afd6-41d31e25d98d | PAUSADO ada21d8d, codex/escadao-passagens-horizonte limpa; duas divergências do grafo e horizonte pendentes; próximo marco45–90min, R5 estimado2–4h; Astro8148/PID94385 ativo sem captura |
| Elevar visual de Lajes | 01a073e5-35e9-7312-b6a7-7beecc8df714 | PAUSADO 098a6fc2; candidato c26a40cf/PR517 pronto para revisão, 15–30min estimados se CI verde; sem browser/servidor próprio |
| Elevar visual da Amazônia | 01a073de-ee16-74a1-8deb-c92763271450 | DESPACHADA Terra/medium, reserva de integração/main; candidato7a613e11/PR439, checkpointf74e7f83;5–30min se CI verde; conferir autorização anterior concreta |
| Elevar visualmente o mapa Sertão | 01a073c0-b824-7503-b28a-f7522cececcc | PAUSADO0b925981; candidato ca8d569f/PR516 pronto, CI/imagem pendentes;30–60min estimados com publicação se autorizada; sem browser/servidor próprio |
| Revisar e shipar PR Miticos | 01a07485-2ddf-7052-b858-f814cabc30f7 | PAUSADO confirmado, e370c2ff, codex/miticos-visual limpa; Cuca próximo marco2–4h, crouch/grip reprovados; Zumbi textura/integração e outros personagens pendentes; PR481 conflitante |
| Corrigir modo CTF na home | 01a07540-471d-7a60-9448-2692d52ab8dd | Implementado 4abeaa40; relato build/browser3:2 aprovados; não publicado; três falhas gerais fora do menu |
| Estabilizar CSBR antes de expandir | 01a069ad-894d-7fb0-80d4-21b00fa1e60d | Último turno interrompido preparando laboratório de áudio na home para escuta; tracer separado do PR; recuperar escopo/ledger antes de produção |
| Corrigir data dos gráficos | 01a073dd-418d-73b1-8583-ce2560742795 | Última resposta relata aplicado em produção, PR508/admin6/backend21; histórico ausente não retropreenchido. Não reabrir sem defeito novo |
| Corrigir contagem de players online | 01a06d45-7570-7501-b75b-eaffd629ad5b | Último turno completed sem resposta textual; não contar como resolvido sem evidência |
| Mais áudio, menus e mapas em espera | escopo a consolidar | Não inventar novas entregas; recuperar backlog existente e sinalizar itens ainda indefinidos |

Míticos: ledger `/Users/ruben/csbrasil/worktrees/miticos-visual/docs/reports/MITICOS-VISUAL-CONTINUATION.md`.
Checkpoint recebido confirma servidores 8191/8192/8193 encerrados, crítico interrompido,
sem captura própria ativa, sem automação; aguarda novo despacho.

## Viewmodels e substituição Claude

`VIEWMODEL-CATALOGO-ORQUESTRACAO.md` conserva catálogo, controles, critérios e release.
Os parágrafos históricos que mandavam retomar Claude após cota estão SUPERADOS pela
autorização de redistribuição. Não retomar a sessão Claude automaticamente às 09:50.
Sessão e insumos ficam preservados; não cancelar outros Claudes fora desta frente.
Confirmado em 06/09: PID antigo não corresponde ao worker, exit1 por cota. Scripts novos
continuam na lane rifles, não versionados. Artefatos/revisão salvos na coordenação.
Terra deve começar pela revisão M4, preservar controles e produzir progresso verificável.

## Continuidade e automação

Automação existente `coordenar-cat-logo-de-viewmodels-com-claude` foi renomeada para
`Coordenar produção CSBrasil com orçamento`, com prompt global sem retomada Claude.
Temporariamente PAUSADA durante transição; reativar após registro de despachos e modelo
de acompanhamento. Não criar duplicata nem deixar mecanismo antigo lançar Claude.
A janela de 24h não encerra silenciosamente o objetivo: no prazo, informar entregues,
pendentes e bloqueios com artefatos. Continuar objetivo autorizado conforme prioridades.

## Próximo passo

Primeiros despachos: M4 tactical offline + Amazônia em fechamento. Ao liberar integração,
priorizar Lajes/PR517 e Sertão/PR516 sequencialmente; depois Escadão/R5. Preparar decisão
Astra delimitada para Cuca antes de repetir tentativas. A fila poderá avançar enquanto
M4 trabalha offline, sem abrir mais produção concorrente. Atualizar tabela por retorno.
Registrar modelo configurado separadamente do modelo efetivamente observado quando possível.

## Registro de consumo e limites operacionais

Snapshot da conta consultado às ~05:52 UTC: janela semanal73% usados, 5.000 créditos,
zero resets disponíveis. Não atribuir esse gasto às tarefas nem converter para dólares.
Não há novo orçamento monetário autorizado. Não acionar compra/API alternativa. A meta
24h não equivale a gasto ilimitado. Conferir consumo nos marcos relevantes e avisar
se os limites impedirem a execução. Economia virá de contexto/escopo e delegação, não
da redução dos critérios visuais. Tarifas/modelos foram verificados nesta tarefa.
