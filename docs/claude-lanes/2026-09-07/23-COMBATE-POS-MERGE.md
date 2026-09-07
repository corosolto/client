# GLM 5.3 — verificar combate após o merge #536

O PR #536 já foi mesclado. Não reimplemente headshot, contador de abates ou bots na rodada de
faca. Crie worktree `combate-pos536` e branch `glm/combate-pos536` sobre `main` somente se houver
defeito reproduzível.

Valide que o efeito de câmera ao headshot saiu, o contador conta eventos corretos sem duplicar
respawn/round e bots usam faca na rodada apropriada. Rode os mutantes existentes e uma partida
local longa. Se tudo passar, entregue relatório sem alteração. Se falhar, escreva nova régua,
prove o mutante, corrija, rode gates/build, commit, push e PR novo. Não misture penetração AWP.

