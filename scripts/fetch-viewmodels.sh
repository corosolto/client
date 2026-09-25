#!/usr/bin/env bash
# Baixa o viewmodel autorado (privado, KINEMATION) do Vercel Blob privado para
# public/private-assets/viewmodels/, conferindo SHA-256 por arquivo contra
# tools/viewmodels/vm-assets.manifest.json. VM_REQUIRED=1 reprova o build se faltar
# qualquer asset; sem credencial (fork/local) avisa e o jogo cai no legado.
# Operação: docs/reports/VM-ENTREGA-PRODUCAO.md.
set -euo pipefail
cd "$(dirname "$0")/.."
exec node scripts/fetch-viewmodels.mjs "$@"
