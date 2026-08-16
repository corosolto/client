#!/usr/bin/env bash
# Abre no GitHub as 15 good-first-issues escritas em docs/issues/.
#
# POR QUE ESTE SCRIPT EXISTE
# As 15 issues estão escritas desde julho e NUNCA foram abertas (C11 do HANDOFF,
# degrau 4 do plans/08). Enquanto elas só existem como .md, todo botão "PARA
# DEVS", todo link "tarefas boas pra começar" e toda promessa de comunidade
# apontam para uma lista vazia. Link quebrado é pior que link ausente.
#
# ELE NÃO FOI EXECUTADO. O repositório é público e é do dono — abrir issue é
# ação irreversível com o nome dele. Rode você.
#
# COMO USAR
#   cd <raiz do repo>
#   gh auth status                      # precisa estar logado
#   bash docs/issues/abrir-issues.sh --dry-run    # imprime, não abre
#   bash docs/issues/abrir-issues.sh --labels     # cria as labels antes
#   bash docs/issues/abrir-issues.sh              # abre as 15
#
# O corpo de cada issue é o próprio .md, MENOS a primeira linha (que vira o
# título). O rodapé com o link permanente para o arquivo é acrescentado pelo
# script — assim a issue e o arquivo não divergem: o arquivo continua sendo a
# fonte, e a issue aponta para ele.
#
# IDEMPOTÊNCIA: o script procura issue aberta com o MESMO título antes de criar.
# Rodar duas vezes não duplica.

set -euo pipefail

REPO="rubenmarcus/csbrasil"
BRANCH="main"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --labels)
      # cores: verde = entrada, azul = área, cinza = esforço
      gh label create "good first issue" --repo "$REPO" --color 7057ff --description "Boa para a primeira contribuição" --force
      gh label create "seo"              --repo "$REPO" --color 0e8a16 --description "Busca, JSON-LD, sitemap, AEO"        --force
      gh label create "ui"               --repo "$REPO" --color 1d76db --description "Front-end e interface do site"       --force
      gh label create "backend"          --repo "$REPO" --color 5319e7 --description "Rotas /api, Supabase, banco"         --force
      gh label create "seguranca"        --repo "$REPO" --color d93f0b --description "Segurança, CSP, supply chain"        --force
      gh label create "acessibilidade"   --repo "$REPO" --color fbca04 --description "A11y: foco, contraste, leitor"       --force
      gh label create "ci"               --repo "$REPO" --color c2e0c6 --description "Integração contínua e portão"        --force
      gh label create "limpeza"          --repo "$REPO" --color ededed --description "Código morto, dívida, organização"   --force
      echo "labels prontas."
      exit 0
      ;;
    *) echo "argumento desconhecido: $arg" >&2; exit 2 ;;
  esac
done

# arquivo -> labels. `case` e não array associativo de propósito: o bash que vem
# no macOS é o 3.2, de 2007, e `declare -A` só existe do 4.0 em diante — o script
# morria com "unbound variable" na máquina do dono. Isto roda em qualquer bash.
labels_de() {
  case "$1" in
    01-*) echo "good first issue,seo" ;;
    02-*) echo "good first issue,seo,backend" ;;
    03-*) echo "good first issue,seo,ui" ;;
    04-*) echo "good first issue,seo,ui" ;;
    05-*) echo "good first issue,ui" ;;
    06-*) echo "good first issue,acessibilidade,ui" ;;
    07-*) echo "good first issue,ui,seo" ;;
    08-*) echo "good first issue,seguranca,ui" ;;
    09-*) echo "good first issue,backend" ;;
    10-*) echo "good first issue,seguranca,backend" ;;
    11-*) echo "good first issue,limpeza,seguranca" ;;
    12-*) echo "good first issue,seguranca,ci" ;;
    13-*) echo "good first issue,limpeza" ;;
    14-*) echo "good first issue,ui,seo" ;;
    15-*) echo "good first issue,ci" ;;
    *)    echo "good first issue" ;;
  esac
}

for f in "$DIR"/[0-9][0-9]-*.md; do
  slug="$(basename "$f" .md)"
  titulo="$(head -1 "$f" | sed 's/^#\{1,\} *//')"
  labels="$(labels_de "$slug")"
  url="https://github.com/$REPO/blob/$BRANCH/docs/issues/$(basename "$f")"
  corpo="$(tail -n +2 "$f")
$(printf '\n---\n\nFonte desta issue: [`docs/issues/%s`](%s). Se o texto e o arquivo divergirem, o arquivo está certo.' "$(basename "$f")" "$url")"

  if [ "$DRY" = 1 ]; then
    printf '\n\033[1m%s\033[0m\n  labels: %s\n  corpo: %s linhas\n' "$titulo" "$labels" "$(printf '%s' "$corpo" | wc -l | tr -d ' ')"
    continue
  fi

  if gh issue list --repo "$REPO" --state all --search "\"$titulo\" in:title" --json title \
     | grep -Fq "\"$titulo\""; then
    echo "já existe, pulando: $titulo"
    continue
  fi

  gh issue create --repo "$REPO" --title "$titulo" --label "$labels" --body "$corpo"
done
