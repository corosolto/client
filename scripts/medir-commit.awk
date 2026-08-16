# Mede o tamanho de um commit a partir do `git diff --cached --numstat`, ignorando
# arquivo gerado. Vive fora do hook para poder ser exercitado por fixture: a versão
# anterior filtrava com `grep -Ev "\t^(...)"`, cujo `^` no meio da linha NUNCA casa —
# o filtro passou verde sem excluir nada (greptile, PR #207).
# Saída: "<arquivos> <linhas>". Binário (numstat "-") não entra na conta de linhas.
BEGIN { FS = "\t" }
$3 ~ /^(public\/docs\/|graphify-out\/|docs\/i18n\/|package-lock\.json|CHANGELOG\.md|STATUS\.md|tools\/eval\/ARCH\.md|public\/js\/version\.js)/ { next }
NF >= 3 { arquivos++; if ($1 != "-") linhas += $1 + $2 }
END { print arquivos + 0, linhas + 0 }
