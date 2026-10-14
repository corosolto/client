# Wallpapers e sprites — continuidade

## Objetivo e pronto

Entregar arte dos políticos e míticos do elenco atual, corrigir o palhaço vermelho
no loading 5K, manter proporções consistentes por superfície e variar a mídia
durante a visita. Validar dimensões, rotação, movimento reduzido e screenshots
em 5120×2880 e 3:2; revisão independente antes de aceitar os assets.

## Estado

- Branch: `codex/wallpapers-roster-5k-20261011`, base `261cf59a7` (alpha.67).
- Worktree: `client/worktrees/wallpapers-roster-5k-20261011`.
- Preview local Astro ativo em `http://127.0.0.1:8198/`; fixtures em 8197.
  Captura final usou `?tela=menu&home=legacy&safe=1&lang=pt&debug=1`.
- Checkout principal contém mudanças alheias e foi preservado.
- Diagnóstico anterior por `sharp.metadata()`: loading-1 era 1536×1024; os demais eram
  1672×941. O `contain` de splash/loading expõe laterais no primeiro.
- Wallpapers de menu existentes são 1536×1024 (3:2); conservar essa proporção.
- Referências: GLBs e retratos versionados do elenco, sem buscar rostos externos.
- Geração 2D deste lote: GPT integrado autorizado explicitamente pelo dono em
  11/10/2026, após HTTP 402 do OpenRouter. Sprites: render do GLB real.
- Checkpoint técnico: `7440abebc` (rotação, geradores, fichas e gates).
- Checkpoint dos 19 pares de sprites e procedência: `5655c2e13`.
- Checkpoint final dos wallpapers, loading e importação: `bbffc4d92`.
- Artefatos persistidos em
  `/Volumes/Zenith/Projects/game/corosolto/csbrasil/launch-media/2026-10-11-wallpapers/`:
  `references/`, `sprites/`, `sprites-preview.png`, `prompts.json` e `evidence/`.

## Aceitos e rejeitados

- Aceito: uniformizar loading em 16:9 e menu em 3:2, cada lote com contrato próprio.
- Rejeitado: esticar o palhaço, recortar a marca ou inventar personagens por texto.
- Rejeitado: usar o checkout principal antigo como base da implementação.
- Aceito pelo crítico independente `/root/media_review`: 19 sprites do cabeçalho,
  192×192 com alpha e 24 quadros; todos os quadros foram medidos sem contato com
  a borda. Capturas servidas de Barbudo desktop/mobile e Lobisomem desktop foram
  aprovadas no tamanho real. A apresentação sem arma adicional foi aceita.
- Aceitos pelo crítico independente: 19 wallpapers GPT, 1536×1024 (3:2),
  identidade, arma e corpo/marca inteiros nas capturas 3:2 e 5120×2880.
- Primeira Maria Bonita rejeitada por cortar chapéu e marca em 5K; revisão GPT
  recuou o enquadramento e foi aprovada nas capturas atualizadas às 12:50.
- Rejeitada a primeira recomposição do palhaço por tocar a borda com o chapéu;
  segunda versão preserva margem acima dele, aprovada em 1664×936.
- Loading-2..6 normalizados na mesma dimensão 16:9, sem esticar; originais em
  `previous-loading-N.webp` no diretório de masters.
- Loading-1 aprovado: full-bleed em 5120×2880, sem faixas ou estiramento.
- Loading-2..6 aprovados: composição anterior preservada após normalização.
- As capturas do lote são fixtures com CSS/URLs reais; não equivalem à aprovação
  humana do dono. Masters têm 1536×1024; preencher tela 5K não é resolução nativa 5K.

## Próximo passo

Implementação local concluída, lote visual aceito e pronto para revisão do dono
no checkout isolado. Checkpoints recuperáveis preservam código e assets.
Próxima ação externa: eventual merge/deploy, que não foi autorizado neste pedido.

## Marco técnico validado

- `npm run syntax` passou.
- `tools/eval/media-rotation-check.mjs` passou; a mutação `sem-guardas`
  reprovou a rotação em aba oculta, como esperado.
- Gates existentes de wallpapers, manifesto de mídia e variantes 3:2 passaram.
- `npm run build` passou (log local `/tmp/cs-wallpapers-5k/build.log`).
- Revisão independente encontrou mudança da largura do header após decode.
  Corrigida mantendo a largura reservada e confirmada em captura servida.
- As referências são renders sem arma adicional, como o charvideo atual. A ficha
  foi corrigida para não prometer montagem que esse pipeline não produz.
- `roster-media-check.mjs`: lote completo de 19 personagens, zero falhas;
  mutações `sprite-esticado` e `palhaco-3x2` reprovam os contratos correspondentes.
- Manifesto e variantes 3:2 atualizados: 37 wallpapers + 6 loadings, ambos gates
  passaram. Os novos 19 wallpapers entram pela lista que o runtime busca.
- Navegador no menu real: wallpaper mudou após 22 s; com movimento reduzido
  permaneceu igual após 22 s; nenhum erro de página. Screenshot em
  `evidence/menu-3x2-rotation.png`.
- Cabeçalho Astro servido: sprites completos desktop/mobile, largura reservada
  estável; `prefers-reduced-motion` selecionou `-still.webp`.
- `npm run docs:check` passou após regeneração dos blocos; fonte pública PT/EN
  explica o contrato dos sprites e a rotação.
- Primeiro build Docusaurus PT/EN passou. Artefato preservado fora do Git em
  `launch-media/2026-10-11-wallpapers/docs-build/`, log `evidence/docs-build.log`;
  árvore pública gerada nesta execução foi restaurada. Segundo build PT/EN com a
  documentação dos wallpapers também passou, com saída direta externa;
  `evidence/docs-build-final.log`.
- Build Astro final passou: `evidence/build-final.log`. Após refinar somente a
  imagem de Maria Bonita, gates do lote e das 37 variantes voltaram a passar.
- Menu completo Astro local passou com driver Metal: manifesto com 37 fundos,
  `__CS_MAIN_READY__` verdadeiro, wallpaper novo Barbudo exibido e zero pageerrors;
  `evidence/wallpapers/menu-politico-real-3x2.png`. O enquadramento e a leitura dos
  controles são visíveis nessa captura. A revisão independente também aprovou
  o menu completo: corpo, arma e marca inteiros, controles sem sobreposição.
- Tentativas com SwiftShader travaram na automação; mudar para Metal resolveu.
  A primeira captura de menu antecedeu a aplicação do alvo; o script passou a
  aguardar manifesto, decode e dois frames. Não foi mudança no runtime do produto.
- 38 capturas CSS dos 19 wallpapers em dois formatos e loading-1 em 5K estão
  em `evidence/wallpapers/`; pranchas `wallpapers-3x2-preview.png` e
  `wallpapers-5k-preview.png`. Revisão: `evidence/REVIEW.md`.
- Captura 5120×2880 em `evidence/loading-palhaco-5k-before.png` confirma a faixa
  lateral atual. Isso é diagnóstico, não evidência de correção.

## Provedor e retomada

OpenRouter retornou HTTP 402: exige saldo mínimo de US$ 1 para saída de imagens.
O dono autorizou: “Voce pode gerar os wallpapers via gpt mesmo”. Usar a ferramenta
integrada, uma geração por asset, preservar masters e referências no workspace.
20 masters finais persistidos no workspace. Os prompts efetivos e caminhos de
geração e revisão Maria Bonita estão em `gpt-prompts.json`; `prompts.json` preserva a preparação padrão.
Preparação retomável: `node tools/gen-roster-wallpapers.mjs --prepare-only`.
O diretório padrão dos masters é resolvido pelo Git common-dir, igual no checkout
principal e nos worktrees; `MASTERS` permite substituir explicitamente. Preparação
validada após esse ajuste, sem regenerar ou sobrescrever artes.
O comando sem essa flag continua sendo o pipeline OpenRouter original.

## Revisão de estilo — 12/10/2026

O dono aprovou o lote, mas apontou que os novos personagens precisam receber
a mesma estilização GPT das artes antigas, especialmente o palhaço. O lote
inicial preservou demais a aparência de render GLB: volumes de boneco nos
políticos e facetas no Lobisomem. Nova etapa: reinterpretar os 19 personagens
como arte cinematográfica ilustrada, com textura e detalhes orgânicos,
preservando identidade, figurino, armas, proporção e margens 5K.

Originais recuperáveis: commit `bbffc4d92` e
`launch-media/2026-10-11-wallpapers/style-revision-2026-10-12/previous-webp/`.
Loading do palhaço permanece referência aprovada. Clarificação sobre aplicar
a mesma revisão aos sprites do cabeçalho está pendente; wallpapers avançam.
Marco validado: Barbudo (wall-38) e Lobisomem (wall-29) reinterpretados por GPT
e aprovados pelo crítico limpo `/root/style_review`, comparando referências de
estilo, GLB/arma e quatro capturas CSS em 3:2/5K. Pelagem, pele, barba, tecido
e anatomia orgânicos; identidade, arma, corpo e logo preservados. Masters e
prompts estão em `style-revision-2026-10-12/`; ainda não importados no runtime.
Próximo passo: estender o tratamento aos outros 17 wallpapers, importar o lote,
capturar servido e obter crítica independente final.


### Lote ilustrado e refinamentos

Os 19 masters foram gerados com GPT integrado e persistidos em
`style-revision-2026-10-12/`; `gpt-style-prompts.json` registra os prompts efetivos,
referências e saídas. Candidatos iniciais de Dama e Deputada da Tiara foram
rejeitados por cortar os sapatos no crop 16:9; novas versões recuam a figura.
O crítico também rejeitou a arma de Saci (silhueta M4); edição localizada troca
pela MP5 da ficha. Candidatos rejeitados e respectivas capturas ficam em
`wall-*-rejected-*.png` e `evidence/rejected/`, fora do Git. Crítica final pendente.

Checagens nesta etapa: sintaxe do gerador, ficha WALLPAPERS-ROSTER e mutação da
ficha passaram; `docs:check` passou. `spec:check` geral falha em 12 seções ausentes
de planos 24-LAJES-SANTOS-DUMONT e 25-PISCINA-DA-TRETA-REWORK, ambos idênticos
a HEAD. `changelog:check` geral falha na contagem da versão alpha.67 (4 PRs na
seção, 3 no Git); a seção da versão atual também é idêntica a HEAD. Nenhuma dessas
falhas foi causada ou corrigida pela revisão de arte.


Marco final dos masters: todos os 19 aprovados por `/root/style_review` em
12/10, incluindo a MP5 corrigida do Saci e o recuo adicional do Bandeirante e
Capitão, cujas solas interceptavam a borda 5K. As quatro recomposições de margem
(Dama, Tiara, Bandeirante e Capitão) preservaram identidade/figurino/arma/estilo.
Todos foram importados em WebP; variantes 3:2 estão sendo geradas. Gate do lote
passou com 19 personagens/zero falhas; manifesto passou com 37 walls/6 loadings;
ficha específica passou novamente. Próximo passo: confirmar variantes por hash,
capturar WebP/menu servido, crítica final de apresentação e checkpoint Git.


### Apresentação final validada

Os 19 wallpapers e suas variantes 3:2 estão importados. Gate de hashes confirma
37 variantes atualizadas; loading/sprites da etapa anterior permanecem íntegros.
Build Astro final desta revisão passou (`style-build.log`). Captura final servida
em `style-revision-2026-10-12/evidence/served/`: 38 crops (3:2/5120×2880) e menu
completo 3:2, total 39/zero pageerrors. Prancha com nomes: `style-served-preview.png`.
Crítico independente aprovou a apresentação final em 12/10: compressão, logo,
armas, corpos, menu e controles legíveis. Margens de Lobisomem/Lampião/Juiz são
apertadas no crop 16:9, sem corte observado. Fontes 1536×1024, não nativas 5K.

Primeira tentativa de WebP servidos teve screenshots parcialmente pintados,
apesar de arquivos completos e zero pageerrors. Arquivada em
`evidence/served-partial-capture/`; repetição aguardando decode + 2 frames +
500 ms resolveu as capturas. Isso mudou apenas o script de evidência externo.

Autorização recebida para push/PR draft desta branch, sem merge/deploy.
Base remota confirmada em 12/10: main `261cf59a7bbc0a7e50352a84d6ba5cb8313eec95`,
sem commits posteriores. Não existe PR desta branch. O PR inclui toda a frente
dos commits 7440abebc, 5655c2e13, 442f313e1, bbffc4d92, 8a12faf45 e 07b7056cf,
mais esta revisão. Nenhuma dependência entre PRs conhecida; assets privados e
masters PNG ficam fora do Git. `check:fast` amplo em execução. `npm run check`
não existe no package atual. Índice ARCH regenerado para a alteração prévia em
main.js (4411 linhas/333 símbolos), e arch:check passou. Próximo passo: concluir
checks amplos, registrar limitações, publicar branch e abrir/anexar draft.


### Checks para o draft

Checkpoint da revisão: `7162b5490`. `check:fast` terminou em 412 s com 172/186
passos verdes. ARCH foi regenerado e seu check isolado passou. As 13 falhas
restantes foram reproduzidas em checkout temporário limpo da base `261cf59a7`
(0/13 verdes, 21,8 s): mapid; audio:check; grafite; eval:grafite; eval:grafite:ar;
eval:grafite-editorial; eval:audiofablocal; eval:audiovoicemix; eval:grafitelayout;
changelog:check; eval:lajes-identidade; eval:amazonia; eval:mansao. Envolvem
referências de mapas/grafite já presentes na base, perfis e regras de áudio,
áudio privado ausente no worktree, contagem de PRs da versão atual, geometria de
Lajes e fixtures/props de Amazônia/Mansão. Não foram ampliadas correções para
essas frentes. Logs e comparação estão em `style-revision-2026-10-12/evidence/`.

A execução ampla alterou só o timestamp de `tools/eval/pickup_check.json`;
saída preservada fora do Git e arquivo restaurado. Build passou; ficha específica,
manifesto, lote19, variantes37, docs e arch passaram. Estado visual completo e
aprovado; merge/deploy continuam pendentes. Próximo passo: push com hook padrão,
abrir draft (sem duplicata), anexar artefato e registrar URL.


### PR draft aberto

https://github.com/corosolto/client/pull/820, branch
`codex/wallpapers-roster-5k-20261011`, base main `261cf59a7`. O draft inclui a frente
completa e a revisão de estilo. Checkpoint de arte `7162b5490`, comparação ampla
`fbbbba35a`. Push inicial passou pelo hook padrão (mapcontrato/check:deploy e
trailers), 44 s, sem bypass. PR anexado a este chat. Descrição registra validação
visual, resolução nativa, limitações dos checks amplos e ausência de dependência
entre PRs. Nenhum master, referência privada, segredo ou PNG de evidência subiu.

Próxima ação: revisão do draft/CI e decisão humana sobre merge. Sem merge ou
deploy nesta sessão. Pedido opcional sobre revisar também o acabamento dos
sprites não recebeu resposta; eles seguem no lote animado validado anteriormente.
A revisão de acabamento GPT concluída aqui cobre os 19 wallpapers.
