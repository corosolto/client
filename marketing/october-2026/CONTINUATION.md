# Conteúdo CORO SOLTO: outubro e comunidade

Objetivo: atrair e trazer de volta jogadores e devs em outubro, mantendo comunidade após 25/10. Entregar kit reutilizável com identidade atual, três apoios do principal V9 (troca de tiros, escolha de personagem, mapas), bastidor dev, convite a testar, legendas por canal, calendário de 15 dias, quatro semanas de comunidade, fila de aprovação, UTMs e welcome compatível com consentimento existente. Apresentação transferida pelo dono para novembro. Não esperar novos trailers.

Definição de pronto: fontes visuais rastreáveis; templates editáveis e exportações olhadas; revisão independente; chamadas apoiadas no produto público/fonte real; fila publicável mediante aprovação. Vídeos dependem da frente mídia. Publicação/envio/compra/merge/deploy seguem fora desta autorização.

Lane: `codex/marketing-october-kit-20261010`, base `261cf59a7bbc0a7e50352a84d6ba5cb8313eec95` (origin/main). Worktree própria (checkout ampliado para os gates locais) em `worktrees/marketing-october-kit`. App create_worktree falhou porque agregador não é Git; criada pelo Git no child client. Somente `marketing/october-2026/` é superfície de escrita. Nenhum arquivo de jogo/social/docs/trailer alterado.

## Fontes e decisões validadas

- Tokens de `public/style.css`: fundo #090704, texto #f0f0ed, acento #b4d92e, âmbar #f3b958, linha #34302b; Bebas Neue, Barlow Condensed e ST Mono; cortes e escala de espaçamento existentes. Conferida captura local social `community-game-ui.png` apenas como referência, sem copiar perfil ou métricas para peças.
- Assets são bytes do commit base, não da primary suja. Previews Amazônia e Velho Oeste conferidos contra SHA-256 de recibos versionados. Velho Oeste da primary diferia do recibo e foi rejeitado. Arte Canarinho tem rótulo explícito de arte; não é captura de combate.
- Correção direta do dono em 11/10/2026: URL pública SEMPRE https://www.corosolto.com.br/. O domínio antigo do código foi rejeitado como referência de divulgação. Todos os CTAs e rodapés, inclusive dev/welcome, usam o domínio do dono; Código permanece acessível pelo menu Sobre o jogo. Fonte da URL centralizada em tokens.json. Leitura de página não prova partida funcional.
- Dados confirmou source/medium/campaign e first-touch por navegador. `utm_content` não é persistido. Campanha distinta por peça. Retorno não reatribui first-touch. Sem métricas públicas autorizadas.
- Welcome: contrato lido em `worktrees/social-community/docs/social/OPERACAO.md`: escolha separada inicialmente desmarcada, confirmação de email, retirada e cancelamento de pendência, SMTP produção pendente. Social dona única do fluxo. Sem coleta/importação/envio pela lane marketing.
- Roteiros aceitos do dono: visita eleitoral à favela e debate online. Propostas anteriores rejeitadas. Produção nas próximas semanas, sem geração paga nesta lane.

## Milestones

1. Fontes extraídas em `assets/` e `SOURCES.json`; fontes TTF derivadas das WOFF2 para exportador local. Nenhuma geração AI ou crédito externo.
2. Template SVG reutilizável e cinco peças em três formatos exportados. Três apoios prioritários olhados: fonte correta, chanfro, logo proporcional, arte/captura identificadas. Corrigidos kicker sobre título e glifo de seta ausente. Ajuste de story/landscape e revisão independente em curso. Exports gerados permanecem fora do Git; template/assets tornam recuperação reproduzível.
3. Calendário de 11 a 25/10 e quatro semanas de comunidade 26/10 a 22/11, copy por canal e fila local de 63 rascunhos preparada. Sem agenda/post criado. Welcome HTML e contrato separados, sem envio.

Checkpoint `fc1f6cad8`: assets e procedência, 15 arquivos/128 linhas, Signed-off-by e Agent: Codex. Ferramentas/cards/textos em preparação para segundo checkpoint. Servidor de revisão somente loopback http://127.0.0.1:4417/ com HTTP200. IAB também timeout na abertura local; controles da fila ainda sem teste visual/interação por browser. Tipografia corpo renderiza o nome interno Barlow Condensed Medium para corresponder ao peso500 da fonte do jogo. Exports e fila regenerados após correção.

## Limitações e próximo passo

IAB público apresentou timeout; nenhuma captura nova/gameplay foi certificada. Previews WebGL históricos rotulados com data, sem afirmar fidelidade à produção atual. Até revisão humana, status é pronto para revisão, não aprovado/publicado. Próximo: concluir revisão independente, validar integridade dos arquivos/UTMs e UI local possível, corrigir achados, checkpoints e draft PR. Metricool encontrado na busca de plugins mas não instalado; permissão global low-risk não prova acesso aos perfis sociais. Sem conexão/OAuth de publicação certificado.

## Correção do domínio e retomada em 11/10

O dono perguntou a origem das imagens e corrigiu a URL. São rascunhos com arte existente de Canarinho e capturas históricas de mapas, não frames novos do trailer. Rerenderizar todos os PNGs/SVGs para www.corosolto.com.br e regenerar legendas/fila. Aprovações anteriores devem ser invalidadas por SHA/URL/baseCaption. Checkpoint assets fc1f6cad8 preservado. Processos/checks anteriores perderam sessão; não presumir gates concluídos. Dados tem ownership do IAB nesta rodada, sem competir por browser. Próximo: gates locais, revisão final da correção de domínio e checkpoint template/fila/draft.

Domínio corrigido e validado em todos os 15 rodapés SVG/PNG e63URLs de fila: www.corosolto.com.br. Utms preservadas inclusive LinkedIn/dev; destino oficial centralizado em tokens.json. PNG prioritário rerenderizado e olhado com domínio correto. eval:mapcontrato MC1/MC2/MC3 passou. Check:deploy em curso, já aponta falha vm-serving-config fora da superfície marketing. Revisão independente clean-context retomada porque agente anterior não sobreviveu à rodada interrompida.

## Validação final local em 11/10

check:deploy passou48/48 em31,7s após corrigir dependências da própria lane. eval:mapcontrato MC1/MC2/MC3 passou. Falha42/48 inicial era ambiental, não um defeito atribuído ao jogo. Fonte/arte/15exports/63URLs/hash e lógica de revisão confirmados independentemente, sem P0/P1/P2/P3 pendente. Revisão em REVIEW.md. A fila invalida aprovação imediatamente ao editar legenda e após regenerar arte/link/copy. Sem IAB/produção/social/email real certificados.

Checkpoints: fc1f6cad8 assets/fontes;7afec811d template/cards/tool;288dc8db2copy/calendar/welcome;0aba3766a fila63;0d7461d70 invalidação/aviso. Exports ignorados,27MB locais regeneráveis. Próximo: registrar review/gates/checkpoint e enviar branch ao fork para PRdraft sem bypass. Somente marketing no diff; status fora da lane limpo depois dos mutantes dos gates.

## Entrega revisável e próxima ação

PR draft #811: https://github.com/corosolto/client/pull/811. Implementação publicada em 6e4714f72; checkpoint do ledger publicado em c57d4033c, confirmado tanto no PR quanto no ref do fork em 11/10. Branch exclusiva no fork rubenmarcus/client. Pre-push completo passou em 38s e novamente em 37s com Node 23. Tentativa anterior com Node 16 foi recusada, sem bypass; runtime explicitado na nova tentativa. Nenhum merge/deploy/publicação/envio/compra. Servidor local reiniciado em 127.0.0.1:4417 e HTTP 200; página/arquivo abertos no Codex com retorno queued, sem afirmar que foram vistos pelo dono.

Fonte complementar da frente dev: /Volumes/Zenith/Projects/game/corosolto/csbrasil/worktrees/dev-community-progress-20261010/reports/growth-devs-2026-10/ATIVACAO.md (checkpoint6870db0, PRdraft810). Próximas pautas: quickstart, Game/arnês/Agent, SIM_HASH. Recortes54/327/296 exigem reconsulta de status/PRs e mantenedor antes de chamada; não anunciar instalação como partida validada. Reusar card04 do kit para esses desdobramentos.

Milestone concluído: template,5peças/15exports,legendas/fila,15dias e4semanas,welcome e revisão independente. Pendente: revisão humana dos rascunhos/URLs e escolha do primeiro lote; vídeos pela mídia; UI no IAB, transporte welcome e plataformas sociais continuam não certificados. Próxima ação concreta: dono revisar três apoios prioritários na fila local e escolher lote/canais. Aprovação de conteúdo não concede merge/deploy/envio; cada publicação precisa do escopo explícito já previsto no plano. Manter worktree e exports locais para correções.

## Snapshot remoto após entrega (11/10/2026)

PR #811 OPEN / DRAFT / BLOCKED no head publicado c57d4033c. Vercel: FAILURE, preview remoto falho/indisponível. Build, classify e DCO ainda em execução na consulta; ratchet, bot-token e verificações de versão já SUCCESS. AutoMergeRequest é null. Estes estados são o snapshot consultado, não previsão do resultado final.

O preview remoto não está verde. Revisão permanece nos arquivos/exportações e fila local, sem aprovação ou publicação inferidas. IAB pertence à mídia nesta rodada. Por direção da coordenação, gates locais já 48/48 não foram repetidos para este registro. Somente este ledger foi alterado e recebe checkpoint local; template/fila/arte permanecem no head publicado. A nota pode subir com a próxima alteração autorizada, mantendo o pre-push obrigatório, sem reexecutá-lo agora.

## Personagens em destaque e variantes políticas (11/10)

O dono aprovou a base visual ("ficaram bons") e pediu personagens mais visíveis e versões com políticos. Layout, cores, tipografia e domínio oficial preservados. São cards sociais; OG images/metadados do site não foram alterados. Canarinho ganhou enquadramento de rosto/arma; três alternativas usam as caricaturas 3D já existentes: Barbudo do Planalto, Capitão do Cercadinho e dupla com tratamento equivalente. Retratos realistas chars-realista foram examinados e rejeitados para estas peças; fontes são telas de resultado caricatas em public/img/resultado no commit base, com bytes/hashes registrados. Nenhuma geração paga ou novo personagem.

Milestone: fonte e template atualizados, primeira renderização dos 24 PNG/SVG olhada; escala política refinada antes da revisão final. Alternativas entram nas mesmas datas (12,17,23), com alternativeTo, sem ampliar o calendário de publicação. Aprovações anteriores de arte alterada serão invalidadas por SHA. Próximo: regenerar exports/fila, conferir imagens/dimensões/domínio, crítico independente, checkpoint e atualizar PRdraft811. Nenhuma aprovação de publicar inferida.

Milestone validado:24PNG vistos individualmente pelo crítico clean-context, sem P0/P1/P2/P3. Auditoria114itens passou (15fontes,24exports,75linhas),12alternativas com referências corretas, URLoficial em todos os destinos/rodapés, Xaté244caracteres. Revisão adicional em REVIEW.md. Checkpoint958ffb9c6 publicado no fork e PRdraft811; pre-push obrigatório passou49s, worktree limpa depois dos gates. Título/descrição do PR atualizados para o kit final.

Próximo passo: revisão humana do enquadramento ampliado e escolha entre as três alternativas políticas na fila local, nas datas12/17/23; publicação permanece pendente. OG/metadados do site fora do escopo. Nenhuma chamada de plataforma/merge/deploy/email. Checkpoint da revisão preservado junto à mesma branch; manter exports locais regeneráveis.

## Direção visual corrigida pelo dono: personagem de altura inteira

O dono rejeitou personagem preso a uma janela no meio do card e os rótulos "arte do jogo". Nova direção: personagem com100%da altura e mais de metade do card, fade contínuo para preto, políticos com acabamento estilizado equivalente ao Canarinho. Estes critérios substituem a aceitação anterior de enquadramento recortado; não declarar aquele layout como aprovado.

Duas variantes promocionais geradas pela ferramenta integrada image_gen (sem CLI/API/Higgsfield), a partir das caricaturas de resultado e referência de estilo Canarinho. Cabelo, rostos caricatos, roupas/cores e silhuetas conferidos a olho; alpha presente e preservado. Prompts em GENERATION-PROMPTS.md. Nenhum asset do jogo será alterado. Próximo: incorporar fontes no kit, render de altura inteira/fade, remover rótulos públicos, conferir e revisar independentemente. Domínio oficial e calendário/alternativas mantidos.

Milestone:24PNG/SVG regenerados, fonte17assets e fila75 conferidos por hashes/destinos; rótulos removidos das peças e legendas, alpha dos políticos preservado na codificação WebP lossless. Canarinho, políticos e dupla olhados no novo layout; corrigidos fade que escurecia rosto da dupla e margem superior do cabelo. Personagens continuam até a borda do card, sem janela/corte no meio. TítulosSVG sincronizados com alt atualizado, pixelsPNG preservados.

Checkpoint de implementação a seguir: somente13arquivos da superfície marketing; exports regeneráveis continuam ignorados. Próximo: crítico clean-context com a direção atual do dono, registrar conclusão e atualizar PR811. Gates antigos não serão repetidos manualmente; pre-push obrigatório será executado sem bypass.

Milestone validado no checkpoint8a7453c85: crítico clean-context viu24PNG e confirmou altura inteira/continuidade até base, rostos intactos, fade e estilo político equivalente;17fontes/24exports/75linhas/12alternativas conferem. Nenhum achado de severidade remanescente no escopo. Docs distinguem retirada dos rótulos técnicos das imagens e referências de arte das legendas de personagens; data histórica de mapa/dev permanece para não insinuar cenário atual certificado. ReprodutibilidadePNG confirmada byte a byte em um export após ajuste title/alt, alpha político real preservado.

Próxima ação concreta: checkpoint desta revisão e atualização do PRdraft811 com uma única execução do pre-push obrigatório. Depois, dono revisa as novas peças e escolhe alternativa/canal; aprovação de layout antigo supersedida e não reaproveitada. Publicação/merge/deploy/email continuam pendentes de escopo próprio; IAB não foi usado. Arte/24exports locais mantidos nesta lane e fontes/prompts recuperáveis no Git.

Entrega confirmada em 11/10: implementação8a7453c85 e revisão8110303a7 enviadas ao fork; PRdraft811 confirma head8110303a756dc18b5f2b99bdf56c79764a607a67 e título atualizado. Pre-push obrigatório passou em160s, sem bypass, com Node23; worktree limpa após os gates. Este registro final recebe checkpoint local, sem repetir o gate apenas para documentação. Próximo: revisão do dono sobre o layout novo e escolha de alternativa/canal; nenhuma publicação ou aprovação humana inferida.

## Continuidade do PR em 12/10/2026

Autorização recebida para push/PR de todas as frentes, preservando limites de merge/deploy/publicação. PRdraft811 existente anexado a este chat; nenhuma duplicata. Base original261cf59a7bbc0a7e50352a84d6ba5cb8313eec95 ainda é ancestral. Implementação8a7453c85, revisão8110303a7 e ledger70091d4eb preservados. Ao retomar, a mesma lane já tinha o commit vazio55f53aa02 de GLM5.3 e um push em curso; aguardado sem competir. Head remoto55f53aa0213ae1dfd9d2362d4f5e2937ece5cd7f confirmado depois, sem alterar esse commit ou outras lanes.

Evidências de arte/fila e revisão permanecem em REVIEW.md/SOURCES.json/exports/MANIFEST.json; não houve mudança visual nesta retomada. Snapshot remoto: Vercel FAILURE aponta para autorização da integração Git; demais checks novos ainda em andamento. Nenhum preview ou CI completo inferido como aprovado. Descrição do PR registra dependência editorial do PR810 (contexto dev), mídia (vídeos) e social (transporte/consentimento welcome); template e fila não exigem merge do PR810. Este checkpoint documental será enviado com pre-push obrigatório sem bypass. Próximo: confirmar envio, acompanhar checks conforme necessário e manter revisão humana/publicação pendentes.

Milestone confirmado: checkpointeae7970d5859dd9435cfdbbb93bb96d0d1ac139d enviado; PR811 OPEN/DRAFT confirma o mesmo head. Pre-push obrigatório passou em61s, worktree limpa. Descrição e anexo atualizados, sem PR duplicado. Este registro final acompanha o PR; próximos passos ficam na revisão humana e nas pendências já descritas, sem ampliar para merge/deploy/publicação.
