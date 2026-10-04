# Gauntlet MP: integração de qualidade e identidade — 04/10/2026

## Objetivo e aceite

Verificar a combinação do candidato de qualidade MP [#755](https://github.com/corosolto/client/pull/755) com a identidade do personagem [#774](https://github.com/corosolto/client/pull/774) antes de formar um release coordenado. A definição de pronto do gauntlet continua sendo experiência verificada por duas pessoas em dispositivos reais, cliente e backend com SHAs correspondentes, e pelo menos 90% de sessões boas/ótimas em sete dias comparáveis.

## Estado e decisões

- Checkout isolado `client/worktrees/mp-combined-identity-check-20261004`; branch `codex/mp-combined-identity-check-20261004` sobre `origin/codex/mp-quality-rootcause-20261004@0bf7c12fe`.
- Cherry-pick de #774: `44a7327ea` (código) e `9d85d46cd` (ledger). Conflitos de contagem em documentação foram resolvidos por regeneração; a régua preserva a entrada pelo hub de #755 e acrescenta as provas de identidade. Nenhuma edição foi feita no checkout ocupado de #755.
- Hash de simulação combinado: `5d207dfd3f940c4e`, igual ao candidato #755. A imagem backend existente foi construída com o SHA `0bf7c12fe`; se esta integração for escolhida para release, ela precisa ser reconstruída com o SHA exato desta branch. A imagem existente não cobre este commit.

## Evidência validada

- `npm run docs:check`, `npm run arch:check`, `npm run build`, verificação de sintaxe da régua e `git diff --check`: aprovados em Node 23.6.0.
- Backend da lane pareada executado em cópia isolada `/tmp/mp-combined-backend-20261004`, com JS do cliente combinado. Saúde local relatou `simHash=5d207dfd3f940c4e` e protocolo 5.
- Navegador local e sala Escadão: 844×390, 18/18; 1536×1024 (3:2), 17/17. Entrada, pausa, retrato, espectador, volta ao time e tiros autoritativos passaram. Logs: `/tmp/mp-combined-identity-mobile-20261004.log` e `/tmp/mp-combined-identity-3x2-20261004.log`. Capturas com prefixos equivalentes `-identidade-entrada.png` e `-identidade-pausa.png`.
- Observação de FPS do Chrome automatizado, especialmente 24 FPS em 3:2, não representa qualidade em dispositivos humanos. Não houve segunda pessoa neste ensaio.

## Próximo passo

Publicar esta integração como PR empilhado para revisão e CI; revalidar rotação de mapa e troca de slot com dois jogadores reais. Só depois decidir a promoção e reconstruir backend com o SHA integrado. Medir coorte de sete dias após release coordenado; a meta de 90% ainda não está demonstrada.
