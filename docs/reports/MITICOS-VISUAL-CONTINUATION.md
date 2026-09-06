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


## Checkpoint 1284ab42 e candidato Zumbi (06/09, 04h)
- Remoção dos quatro times concluída no commit `1284ab42`, hooks normais e revisão adversarial. Dezessete verificações direcionadas e menu real em duas resoluções passaram. Não é validação de release.
- Zumbi confirmado com malha em A-pose e rig de braços em T-pose; também faltam clipes próprios no manifesto para TODOS os Míticos exceto Bandeirante. Não basta gerar clipes: validar que o manifesto os carregou.
- Candidato Zumbi isolado em `artifacts/miticos-review/zumbi-refit/`: Blender `zumbi.blend`, GLB `zumbi.glb`, clipes `anims/`. Scripts `refit-zumbi.py`, `retarget-directions.mjs`, `inspect-zumbi-refit.mjs`, `measure-zumbi-refit.mjs`, `motion-zumbi-refit.mjs` no diretório pai. Public permanece original.
- Processo viável: assar a malha avaliada de repouso do importador Blender, reconstruir armature em metros com marcos anatômicos, heat weights e reskin, curls com transição contínua e retarget por direções dos segmentos. Importador mantém espaços de bind diferentes; reutilizar diretamente malha/armature importados deu escala/posição errada. Primeiras capturas ainda usavam o pack antigo porque o manifesto excluía Zumbi; DESCARTADAS.
- Candidato atual na seleção: p99 0,582 (limite 0,689), 21,5 arestas ruins/10 mil (limite 26,1), contra 39,2 original. Sem relaxar limiares. `zumbi-refit/select-inflate.json` e `.log`. Curls com corte abrupto em z=0,135 tinham 63,6; corte removido, não repetir.
- Runtime experimental anula deslocamento da arma em relação à palma apenas para Zumbi; interceptação em scripts, sem alteração em produção. Distância entre âncoras de mão/arma: direita zero, esquerda até 6,7 mm em 240 frames. Isso não prova fechamento visual perfeito dos dedos.
- Movimento ainda REPROVADO: caminhada pé mínimo -9,99 cm; corrida -4,99 cm; idle +1,1 cm; crouch +2,8 cm. Pano central rasga no agachamento. Corrigir clipes/contato e pesos do tecido antes de aceitar. Imagens e amostras `zumbi-refit/motion/`.
- Textura original extraída para `zumbi-diagnosis/texture-original.webp` (conteúdo JPEG). Pinturas continuam presentes. OpenRouter não configurado na worktree; pergunta ao dono pendente pedindo somente caminho do .env autorizado, nunca a chave em chat. Nenhuma imagem gerada por provedor alternativo.
- Próxima ação: corrigir pesos do pano e contato dos pés; validar todas as poses, testar grip visualmente, retirar pinturas com textura revisada quando houver configuração. Ainda falta todo o restante da revisão dos Míticos, integração e publicação.


## Continuação do candidato Zumbi e build (06/09, 04h15)
- `npm run build` passou após a remoção dos times; log `artifacts/miticos-review/removal-build.log`. Publicação ainda não realizada.
- Grounding dos novos clipes passa a ser assado no asset (`ground-zumbi-clips.mjs`); o arnês remove somente o offset antigo de Zumbi via interceptação de `foot-offsets.json`, pois somá-lo novamente enterrava o pé. Última bateria completa: idle 0..0,7 mm, walk -9,2..5,9 mm, run 11,3..101,5 mm (fase aérea), crouch 0..1 mm. Isso não aprova o visual do agachamento.
- Ajustes posteriores de tecido/pernas ainda NÃO passaram pela régua completa de deformação; o placar 21,5 pertence ao candidato anterior. Nova geometria inclui subdivisão localizada nos joelhos e pesos limitados à cadeia de cada perna. Primeiro seletor de pernas atingiu dedos por y baixo; corrigido com limite abs(x)<=0,30.
- `rigid-zumbi-cloth.mjs` foi retirado do build experimental: fixar panos ao quadril não resolveu o agachamento. `build-zumbi-candidate.sh` recompõe Blender -> reskin -> pesos de pernas -> retarget -> grounding -> captura, com `set -eu`. `POSES=crouch` permite depurar só a pose reprovada.
- Diagnóstico sem iluminação em `zumbi-refit/crouch-albedo.png`: as grandes áreas rosadas nos joelhos são fortemente acentuadas pela iluminação/normal; não afirmar que toda mancha é furo. O tecido central ainda estica e a pose ajoelhada continua ruim.
- Teste atual `crouch-zumbi-clips.mjs`: agachamento e caminhada agachada autorados por IK de duas pernas, pés plantados e joelhos para frente; substitui apenas clipes no diretório de artefatos. Aguarda captura e revisão, sem aprovação. Este script roda DEPOIS do retarget e ANTES do grounding; ainda não incluído no build reproduzível até validar.
- O browser carrega somente Zumbi nesses experimentos. Aguardar exit 0 antes de ler imagens reutilizando o mesmo nome, senão a imagem pode ser da tentativa anterior.
- SHA256 do GLB experimental neste checkpoint: `8ffaa9ff96fbf6502bb0e11223865252a2c515602c77df786ee676ce96e2c54b`. Nenhum GLB de produção foi alterado.


## Zumbi: profundidade de juntas e tecido; Bandeirante (06/09, continuação)
- Joelhos e tornozelos reposicionados na profundidade medida da malha: Leg z=-0,035, Foot z=-0,055. Agachamento autorado em `crouch-zumbi-clips.mjs` já incluído no build experimental, antes do grounding.
- Tecido frontal cruzava pesos de ambas as coxas; seletor geométrico completo de `rigid-zumbi-cloth.mjs` fixa 791 vértices ao quadril. Última seleção: p99 0,630 (limite 0,689), 27,0 arestas ruins/10 mil (limite 26,1): AINDA REPROVADO. Fotos atualizadas de idle/crouch mostram melhora das pernas e retirada da mão das costas, mas tecido/empunhadura continuam sem aprovação. O script do tecido foi aplicado manualmente e ainda precisa entrar no build se for aceito.
- Não rodar select-inflate só com Zumbi: precisa incluir mandrake,pagodeiro para calcular teto; sem referências retorna erro 2. O JSON de deformação detalhada requer --diagnose.
- Bandeirante: comprimento do mosquete 1,45 -> 1,15 em weapons.js. Comparação servida frente/lado/costas em `bandeirante-size/`; crítico independente aprovou tamanho, reprovou mão de apoio ~20 px abaixo da madeira. Seção medida do guarda-mão em z=0,217 tem y=-0,0027..0,0645; alvo genérico atual y=-0,045 explica a folga. Testes locais de altura em `bandeirante-grip/`; correção de contato ainda não integrada.
- Lobisomem: candidato de redução isolado em `lobi-tail/lobisomem.glb`, 66 vértices da cauda modificados, 3547 preservados. Extensão posterior além de z=0: 0,923 -> 0,415 em espaço do asset. Pesos da região 100% Hips, nenhuma junta alterada. Aguarda captura/revisão; não substitui public.
- Continuidade: ainda falta concluir a revisão de todos os Míticos, substituir assets aprovados, vídeos/posters, partida real e integração/publicação. OpenRouter segue sem configuração; pergunta de caminho do .env pendente. Nenhum personagem novo aprovado ou publicado.


## Lobisomem aprovado para redução da cauda; retarget nativo (06/09, 04h45)
- Tamanho do mosquete salvo em `d72affd7`; a mão de apoio continua pendente. Não confundir aprovação de proporção com aprovação completa da empunhadura.
- Crítico de contexto limpo aprovou a cauda curta do Lobisomem nas 12 vistas (quatro poses × três ângulos). Modelo integrado em public; SHA256 `6b3839025c194b1418c71c7ddb68a9a9afe59794d50d49c4409197edf6f0093d`. Alteração restrita a 66 posições/normais da cauda, demais 3547 vértices preservados; rig, UV e texturas preservados.
- Três vídeos regenerados do runtime. Primeira captura revelou cortes na queda/pulo; saída descartada e refeita com câmera fixa calculada pela união das poses amostradas. Quatro quadros de cada vídeo conferidos e aprovados por crítico independente, em `lobi-tail/fitted-{selecao,vitoria,derrota}.png`. Processo em `native-videos-fitted.mjs`; captura manual a 13 FPS, viewport 640×854/640×640, sem temporizador reiniciando salto. `eval:mitico` e diff check passaram. Nenhuma partida validada ainda.
- Os posters de resultado e avatar ainda mostram a cauda antiga; precisam ser regenerados antes da entrega. Posters atuais são WebP com alpha 1024×1536 (derrota quase invisível), avatar opaco 256². Não substituir por frame opaco sem verificar a composição da UI.
- Novo retarget por direções em modelos nativos, sem alterações de malha: Boto 14,1 e Curupira 17,8 arestas ruins/10 mil, ambos dentro do teto 26,1. Lampião 99,9 e Maria 37,0 continuam reprovados. Diretório `direction-retarget/`; manifesto/clipes servidos apenas via interceptação, public intacto. Boto/Curupira aguardam revisão de todas as poses e pés.
- Cuca: rig novo usa malha avaliada assada e origem deslocada -0,52 no eixo glTF Z para centrar o corpo. Heat weights falharam; fallback inicial por segmento + reskin usado. Sempre invocar Blender com `--python-exit-code 1`, pois erro Python devolvia exit 0 antes disso. Candidato em `cuca-refit/`; clipes próprios, grounding e interceptação do mount real na palma. Habilitar IK L requer retirar Cuca de IK_L_SKIP apenas no arnês. Cabeça e cauda antigas tinham pesos compartilhados com braços/pernas. Ainda há deformação no pescoço/cabelo: não aprovado, não integrado.
- Objetivo integral permanece revisão dos nove Míticos, correções históricas e de grip, regressões/partida, integração sem mapas/sistemas estranhos à entrega, e publicação. OpenRouter continua pendente de configuração informada pelo dono.

## Continuação: Boto ereto e tentativas Cuca (06/09)
- Checkpoint público vigente `f05edaf9`: cauda/vídeos do Lobisomem. Posters/avatar ainda pendentes; demais personagens não foram substituídos.
- Boto: `upright-boto-clips.mjs` reduz a inclinação do tronco da caminhada, eleva o quadril parcialmente com IK preservando alvos dos pés e relaxa o braço livre nos clipes de uma mão. Originais anteriores preservados em `direction-retarget/boto-before-upright/`. Capturas idle/walk mostram tronco mais ereto e braço junto ao corpo, mas medição anterior tinha idle +3,1 cm e walk -3,2..+4,1 cm: não aprovado.
- `ground-native-clips.mjs` corrige a translação no espaço local do pai do quadril, respeitando a escala 0,01 do rig nativo. O script antigo do Zumbi só é válido para o rig novo em metros. O arnês remove offsets antigos apenas do Boto; medição completa após grounding em andamento. Public permanece intacto.
- Cuca: retarget/rig novo + pesos suaves cabeça/pescoço e cauda inteira fixa ao quadril chegou a 76,4 arestas ruins/10 mil, ainda acima de 26,1. Tentativa posterior de classificação por cor/região (`cuca-region-weights.mjs`) piorou para 227,4 (p99 3,656): REPROVADA, é o GLB experimental atual. Não confundir screenshots anteriores de movimento com esse último candidato.
- Diagnóstico Cuca identifica cauda como componente separado de 102 vértices; o seletor posterior pegava só 76 e deve ser corrigido. Classificação de cabelo por cor pode divergir entre vértices coincidentes de costuras UV: hipótese ainda não verificada. Não repetir heurísticas sem medir a causa.
- Zumbi permanece reprovado no candidato 27,0/10 mil; textura com pinturas não alterada, configuração OpenRouter pendente. Objetivo integral e demais pendências permanecem como descritos acima; nenhum push/merge/deploy.
- Boto após grounding denso a 120 Hz: idle +0,09..+0,75 mm; walk -0,73..+0,29 mm; run +1,8..+83,6 mm (fase aérea); crouch +0,25..+1,37 mm em 240 amostras. `resample-native-clips.mjs` seguido por grounding elimina afundamento entre chaves de 30 Hz. Braço livre também corrigido em run/crouch/crouchwalk por `relax-boto-spare-hand.mjs`. Crítico independente aprovou postura das quatro poses NAS CAPTURAS, mas reprovou dedos abertos em torno da pistola; não é aprovação de release/ciclo completo. Seleção Boto 4,7 arestas ruins/10 mil, p99 0,502.
- Cuca: auditoria confirmou 58 duplicatas de costura com pesos divergentes (mesma posição, até delta total 2). Canonização remove todas e suavização topológica de três passes + cauda completa reduziu 227,4 para 104,6; ainda REPROVADA, p99 1,011. `audit-weight-seams.mjs` e `smooth-weight-seams.mjs`; candidato anterior salvo como `cuca-region-rejected.glb`. Não confundir melhoria parcial com aceitação.
- Pôsteres de resultado do Lobisomem substituídos pelos renders do modelo com cauda curta; crítico aprovou enquadramento integral e transparência real (RGBA, alpha 0..255). Mesmo idle nos dois, como nas referências anteriores. `eval:posters` passou (24 cartazes). Avatar inicial reprovado por pés cortados; enquadramento sendo corrigido, ainda não substituído.
- A empunhadura do Boto exige juntas de dedos, ausentes no rig nativo. Experimento `boto-grip-rig.mjs` acrescenta cadeia direita com pivôs e matrizes inversas calculados no espaço correto, sem alterar posições/UV/texturas. Interceptação isolada em `motion-boto-grip.mjs`; não aprovado. `tools/finger-curl.mjs` antigo mistura deslocamentos de mundo com locais e não foi usado. Capturas de mão original em `boto-hand-{front,back,top}.png`.
- Avatar do Lobisomem corrigido e aprovado pelo crítico em 256²: cabeça, arma, cauda e dois pés inteiros. Integrado junto aos dois posters. A cadeia GLB -> três vídeos -> posters/thumbnail agora reflete a cauda curta. Esta aceitação é de cauda/enquadramento; não aprova empunhadura nem release.
