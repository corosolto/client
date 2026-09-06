# Míticos/Lendas — revisão visual e entrega

Atualizado em 2026-09-06.

## Objetivo e conclusão
Revisar visualmente o time Mítico com Ruben, corrigir personagens deformados, validar seleção e jogo e entregar a versão aprovada hoje. Conclusão exige imagens revisadas, validação técnica, revisão adversarial, integração compatível com main e publicação verificada.

## Estado recuperável
- Worktree: `/Users/ruben/csbrasil/worktrees/miticos-visual`.
- Branch: `codex/miticos-visual`, criada do PR #481 (`origin/merge/399`, `3abed0888385be1d3bea3fb885ad03e08bb04c96`).
- Origem: PR #399; #481 integra uma main antiga e está CONFLICTING na consulta de 06/09.
- O pacote inclui mapas e sistemas além do time; corte de integração ainda por determinar.
- BUG-86 é o diagnóstico vigente; BUG-40/41 contêm estado antigo (Bandeirante agora tem rig).
- Lobisomem preto forte já foi aprovado pelo dono no histórico do BUG-40; a descrição antiga de lobo-guará no plano foi revogada.

## Milestones
- Localizados PRs e histórico; worktree isolada criada sem alterar outras frentes.
- Nenhum modelo alterado, nenhum novo resultado visual aprovado, nenhum push/merge/deploy nesta sessão.

## Próximo passo
Revisar os nove Míticos com Ruben na bancada e corrigir os pesos/rig dos seis reprovados. Capturas do menu real e da bancada concluídas em `artifacts/miticos-review/`.

## Baseline validado em 06/09
`eval:mitico` passou 9/9 GLB, rig e PBR. `select-inflate` reproduziu exatamente BUG-86: Saci 607,1; Cuca 309,5; Lampião 121,5; Maria 47,5; Zumbi 36,3; Curupira 32,1 arestas ruins/10 mil, contra teto 23,6. O exit 0 é dívida tolerada, NÃO aprovação dos seis. JSON/log e lineup: `artifacts/miticos-review/`.

A revisão adversarial de contexto limpo preserva direção de arte dos sete demais e reprova Cuca/Boto. Aprovação de arte NÃO aprova animação; Saci tem rasgos visíveis no rosto/pescoço. Perguntas ao dono pendentes sobre direção do Boto e visuais a preservar.

A captura do menu herdada falhava porque tentava clicar CTF antes de expandir JOGAR; corrigida. `select-inflate` omitia `preview:true` usado por `pvSetChar`; corrigido. Baseline acima mede porte funcional. O porte real da seleção reprova os mesmos seis: Saci 600,8; Cuca 309,5; Lampião 126; Maria 56; Zumbi 39,2; Curupira 33,3 contra teto 26,1. Blender audit foi executado em Saci/Cuca; imagens da bind saíram cortadas, não servem como aprovação.

## Tentativas e bancada (06/09)
- Duas variantes locais de pesos da cabeça testadas em Saci/Cuca. V1: Saci 607,1→248,6 ruins/10 mil; Cuca 309,5→312,2. V2: Saci 230,6; Cuca 421,5. Ambas REPROVADAS; GLBs restaurados exatamente do commit base. Scripts, GLBs e JSONs preservados somente em `artifacts/miticos-review/`.
- A bind vista no runtime confirma duas pernas na malha do Saci, uma dobrada; isso precisa entrar na revisão de identidade/animação, pois a ficha pede uma perna.
- Nova bancada local `tools/eval/miticos-review.html`, servida por `node tools/eval/serve.mjs 8191`: seleção, bind, andar, correr, agachar, arma, câmera orbital e pausa. Primeira captura válida: `artifacts/miticos-review/saci-bind-viewer.png`.
- Astro real em 8192. Captura inicial em `menu-candidate/` mostrou vídeos antigos, pois SwiftShader ativa modo leve; não mede os GLBs candidatos. Novas capturas usam `EXTRA=assetcheck=1` em `menu-glb/`; fallback de vídeo terá que ser regerado junto dos modelos na entrega.
- `select-inflate` com `preview:true` continua reprovando os mesmos seis; JSON isolado em `selection-baseline.json`. Baseline versionado antigo preservado até fechar validação.
- Nenhum asset novo aceito e nenhum push, merge ou deploy.

## Verificação final da bancada
- Captura do menu real concluída para 9/9, com `EXTRA=assetcheck=1`, em `artifacts/miticos-review/menu-glb/`. As imagens `menu-candidate/` são do fallback de vídeo e não validam os modelos.
- Browser percorreu 9 personagens × 5 poses (45 estados), além de troca rápida durante carga inicial, arma, câmeras e pausa. Zero `pageerror`; evidência `artifacts/miticos-review/bench/verification.json` e imagens no mesmo diretório. Isto verifica a ferramenta, não aprova visualmente os personagens.
- Revisão adversarial estática identificou dois problemas da bancada: estado pronto obsoleto e preload concorrente de clipes. Ambos corrigidos (estado invalidado a cada troca e promessa inicial compartilhada); troca rápida exercitada no browser.
- `eval:mitico`: 9/9 GLB, rig e PBR, 4/4 contratos. Sintaxe dos três scripts alterados e `git diff --check` passaram. Não houve validação de release, CI ou partida nesta etapa.
- A Cuca está íntegra na bind do runtime e rasga cabeça/ombros ao animar. Saci rasga rosto/perna e tem duas pernas modeladas. Capturas de repouso e seleção estão em `bench/`.
- Servidores locais mantidos: bancada `http://localhost:8191/miticos-review.html`, jogo Astro `http://localhost:8192/`. Reiniciar com `PATH=/opt/homebrew/bin:$PATH node tools/eval/serve.mjs 8191` e `PATH=/opt/homebrew/bin:$PATH node scripts/dev.mjs --host 127.0.0.1 --port 8192` nesta worktree.
- Script experimental de reparo foi movido para `artifacts/miticos-review/`; ajustar seu import relativo antes de reutilizar. Não pertence ao código de produção nem constitui solução aceita.

## Próxima ação completa
Revisão do dono na bancada, incluindo decisão Boto humano/golfinho e aparência a preservar. Corrigir rig/animação dos seis sem reduzir limiares; tratar identidade de Saci/Boto; validar movimento, grip e partida, regerar vídeo/poster/thumbnail afetados; integrar somente escopo autorizado em main atual, testar e publicar. PR #481 mistura mapas/sistemas e segue conflitando; não é seguro anunciar pronto apenas pelo build.
