# Migração integral das frentes para Claude e GLM — 07/09/2026

Este diretório substitui, para retomadas novas, os prompts antigos em
`docs/claude-lanes/`. O retrato foi conferido contra 52 worktrees e 18 PRs abertos.
Não execute um prompt antigo quando houver um arquivo correspondente aqui.

Evidência congelada desta migração: [`INVENTARIO-PRS.md`](INVENTARIO-PRS.md),
[`INVENTARIO-WORKTREES.md`](INVENTARIO-WORKTREES.md) e
[`AUDITORIA-PROMPTS.md`](AUDITORIA-PROMPTS.md). Estados de GitHub continuam voláteis;
confirme-os de novo antes de integrar.

## Ordem para gastar menos e preservar qualidade

### Onda 1 — executar agora

| Modelo | Prompt | Worktree | PR |
| --- | --- | --- | --- |
| GLM 5.3 no ZCode | `01-VIEWMODEL-M4.md` | `vm-prep-rifles` | #509; lê #534 |
| Claude Opus 5 | `12-MITICOS.md` | `miticos-integracao-priority` | #532; reconcilia #528 |
| Claude Opus 5 | `13-MAPAS-POLISH-INTEGRAL.md` | `mapas-polish-integral` | recuperação #437/#440/#441; revisa #538 |
| GLM 5.3 no ZCode | `14-AUDIO-ROLLBACK.md` | `claude-audio-rollback` | #531 |

Essas quatro árvores têm estado local ou uma decisão imediata. Antes de qualquer edição,
o agente deve preservar o `git status` e criar um checkpoint recuperável. A lane de áudio
não escolhe v7/v8 sozinha: prepara a comparação e para na decisão auditiva do dono.

### Onda 2 — revisão e conflitos dos PRs já implementados

- `15-MAPAS-PRS-ABERTOS.md`: Sertão #526, Escadão #529, Quebrada/Campinho #530,
  Mansão do Joá #533, Córrego #467 e Lajes #539.
- `16-MOBILE.md`: PR #496.
- `17-AUDIO-MITICOS.md`: PR #486.
- `18-VIEWMODELS-HISTORICOS.md`: PRs #464, #468 e #534; extração seletiva, nunca merge cego.

### Onda 3 — catálogo de viewmodels

Viewmodels formam um sistema interligado. Continue uma família por vez e deixe a integração
final para `11-VIEWMODEL-INTEGRACAO.md`. Produção de asset pode ocorrer em worktrees distintas,
mas nenhum agente deve editar em paralelo `game.js`, mãos, ADS ou HUD compartilhados.

| Ordem | Prompt | Armas |
| ---: | --- | --- |
| 1 | `01-VIEWMODEL-M4.md` | M4 |
| 2 | `02-VIEWMODEL-PRECISAO.md` | Mosin, SVD, SKS |
| 3 | `03-VIEWMODEL-AWP.md` | AWP |
| 4 | `04-VIEWMODEL-SHOTGUN.md` | shotgun |
| 5 | `05-VIEWMODEL-CURTAS.md` | Deagle, revólver .38 |
| 6 | `06-VIEWMODEL-RIFLES.md` | M92, G3, AKM, MD97, carbine, M400, SCAR, Tavor, FAMAS |
| 7 | `07-VIEWMODEL-SMGS.md` | MP5, Uzi, P90 |
| 8 | `08-VIEWMODEL-DMR.md` | Remington 700, G3SG1 |
| 9 | `09-VIEWMODEL-LMG.md` | LMG |
| 10 | `10-VIEWMODEL-CONTROLES.md` | AK, pistola e faca; auditoria e correções finais |
| 11 | `11-VIEWMODEL-INTEGRACAO.md` | integração e aceite das 26 armas |

As 26 armas do `WEAPON_IDS` estão cobertas exatamente uma vez pela tabela. Toda arma final
inclui modelo próprio, braços/mãos, idle, equip, tiro, recargas, inspeção quando aplicável,
mecanismo próprio, contato, ADS, enquadramento 3:2 e 16:9, integração local, testes, mutantes,
GLB otimizado, evidência visual, commit, push e PR. “Candidato offline” não é entrega.

## Frentes novas ou sem PR

- `19-AMAZONIA-NOVA-RODADA.md`: regressão 8x8/escadas/visão do rio após o merge #527.
- `20-PRACA-PODERES.md`: diff local em `praca-poderes-claude`, ainda sem PR.
- `21-OPERACAO-TELEMETRIA.md`: `prod-watch`, contagem de jogadores e frescor do admin.
- `22-AUDIO-RUNTIME.md`: áudio que some e remoção de fallback sintético, sem misturar rollback.
- `23-COMBATE-POS-MERGE.md`: somente verificação do merge #536 e observação humana.
- `24-MULTIPLAYER.md`: consolidar as branches de multiplayer e provar clientes reais.
- `25-ADMIN-RETENTION.md`: verdade e retenção do painel com dados autenticados.
- `26-AUDIO-FAB-PILOT.md`: decidir o destino do piloto de áudio após escuta A/B.
- `27-VIEWMODEL-PISTOLA-FABLE.md`: auditar o candidato histórico antes dos controles finais.
- `28-RELEASE-PACOTE-1.md`: preparar, sem publicar, Time Míticos + mapas + viewmodels.

## Estado dos 18 PRs abertos

| PR | Estado observado | Prompt atual |
| ---: | --- | --- |
| #539 | conflitante | `15-MAPAS-PRS-ABERTOS.md` |
| #538 | draft limpo; inventário concluído | `13-MAPAS-POLISH-INTEGRAL.md` |
| #537 | draft limpo; este pacote | este índice |
| #534 | mergeável/bloqueado; evidência M4 | `01-VIEWMODEL-M4.md`, depois `18-VIEWMODELS-HISTORICOS.md` |
| #533 | conflitante | `15-MAPAS-PRS-ABERTOS.md` |
| #532 | conflitante e worktree com diff local | `12-MITICOS.md` |
| #531 | mergeável/bloqueado; branch local à frente | `14-AUDIO-ROLLBACK.md` |
| #530 | conflitante | `15-MAPAS-PRS-ABERTOS.md` |
| #529 | conflitante | `15-MAPAS-PRS-ABERTOS.md` |
| #528 | mergeável/bloqueado; documentação anterior | `12-MITICOS.md` |
| #526 | conflitante | `15-MAPAS-PRS-ABERTOS.md` |
| #513 | instável; base intermediária | `02-VIEWMODEL-PRECISAO.md` |
| #509 | instável; M4 em produção | `01-VIEWMODEL-M4.md` |
| #496 | conflitante | `16-MOBILE.md` |
| #486 | mergeável/bloqueado | `17-AUDIO-MITICOS.md` |
| #468 | conflitante e enorme | `18-VIEWMODELS-HISTORICOS.md` |
| #467 | mergeável/bloqueado | `15-MAPAS-PRS-ABERTOS.md` |
| #464 | instável, base antiga e grande | `18-VIEWMODELS-HISTORICOS.md` |

## Contrato comum para todo prompt

1. Leia `AGENTS.md`, `STATUS.md`, `HANDOFF.md` e os relatórios citados na própria lane.
2. Confirme caminho, branch, HEAD, upstream e `git status`. Nunca limpe, restaure ou
   sobrescreva diff existente; arquivos não rastreados também são trabalho.
3. Crie/atualize um ledger na própria branch com objetivo, pronto, checkpoints, rejeições,
   artefatos, bloqueios e próximo passo.
4. Escreva a régua antes do conserto, prove o mutante vermelho e rode o estado normal depois.
5. Para mudança visível, gere imagem/contact sheet e inspecione. Gate verde não substitui
   revisão visual do dono. Não invente aprovação humana.
6. Não altere outra worktree, segredos, material compartilhado de outra frente ou histórico.
7. Faça commit pequeno com trailer `Agent:`, push e abra/atualize apenas o PR da lane.
   Não faça merge, release ou deploy sem ordem explícita.
8. Relate arquivos, comandos, testes, evidência, limitações e próximo passo. Se precisar de
   decisão humana, deixe todo o restante pronto primeiro.

## Prompts individuais de cada mapa

A branch `codex/mapas-polish-integral`, checkpoint `506b82c7`, contém prompts próprios para
18 mapas em `docs/maps/prompts/`: Campinho, Parque, Penitenciária, Mansão do Joá, Posto, UPA,
Obras da Prefeitura, Atacadão, Sertão, Quebrada, Escadão, Lajes, Córrego, Amazônia, Praça dos
Três Poderes, Piscina, Loja H e Ferro Velho. Use esses arquivos quando abrir um chat por mapa;
use `13-MAPAS-POLISH-INTEGRAL.md` para o integrador que mantém o padrão e a matriz comum.
