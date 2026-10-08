# Reparos de CI nos PRs abertos — 2026-10-07

## Objetivo e conclusão esperada

Eliminar falhas de instalação, dependências e build nos PRs abertos, sem enfraquecer gates de qualidade. Conclusão: dependências e builds verdes nos heads atualizados; demais checks verdes ou com causa e próximo passo registrados. Merge só depois dos gates obrigatórios de staging e revisão humana.

## Marco validado

- O CI Linux apontou `sharp@0.35.4` como vulnerabilidade high e a ausência de peers opcionais `@emnapi` no lockfile gerado em macOS.
- Atualizar o lockfile para `sharp@0.35.5` e `@img/sharp-libvips@1.3.4`, preservando os peers opcionais, passou localmente em #755, #767, #772 e #774: `npm ci`, `npm audit --omit=dev` (0 vulnerabilidades), `npm run eval:deps` e `npm run build`.
- Commits publicados para esses PRs: #755 `493d7ceca`, #767 `6f9d5e8dd`, #772 `c62ca6b1e`, #774 `22f4df521`. Cada push passou pelo hook `check:deploy` (151–187 s). Os checks remotos dessas novas heads ainda precisam terminar.
- PR #771 está com build e smoke verdes no head atual; portão ainda pendente na última consulta. #775 está verde. #777 está verde. #776 teve falha de smoke no aviso de chat, fora da área alterada; o run está sendo reexecutado para distinguir flake de regressão.

## Gates ainda abertos

- #773: `eval:select` reprova 22/63 silhuetas, acima do teto declarado de 12. O gate não foi relaxado. Requer correção/validação visual dos modelos.
- PRs com `needs-staging` / `needs-human-gameplay` continuam dependendo de validação integrada humana; checks verdes não substituem esse aceite.
- A `main` ainda contém `sharp@0.35.4`; este PR atualiza o lockfile da base para que novos PRs não herdem a falha e remove o alerta high da dependência.

## Próximo passo

Concluir os checks remotos dos quatro heads corrigidos e deste PR de dependência. Corrigir qualquer falha real restante; manter explícitos os gates de arte, staging e gameplay até que haja evidência correspondente.
