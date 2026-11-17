#!/usr/bin/env bash
# vercel-ignore.sh — o `ignoreCommand` da integração Git da Vercel: decide se ESTE commit vira build.
#
# FASE 6 da migração Vercel → Cloudflare Workers (docs/runbooks/MIGRACAO-CLOUDFLARE.md):
# a produção é o Worker `csb-prod` (`cf-prod-deploy.yml`, por push protegido) e o preview
# de PR é o `cf-preview.yml`. A Vercel não builda mais NADA; a integração Git continua
# conectada só para manter o último deploy congelado como origem de rollback dos 30 dias.
#
# Contrato da Vercel: sair 0 = PULA o build; sair 1 = builda. Este script sai SEMPRE 0.
#
# HISTÓRICO (por que o arquivo existe): 13/10–13/11, 130 merges geraram 126 releases e
# 256 deploys de produção; o filtro por branch/lote cortou o ruído enquanto a Vercel era
# produção. O deploy real hoje é do Workers; quando o dono desconectar a integração Git
# e apagar o projeto no painel (fim dos 30 dias), este script e a régua
# `eval:vercelignore` saem juntos.
#
# PRECISA SAIR AGORA (hotfix)? O caminho é o mesmo do trem sem a Vercel:
# `gh workflow run release.yml` cria o commit de release e o `cf-prod-deploy.yml`
# publica no Workers — a Vercel não participa.
set -eu
echo "vercel-ignore: fase 6 — deploy é o Workers (csb-prod); nenhum commit builda na Vercel"
exit 0
