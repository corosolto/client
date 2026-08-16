#!/usr/bin/env bash
# vercel-secrets.sh — cadastra VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID
# nos segredos do GitHub Actions, que é o que falta pro deploy-prod.yml sair do
# papel (o cabeçalho do workflow documenta o erro "missing token value").
#
# Uso:
#   bash scripts/vercel-secrets.sh
# Ele pede o token na hora (digitação invisível). Crie em:
#   https://vercel.com/account/tokens
#
# Nada do token vai pra arquivo nem pro git: fica só em variável de ambiente
# do processo e nos segredos do GitHub.
set -euo pipefail

echo "== 1/4 · pré-requisitos"
command -v gh >/dev/null || { echo "FALHOU: gh não instalado"; exit 1; }
command -v curl >/dev/null || { echo "FALHOU: curl não instalado"; exit 1; }
command -v node >/dev/null || { echo "FALHOU: node não instalado"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "FALHOU: rode 'gh auth login' antes"; exit 1; }
echo "   ok"

echo "== 2/4 · token"
if [ -z "${VERCEL_TOKEN:-}" ]; then
  printf "   cole o token da Vercel (invisível) e dê Enter: "
  read -rs VERCEL_TOKEN
  echo
fi
[ -n "$VERCEL_TOKEN" ] || { echo "FALHOU: token vazio"; exit 1; }

echo "== 3/4 · descobrir ORG_ID e PROJECT_ID pela API"
PROJECTS_JSON=$(curl -sf -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects?limit=100") || {
  echo "FALHOU: token recusado pela API (revogado ou sem escopo?)"; exit 1; }
# Lê nome do repo remoto como candidato a nome do projeto (csbrasil).
REPO_NAME=$(basename -s .git "$(git config --get remote.origin.url)")
LINE=$(echo "$PROJECTS_JSON" | node -e '
  const j = JSON.parse(require("fs").readFileSync(0, "utf8"));
  const want = process.argv[1];
  const p = j.projects.find(p => p.name === want) || j.projects[0];
  if (!p) { console.error("nenhum projeto visível com esse token"); process.exit(1); }
  console.log(JSON.stringify({ name: p.name, id: p.id, org: p.accountId }));
' "$REPO_NAME")
PROJECT_NAME=$(echo "$LINE" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).name')
VERCEL_PROJECT_ID=$(echo "$LINE" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).id')
VERCEL_ORG_ID=$(echo "$LINE" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).org')
echo "   projeto=$PROJECT_NAME  project_id=$VERCEL_PROJECT_ID  org_id=$VERCEL_ORG_ID"

echo "== 4/4 · gravar os 3 segredos no GitHub"
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID"
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID"
gh secret list
echo
echo "PRONTO. Próximo passo (fora deste script): religar o caminho por release"
echo "é pôr main:false de volta no vercel.json — ver cabeçalho de deploy-prod.yml."
