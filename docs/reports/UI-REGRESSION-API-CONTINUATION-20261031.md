# Continuidade da classificação do 404 de visitante — 31/10/2026
Candidata não validada. Missão integral segue no ledger do root.


## Candidata R29 — 31/10/2026 (pendente)

**Objetivo:** classificar o 404 de `GET /api/social?action=profile&id=<convidado próprio>` como esperado para visitante sem perfil, sem mascarar 404 ruins no mesmo path.

**Base da inspeção:** commit 37d49.

**RAW-R28 REJEITADA** por inspeção — motivos: (1) `import { chromium } from 'playwright'`, declaração de `manifest` e listener `page.on('pageerror')` apagados (ReferenceError + erros JS cegos); (2) remoção de `/api/social` por Set global de paths — um esperado escondia todos os 404 do mesmo path; (3) `drainInflight` aguardava inflight sem deadline (espera eterna possível).

**Mudanças R29:**
- Restauradas literalmente as três linhas apagadas (playwright, `manifest`, `pageerror`).
- `classifyProfile404s(records, assets404, authState)` novo export puro: remoção por OCORRÊNCIA (indexOf/splice) — cada candidato válido remove exatamente 1 entrada de 404; candidato inválido não remove nada.
- `drainInflight(watch, deadline)`: race com timer limpo; deadline expirado → `watch.timedOut = true` e retorna `false`. Leitura de body com timeout ≤5 s (`withTimeout`); `isJsonResponse` por regex `/^application\/json(?:\s*;|\s*$)/i` (aceita `;charset`, rejeita `jsonp`); `content-length` malformado → fail-closed como oversized.
- `authState.pending` recalculado APÓS as identities: `timedOut?1:0 + authPending + profilePending + inflight.size`.
- Ordem: settle → screenshot 1 → styleTag → screenshot 2 → settle #2 → identities → decisão. 404/auth das duas capturas entram na decisão final.
- `unambiguous`: searchParams exclusivamente `action` e `id`, 1 cada. Rota `/u/` case-insensitive (`/^\/u\//i`). Nenhum ID/query/body/token vai para o manifest.
- selftest: assert real do `missingField` (era construído sem assert), tipos errados (`'404'`, `'true'`, `[]`), JSON de corpo ruim, e integração derivada do helper puro — provando 1 bom + 1 ruim no mesmo path mantém 1 `/api/social` em `assets404` (→ REGRESSAO), e 2 bons + 1 ruim deixa exatamente 1. Os 6 checks antigos do classify preservados.

**Estado:** candidata NOVA, PENDENTE de validação. Root fará syntax check, testes puros, captura em browser e crítico fresco. Nenhum teste executado nem aceite reivindicado nesta edição.

## R30 — correções de inspeção e focais locais

Autoria principal: GLM-5.3, OMP R28/R29. Correções nativas posteriores por Codex, explicitadas aqui: preservar o 404 de `/api/social-auth` antes do retorno de auth; corrigir a fixture de duas respostas boas mais uma ruim para realmente ter três ocorrências; exigir igualdade entre pathname do record e da entry; timeout/erro inesperado em callback fecha a exceção; drain repete snapshots até esvaziar dentro do deadline original; content-length não decimal/negativo é recusado. A decisão por ocorrência ocorre no finally **após fechar o browser e drenar os jobs pendentes**, usando identidades booleanas coletadas antes do fechamento; auth tardio, pendente, inválido ou timeout impede a exceção. Os 404 originais permanecem registrados durante captura e fechamento. Não há mudança em produto, API, classificador, limiares, dependências ou preferências de usuário.

Branch `codex/ui-regression-api-contract-20261031`, base `37d49dfc255a4fa338fb3ac957361a0230207cfc`; worktree próprio, sem alterações na QA, commit ou push. Missão completa continua em `VISUAL-RELEASE-CONTINUATION-20261031.md`: PRs elegíveis/release e consistência de mapas/UI/personagens/skins/motion; Flávio excluído; fluxos UI/redes sociais posteriores. Esta mudança corrige a instrumentação do gate, não abre a fase de fluxos sociais.

**Validado localmente:** sintaxe dos três módulos em Node22.23.4 e Node26; asserções puras extraídas do selftest real nos dois Node (positivo, tipos/ausência, auth misto/pendente/malformado, erro de corpo, remoção por ocorrência e pathname divergente); `git diff --check`. Tudo exit0. Artefatos externos: `audits/2026-10-31-visual-consistency/UI-API-FOCAL-R30.json`, `UI-API-PURE-ASSERTS-R30.mjs`; prompts/logs OMP R28/R29 e RAW-R28-REJECTED preservados.

**Pendente, sem aceite antecipado:** selftest completo com sharp/classificador no ambiente QA; execução real do capture em character/settings com Astro/API corretos; testes de evento auth/404 fora de ordem e auth404 no produtor completo; inspeção visual e crítico independente de contexto limpo. Nenhum browser ou harness gráfico foi executado por este agente. Unknown/timeout é tratado como falha, não ausência esperada. Não certifica CI, PR ou release.

Hashes dos produtos congelados R30:
- `tools/ui-regression/capture.mjs`: `7b1253f194ec62e2d664046511658e1a8e0cab2c7898b786c91b68d5a26df9de` (16505 bytes).
- `tools/ui-regression/expected-guest-profile.mjs`: `69a2e737edf6001305776d2c84b32bc52b5f3606530444545f7d9e817cb99ca6` (2891 bytes).
- `tools/ui-regression/selftest.mjs`: `43f8859a14003dcba84f5ce00e744bfd613e91dfa0cfa06b3b5742ac6348e7b3` (10408 bytes).


## R33 — microfix P1 do crítico: fallback Astro mascarava erro

Crítica P1 REAL: `parseProfileErrorJson` aceitava qualquer objeto com `error` string, então o fallback genérico do Astro para rota ausente (`{error:'not_found',path:url.pathname}`, `src/pages/api/[rota].ts` 27–30) satisfazia o predicado como se fosse o 404 legítimo do backend. Contrato verificado RO pelo root: `backend/api/social.ts` 46–51 (HEAD `0c1390f856ae1685c796ba6d2d2540b5a0bd8b15`) entrega `{error:'not_found'}` com corpo via helper `JSON.stringify` sem campos adicionais (`backend/api/_lib/social-session.ts` 29).

**Correção:** parser exige esquema EXATO — objeto JSON não-array com exatamente uma own key `error` de tipo string (`Object.keys(parsed).length !== 1` → `jsonValid:false, errorCode:''`). Retorno de `errorCode` para error string válido preservado (`isExpectedGuestProfile404` exige `not_found`). `parseGuestAuthJson`, predicado, gates e classes intocados.

**Selftest:** 35 asserts puros e 11 cases de classify preservados. Acrescentados: positivo corpo real exato; negativos fallback literal Astro no mesmo path, path de outra rota, `metadata` extra, `__proto__` extra, array/primitivo/`error` não-string; propagação parse→`guestEntry{jsonValid:false,errorCode:''}`→classify mantém `/api/social` (REGRESSÃO derivada do helper, sem hardcode de classe); integração do schema exato derivado do helper remove o 404. Outro 404 no mesmo path continua não-apagado. Parser malformado segue fail-closed.

**Estado:** R30 focal passes NÃO são aceite final (crítico R31 REJECT); resultados novos PENDENTES no root — root roda pure/syntax; full selftest, browser, fake events e crítico novo ainda não executados. Fonte de captura inalterada: capture.mjs SHA `7b1253f194ec62e2d664046511658e1a8e0cab2c7898b786c91b68d5a26df9de`; 4 sources congelados do R30 preservados em `audits/2026-10-31-visual-consistency/UI-API-FROZEN-REJECTED-R30/`. Nenhum teste executado por este agente; nenhum claim de aceite GLM. Base 37d49; apenas os 3 paths deste relatório tocados.

R33 inspeção nativa: GLM acrescentou o guard de cardinalidade e as contraprovas puras; Codex tornou explícito `Object.hasOwn(parsed,'error')` e adicionou o cenário de classificação completo `fallback Astro de rota ausente` derivado do parser/helper → `REGRESSAO/1`. O backup R30 foi renomeado para `UI-API-FROZEN-REJECTED-R30/`, preservando todos os bytes; R30 é candidata rejeitada pelo P1, não aceite final. O fluxo captura/classify/produto não foi alterado nesta rodada.


Validação nativa local R33: os 3 módulos passaram `node --check` em Node22.23.4 e Node26; as **43 asserções puras** extraídas do selftest real passaram nos dois Node, e `git diff --check` passou. Fonte capture preservada byte a byte. Evidência `UI-API-FOCAL-R33.json` e `UI-API-PURE-ASSERTS-R33.mjs` na auditoria. O selftest completo agora inclui o fallback real como caso de classificador; execução completa com sharp, produtor de eventos R33, captura real no novo hash e crítico independente continuam pendentes no root. Não se herda aceite final da candidata R30 rejeitada.


## R34 — aceite focal consolidado pelo root

Candidata R33 aceita no escopo instrumental após corrigir o P1 R31. Selftest completo em Node22.23.4 e Node26: 43 asserções puras e 12 cenários do classificador, ambos exit0. Produtor completo com Page falsa: 24/24 casos em cada Node, fontes antes/depois idênticas; isso não é prova de browser. O fallback de rota ausente conserva o 404 e produz REGRESSAO/1; um esperado mais um ruim no mesmo path preserva o ruim.

Captura canônica real no Astro52272, character/settings, concluiu exit0: ambas na tentativa1, errors[], failed:null; character.mediaReadytrue. Cada cena registrou exatamente um own_guest_profile_absent e preservou três 404 de áudio privado. Não há ID/query/body no manifest. Nenhum produto, API, limiar, dependência ou fluxo social alterado.

Crítico independente de contexto limpo CRITICO-UI-API-R34.md: CLEAN focal, zero achados acionáveis; root leu o relatório integral. Hash87c9ed3f6391a41da1d789680ddc47b376ae8e98983cf3ac925d7f25e26991d2. Evidências externas: UI-API-SELFTEST-N22/N26-R33.log, UI-API-EVENTS-R33-N22/N26.json/log, UI-API-ACTUAL-R33/manifest.json. Fontes de código mantêm hashes7b1253f194/b5d0035fa5/1bd7205d0a do congelamento R33.

Limites: timeouts de body/pending foram inspecionados e cobertos pelo predicado puro, sem alegar sua execução nos 24 eventos falsos. Capturas estáticas não aprovam navegação social futura com profileId interno. Não é aceite artístico, mobile físico, MP, wholePR, CI remoto ou release. Root assume continuidade e cópia seletiva para QA; missão integral segue ativa no ledger central.
