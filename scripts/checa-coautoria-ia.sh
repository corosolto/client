#!/bin/sh
# `Co-Authored-By:` de agente de IA não entra: quem escreveu já está no `Agent:`.
#
# POR QUE ELA EXISTE
# O trailer `Agent:` (CONTRIBUTING.md, "Quem escreveu o commit") é a atribuição
# desta base e distingue Claude Code, Codex, Kimi Code, Cursor e humano. O
# `Co-Authored-By: Claude` que as ferramentas acrescentam sozinhas não distingue
# agente nenhum e aparece SEMPRE junto do `Agent:` — 415 dos 1004 commits da main
# (medido em 23/08/26, e563315c) carregam o par redundante. Pior: ele inventa um
# co-autor que não tem conta, então o "Contributors" do GitHub mistura pessoa com
# ferramenta.
#
# POR QUE UM SCRIPT, E NÃO UM grep EM CADA LUGAR
# Três portões medem esta mesma coisa — .githooks/commit-msg, .githooks/pre-push e
# scripts/ci/agente_check.py. Lista de agentes copiada em três arquivos diverge, e
# aí a mesma mensagem nasce aprovada num portão e reprovada no outro (foi o que
# aconteceu com os limiares do grafite: 688 -> 272 só de alinhá-los). A lista mora
# em scripts/coautoria-ia.re e os três leem DE LÁ.
#
# USO
#   checa-coautoria-ia.sh [arquivo]     0 = limpo, 1 = achou, 2 = não sei medir
#   checa-coautoria-ia.sh --limpa [arq] copia para o stdout sem as linhas ofensoras
set -u

AQUI=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PADRAO="$AQUI/coautoria-ia.re"

# Não saber medir custa o mesmo que estar errado: padrão sumido ou vazio faz o
# `grep -f` casar com TUDO (linha em branco é padrão universal) ou com nada. Os
# dois silenciosos, os dois mentindo. Aqui isso é vermelho, não verde.
if [ ! -s "$PADRAO" ]; then
  echo "checa-coautoria-ia: $PADRAO sumiu ou está vazio — sem ele o portão não mede nada." >&2
  exit 2
fi
if [ "$(grep -c . "$PADRAO")" != "$(wc -l < "$PADRAO" | tr -d ' ')" ]; then
  echo "checa-coautoria-ia: $PADRAO tem linha em branco — ela casaria com todo commit." >&2
  exit 2
fi

if [ "${1:-}" = "--limpa" ]; then
  shift
  grep -viE -f "$PADRAO" -- "${1:--}" || true
  exit 0
fi

achados=$(grep -inE -f "$PADRAO" -- "${1:--}" || true)
[ -z "$achados" ] && exit 0

echo "$achados" >&2
exit 1
