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
# Este script faz a Vercel buildar produção SÓ nesse commit. Preview de PR é Cloudflare.
#
# A integração Git da Vercel continua sendo o caminho de produção (RLS6, decisão do dono
# de 08/08) — ela só passa a ignorar o merge que ainda não embarcou no trem.
#
# Precisa sair AGORA (hotfix)? `gh workflow run release.yml` — embarca no trem na hora,
# com bump, SIM_HASH e aviso aos nós de MP. Não existe atalho que pule o bump: produção
# com SIM_HASH velho tiraria os jogadores do multiplayer em silêncio.
#
# PREVIEW (10/11/2026, fase 2 da saída da Vercel): preview de PR agora é Cloudflare
# (`cf-preview.yml`); Vercel builda só staging/main/lote-* e produção no trem.
# Qualquer outra branch sai aqui com 0 (pula): o comentário do PR aponta workers.dev.
set -u
if [ "${VERCEL_ENV:-}" != "production" ]; then
  REF="${VERCEL_GIT_COMMIT_REF:-}"
  case "$REF" in
    staging|main|lote-*|*/lote-*)
      echo "vercel-ignore: ${VERCEL_ENV:-?} de $REF — builda sempre"
      exit 1 ;;
  esac
  echo "vercel-ignore: preview de PR agora é Cloudflare (cf-preview.yml); Vercel só produção/trem"
  exit 0
fi
MSG="${VERCEL_GIT_COMMIT_MESSAGE:-}"
case "$MSG" in
  "chore(release):"*) echo "vercel-ignore: commit de release — builda produção"; exit 1 ;;
esac
echo "vercel-ignore: merge na main sem release — produção espera o próximo lote (release.yml)"
exit 0
