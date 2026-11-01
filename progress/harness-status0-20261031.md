# Harness status0 — continuação recuperável

Objetivo: corrigir ENOBUFS/status0 classificado PASS; exigir eval:sondafilho no CI; provar PASS limpo e falhas. GLM207/211/216 via OMP, crítico independente FINALCLEAN219; CodeRabbit dispensado por Ruben. Base pública49151a2970e1ec7cd5c31f4f232b82639804f8ae; nenhuma escrita na lane owner1167.

Aplicados runner207/CI207/SFS216. Prova REAL isolada Node22 Linux219: baseline25/25, mutante PASS→SKIP detectado SFS22, mutante ENOBUFSstatus0→PASS detectado SFS21, restauração25/25;30.37s. Fixture física Git491+Three vendored; zip/unzip apenas na imagem local de testefed51a4. Hashes restaurados. Falhas anteriores de dependências preservadas, sem mascará-las como sucesso.

Evidências HQruntime: main491-validation219-status.json; main491-harness219-native-review.txt SHA12aac2a996240512aa95730ec6a6cd6ece25e985d57a8edf52dafd61e4ec59b0; /tmp/corosolto-main491-validation219-*.log. O crítico apenas leu os artefatos. Docs/ARCH gerados sem alterações.

Branchrepair/harness-status0-20261031 reutiliza temporariamente WT próprio modo-escolta; v2/operacao-flavio preservada0a44f5b94, retorno obrigatório após publicação deste followup. Untrackedworktrees/ preservado. Nenhum commit do harness pertence ao PR1158. Próximo: gates pertinentes/build da base, checkpoint, push normal/CI e retorno Flávio. Sem merge remoto/main/deploy/QA humana.
