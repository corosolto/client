#!/usr/bin/env bash
# vercel-ignore.sh — o `ignoreCommand` da Vercel: decide se ESTE commit vira build.
#
# Contrato da Vercel: sair 0 = PULA o build; sair 1 = builda.
#
# POR QUE EXISTE (medido 13/10/2026, 30 dias): 130 merges geraram 126 releases e
# 256 deploys de produção (o merge E o bump). Cada release reescrevia blocos gerados,
# conflitava todo PR aberto e o autofix mergeava a base em cada um — 1.057 dos 2.163
# commits da main (49%) eram do csbrasil-bot. E produção subia SEM esperar o CI.
#
# Agora a produção sai em LOTE (14/10; no 13/10 era 2×/dia): o release.yml roda quando entra
# na main um PR de lote (label `release` ou branch lote-*, claude/lote-*, */lote-*) ou por
# workflow_dispatch, só se o pr-fast estiver verde na head da main, e só ele cria commit
# `chore(release):`.
# Este script faz a Vercel buildar produção SÓ nesse commit. Preview continua igual.
#
# A integração Git da Vercel continua sendo o caminho de produção (RLS6, decisão do dono
# de 08/08) — ela só passa a ignorar o merge que ainda não embarcou no trem.
#
# Precisa sair AGORA (hotfix)? `gh workflow run release.yml` — embarca no trem na hora,
# com bump, SIM_HASH e aviso aos nós de MP. Não existe atalho que pule o bump: produção
# com SIM_HASH velho tiraria os jogadores do multiplayer em silêncio.
#
# PREVIEW (09/11/2026, fase 0 da saída da Vercel): 159 h de build/mês vinham de preview
# de TODO push de TODA branch. Agora o preview só builda quando o intervalo desde o último
# deploy da branch (VERCEL_GIT_PREVIOUS_SHA..HEAD) toca algo que entra no site. Sem a
# variável (primeiro push da branch) ou com o SHA fora do clone raso da Vercel
# (`--depth=10`): builda, na dúvida o site sobe. Só 0 e 1 saem daqui: outro código
# (o 128 do `git diff` com SHA desconhecido) a Vercel trata como deploy FALHO.
# `staging`, `main` e `lote-*` buildam sempre (STAGING_URL e o trem dependem delas).
set -u
if [ "${VERCEL_ENV:-}" != "production" ]; then
  REF="${VERCEL_GIT_COMMIT_REF:-}"
  case "$REF" in
    staging|main|lote-*|*/lote-*)
      echo "vercel-ignore: ${VERCEL_ENV:-?} de $REF — builda sempre"
      exit 1 ;;
  esac
  PREV="${VERCEL_GIT_PREVIOUS_SHA:-}"
  if [ -z "$PREV" ]; then
    echo "vercel-ignore: ${VERCEL_ENV:-?} de $REF sem VERCEL_GIT_PREVIOUS_SHA — builda"
    exit 1
  fi
  if ! git rev-parse -q --verify "$PREV^{commit}" >/dev/null 2>&1; then
    echo "vercel-ignore: ${VERCEL_ENV:-?} de $REF — $PREV fora do clone raso, builda"
    exit 1
  fi
  if ! MUDOU="$(git diff --name-only "$PREV..HEAD" 2>/dev/null)"; then
    echo "vercel-ignore: ${VERCEL_ENV:-?} de $REF — diff indisponível, builda"
    exit 1
  fi
  # Tudo que o buildCommand/`npm run build` lê e que muda o que o site serve.
  TOCA_SITE="$(printf '%s\n' "$MUDOU" | grep -E \
    '^(src/|public/|vercel\.json$|package\.json$|package-lock\.json$|astro\.config\.mjs$|middleware\.js$|scripts/fetch-|scripts/copy-wasm\.mjs$|scripts/prune-dist\.mjs$|scripts/aeo\.mjs$|tools/gen-asset-rev\.mjs$|tools/viewmodels/prepare_precision_preview\.mjs$|tools/audio/|tools/strip-decal-bg\.mjs$|CHANGELOG\.md$)' \
    || true)"
  PRIMEIROS="$(printf '%s\n' "$MUDOU" | grep -v '^$' | head -n 5 | tr '\n' ' ')"
  if [ -n "$TOCA_SITE" ]; then
    echo "vercel-ignore: ${VERCEL_ENV:-?} de $REF — builda (site mudou: ${PRIMEIROS})"
    exit 1
  fi
  echo "vercel-ignore: ${VERCEL_ENV:-?} de $REF — pula (nada do site mudou: ${PRIMEIROS:-sem arquivos})"
  exit 0
fi
MSG="${VERCEL_GIT_COMMIT_MESSAGE:-}"
case "$MSG" in
  "chore(release):"*) echo "vercel-ignore: commit de release — builda produção"; exit 1 ;;
esac
echo "vercel-ignore: merge na main sem release — produção espera o próximo lote (release.yml)"
exit 0
