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

## Review do dono em andamento (06/09)
- Cuca reprovada por aparência/deformação e por não segurar a arma direito.
- Saci reprovado por postura toda curvada, sem leitura humana convincente.
- Lampião reprovado por postura curvada e pouca semelhança com Lampião histórico. Três imagens fornecidas pelo dono preservadas em `references/lampiao/owner-review-20260906/`: duas fotos PB (rosto e corpo) e uma referência colorida de figurino. Não atribuir identidade histórica à imagem colorida sem verificação.
- Maria Bonita: dono reprova todas as poses. Boto: caminhada excessivamente curvada.
- Lobisomem: dono pede cauda menor; preservar restante da direção de arte já aprovada. Bandeirante: mosquete grande demais; reduzir tamanho visual e rever contato das mãos.
- Dono não encontra os times adicionais no seletor. Registro contém dez facções, porém N/R/O/T estão `ready:false`; elencos atuais têm 3/1/2/3 personagens. Decisão posterior do dono: apagar os quatro times adicionais e manter somente os cinco existentes e Míticos.
- Checkpoint dos instrumentos: `a77bf76e`; nenhum modelo aceito nesse commit.
- Experimentos adicionais Cuca por regiões v1/v2 reprovados (1218/376,9 arestas ruins por 10 mil); artefatos preservados, malha original restaurada antes do teste seguinte.
- Descoberto manifesto sem clipes próprios para Cuca/Saci: runtime usa pack compartilhado. Teste em andamento adapta os 11 clipes à Cuca original, isolando animação de alterações de pesos. Não considerar assets temporários aceitos.


## Decisão e remoção dos times adicionais (06/09)
- Autorização explícita do dono: “descadastre e apague os times adicionais só queremos o time miticos/lendarios”. Retirados Nerdolas, Profissionais, Noias e TV do cadastro, nove personagens publicados, assets exclusivos, conteúdo de vozes e capacidades exclusivas. Mantidos cinco times existentes e os nove Míticos.
- Menu real validado em 1200×800 e 1536×1024: seis cards visíveis, elenco M com nove entradas, zero erros de página. Imagens e JSON em `artifacts/miticos-review/only-six-factions-*.png` e `removal-browser.json`.
- Doze verificações direcionadas passaram (sintaxe, registro, Míticos, vozes, UI, CTF, animações e offsets dos pés); log `removal-checks.log`. Revisão adversarial encontrou teste de capacete dependente do Motoca removido: substituídos contratos exclusivos pelo contrato genérico CS_HARD_, preservado no runtime. Cinco verificações adicionais passaram: charhard, integridade dos assets, docs, arquitetura e spec. A mutação sem marcador CS_HARD_ reprovou como esperado. `git diff --check` passou. Logs `removal-extra-checks.log`.
- Manifesto de áudio e arquivos de áudio não estão disponíveis nesta worktree; não declarar pipeline completo de áudio validado.

## Zumbi: feedback e pesquisa de referências (06/09)
- Dono reprova volume corporal balonado, poses e mão atravessando as costas. Screenshot em `references/zumbi/owner-review-20260906/mao-nas-costas.png`. Corrigir contato e deformação em seleção e movimento; uma captura frontal não basta.
- Não foi encontrada comprovação das pinturas corporais atuais. O estudo publicado pela USP relata ausência de descrição física conhecida de Zumbi: https://revistas.usp.br/revistaec/article/view/235811 . A Brasiliana Fotográfica/BN identifica o retrato de Antônio Parreiras como obra de 1927: https://brasilianafotografica.bn.gov.br/?p=17370 . É representação posterior, não retrato feito em vida. Remover marcas sem fundamento; não apresentar nova aparência como reconstrução histórica exata.
- Pesquisa não confirma que nunca usou pinturas; ausência de comprovação não permite essa conclusão. Trajes e aparência também exigem distinguir documentação histórica de interpretação artística.

## Retarget experimental encerrado sem aprovação
- A geração de onze clipes próprios para Cuca/Saci/Lampião/Maria melhorou algumas medidas, mas todos continuam reprovados: Cuca 279,5; Saci 600,8; Lampião 99,9; Maria 36,1 arestas ruins/10 mil. Cuca regiões+retarget 479,7, cabeça v1+retarget 357,8 também reprovadas.
- Todos os modelos e packs experimentais foram retirados de public e preservados somente em `artifacts/miticos-review/retarget-candidates/` e variantes documentadas nos logs. Não repetir os ajustes heurísticos de pesos como se fossem inéditos.
- Próximo: isolar animação e IK na mão atravessando Zumbi, corrigir rig/pose com evidência dinâmica; concluir todas as correções do dono listadas acima, validar no jogo e revisar integração/publicação. Nenhum personagem foi aprovado nem publicado até este ponto.
