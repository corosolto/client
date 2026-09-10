# Censo das worktrees de viewmodel — 10/09/2026

## Decisão

Foram encontradas dezoito worktrees/checkouts anteriores à lane final. Nenhuma será removida,
resetada, mergeada ou rebased durante a recuperação. Há código e evidência útil, mas todas as
linhas antigas divergiram centenas de commits de `origin/main@2115d5e2c`; o catálogo será
reconstruído por extração seletiva na lane `codex/viewmodels-catalog-final`.

O inventário foi somente leitura. Metadados de assets ignorados foram contados, sem copiar o
conteúdo privado para Git ou documentação.

## Risco de perda antes da integração

| Prioridade | Worktree | Estado que precisa ser preservado |
|---|---|---|
| P0 | `vm-lmg-final` | 2 commits locais à frente, 2 arquivos modificados, 3 checks não rastreados e candidatos ignorados; LMG continua reprovada |
| P0 | `vm-retarget` | 12 commits locais ainda ausentes do upstream, com gauntlet, unidade, recarga e enquadramento |
| P0 | `vm-m4-reload-evidence` | 1 commit local divergente, 3 scripts locais e cerca de 130 MB de evidência ignorada |
| P1 | `vm-dmr-final` | 7 arquivos gerados modificados; GLBs atuais não batem com os hashes do relatório |
| P1 | `viewmodel-blender` | fontes Blender/CC0, backups e manifesto 26/26 em uma árvore dirty |
| P1 | checkout `client`/#464 | cerca de 2,3 GB de artifacts ignorados e catálogo privado externo; sem diff local de VM |
| P1 | `vm-prep-precisao` | cerca de 241 MB de produção offline não versionada, com hashes conferidos |
| P1 | `vm-prep-rifles` | cerca de 254 MB de produção/diagnóstico e candidata M4 não aprovada |

Nenhuma ação de preservação foi executada neste censo. Antes de limpar worktrees, cada item P0/P1
precisa de checkpoint Git quando for fonte, ou manifesto/hash externo quando for asset privado.

## Matriz completa

| Worktree/branch | Git e cobertura | Veredito | Uso na lane final |
|---|---|---|---|
| `client` · `feat/fps-paid-viewmodels-aaa` · #464 | dirty fora de VM; pipeline completo e 2,3 GB ignored | todas as famílias `ready:false`, exceto granada | portar arquitetura, rollout/fallback, instrumentos e fixes transversais; nunca a branch inteira |
| `viewmodel-blender` · `codex/viewmodel-blender` | dirty; rig-base, fontes CC0, manifesto 26/26 | tudo ainda `authoring`; mão low-poly sem aceite | biblioteca de fonte, proveniência e contrato |
| `vm-auto` · `codex/vm-auto` | clean; quatro tentativas M4 | quatro rejeições | diagnóstico/topologia e testes; nenhum GLB |
| `vm-heavy` · `codex/vm-heavy` | clean; AWP e shotgun | AWP candidata sem aceite; shotgun rejeitada | portar builder/harness da AWP; reautorar shotgun usando a falha como régua |
| `vm-melee` · `codex/vm-melee` | clean; faca antiga | tecnicamente verde; aprovação veio em linhagem posterior | gates/evidência, sem duplicar o asset |
| `vm-retarget` · `vm-cs16-gabarito` · #468 | clean, 12 commits locais; gauntlet de 19 armas | AK aprovada; GoldSrc sem dedos; retarget high-res bloqueado | preservar commits; portar instrumentos/matemática e AK aprovada |
| `vm-fable51-pistol` · `claude/vm-fable51-pistol` | clean; ancestral do stack | corrige socket; candidata yaw20 não era golden | fundamento causal; resultado final vem da linhagem Astra |
| `vm-astra-pistol` · `codex/vm-astra-pistol` | clean; pistola, faca, mãos/skins/ataques | pistola yaw15 e faca fechadas localmente | fundação aprovada, portada por símbolos |
| `vm-controles-final` · `glm/vm-controles-final` · #549 | clean/pushed; gates e veredito | AK, pistola e faca aprovadas; faltam alguns enquadramentos/ADS reais | congelar controles e portar gates; não contém runtime novo |
| `vm-dmr-final` · `claude/vm-dmr-final` · #544 | dirty gerado; Rem700/G3SG1 | `ready:true` na branch, sem aceite; evidência stale por hash | reconstruir/rehash/recapturar no main antes de considerar saída |
| `vm-lmg-final` · `glm/vm-lmg-final` · #546 | 2 commits + 5 arquivos locais | `ready:false`, mão de apoio ilegível, candidata rejeitada | preservar diagnóstico/checks e refazer a LMG |
| `vm-prep-precisao` · `codex/vm-prep-precisao` · #513 | clean/pushed; Mosin/SVD/SKS offline | T/M/C/F/A verdes e hashes coerentes; runtime `ready:false`; SVD já apresentou desaparecimento | otimizar, revalidar e integrar as três; corrigir SVD antes do aceite |
| `vm-integracao-precisao` · `codex/vm-integracao-precisao` | alpha.243, ledger untracked, sem código | integração não começou | superseded funcionalmente pela lane final; preservar o ledger como fonte |
| `vm-prep-rifles` · `codex/vm-prep-rifles` · #509 | clean/pushed; seis rifles | M4 idle aprovada; recarga ainda reprovada; cinco só receitas | usar idle M4 e receitas; terminar recarga e produzir os cinco |
| `vm-m4-reload-evidence` · `codex/vm-m4-reload-evidence` | divergente e dirty | diagnóstico anterior, sem aceite | evidência comparativa, sem promover candidato |
| `vm-prep-armas-curtas` | placeholder no `d35c6658`, sem upstream | Deagle/.38 não iniciadas | nenhuma produção existente |
| `vm-prep-awp` | placeholder no `d35c6658`, sem upstream | AWP não iniciada nesta lane | usar `vm-heavy` como ponto de partida |
| `vm-prep-shotgun` | placeholder no `d35c6658`, sem upstream | shotgun não iniciada nesta lane | reautoria necessária |

## DAG real do stack mais recente

```text
Fable pistol
  └─ Astra pistol/faca/mãos
       ├─ controles (#549)
       ├─ DMR (#544)
       └─ LMG (#546)
```

Fable e Astra não possuem upstream nominal, mas seus commits estão alcançáveis pelos três filhos
remotos. O risco imediato da LMG está nos dois commits e cinco arquivos exclusivamente locais,
além dos artifacts ignorados.

## Cobertura real para as 26 armas

- **aprovadas:** AK, PT-38 e faca;
- **parcialmente aprovada:** M4 em idle/composição; recarga incompleta;
- **candidatas com trabalho reaproveitável:** AWP, Rem700 e G3SG1, todas sem aceite final;
- **produção offline forte:** Mosin, SVD e SKS; falta otimização, integração e revisão real;
- **reprovadas:** LMG e shotgun; tentativas antigas da M4;
- **somente receita/diagnóstico:** MD97, carabina, SCAR, FAMAS e M92;
- **sem produção final localizada:** Deagle, revólver .38, MP5, Uzi, P90, AKM, G3, Tavor e M400.

O pipeline histórico cobre o catálogo como infraestrutura, mas não existe entrega final arma por
arma. Isso confirma que a lane deve preservar as 26 e produzir as lacunas; reduzir para as 20 do
stack antigo não é aceitável.

## Sequência revisada

1. preservar os estados locais P0 sem transformar rejeição em `ready:true`;
2. congelar a lista das 26 e criar a matriz de identidade/mãos/ações/contatos/ADS/HUD;
3. portar por símbolos a fundação Fable → Astra → controles sobre alpha.246;
4. portar instrumentos e fixes matemáticos de #464/#468/#549;
5. recapturar os três controles no jogo atual e obter aceite 16:9/3:2;
6. integrar AWP e precisão, depois DMR reconstruída;
7. finalizar M4 e produzir os demais fuzis/SMGs/curtas;
8. reautorar shotgun e LMG;
9. zerar dívidas VM, provar fallback das 26 e ativar o catálogo inteiro numa única flag;
10. abrir para release somente depois da revisão humana integral.

## Estado da lane final

- branch: `codex/viewmodels-catalog-final`;
- draft: client#572;
- base: alpha.246;
- checkpoints: `41113d742`, `f4e85df57`;
- gate inicial: `npm run check:deploy` 39/39 com Node 23;
- runtime ainda não alterado enquanto o censo era executado.
