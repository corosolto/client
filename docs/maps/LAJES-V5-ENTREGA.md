# Lajes V5 — entrega local para revisão

A V4 foi rejeitada por simplificar demais o mapa. Esta rodada pesquisou imagens reais de favelas do Rio e de São Paulo e aplicou a pesquisa à geometria, aos materiais e ao horizonte. A identidade ficou mais reconhecível na crítica independente, mas a repetição arquitetônica e a continuidade urbana distante continuam parciais. **Não há aceite estético do usuário nem aprovação para integração.**

## Testar

Servidor deste worktree, já disponível:

http://127.0.0.1:8147/?debug=1&auto=P,mst&map=lajes&perfilauto=0&ctf=1

Recarregar com Cmd+Shift+R. Se o servidor não estiver ativo:

```sh
cd /Users/ruben/csbrasil/worktrees/lajes-visual
PATH=/opt/homebrew/bin:$PATH node tools/eval/serve.mjs 8147
```

Não encerrar outro processo se a porta estiver ocupada. O servidor lê os módulos crus; não requer build do jogo. O teste usa respawn no térreo.

## Referências e tradução visual

Fotografias de Tuca Vieira, efetivamente inspecionadas: [Paraisópolis e Morro da Providência, galeria Vitruvius/Oxfam](https://vitruvius.com.br/revistas/read/arquiteturismo/09.105/5834), imagens19/22 e20/22. Direção: fachadas contíguas, tijolo e concreto aparente, reboco parcial, alturas diferentes, vãos e instalações em escala humana e planos sucessivos de casario. Fontes complementares IMS/Museu Sankofa e Museu das Favelas estão em LAJES-V5-CEU.md. Nenhuma fotografia foi integrada como textura.

- Becos laterais: **5,96 m → 2,45–2,65 m** entre paredes; faces visuais chegam a aproximadamente2,24 m por detalhes de fachada. Alvo1,8–2,8 m é escolha de circulação do jogo, não medida inventada da fotografia.
- Doze novas fachadas exteriores, dois/três pavimentos, total de24 portas medidas de0,90×2,05 m; quatro plataformas, quatro escadas e oito spawns térreos preservados.
- Entorno:234 construções autoradas ligadas, com2–4 pavimentos de2,85 m, aberturas, recuos e acabamentos;36 casas do kit ModularSlums CC-BY4.0 somente no plano distante. O primeiro teste do kit como frente do horizonte foi rejeitado e substituído.
- Materiais usam normal/roughness locais documentados; folhas curvas, janelas variadas, reparos de reboco, mercearia com veneziana e ramais elétricos acima da circulação.
- Duas pipas GLB: vela útil normalizada para1,20×1,061 m e voltada à âncora, mantendo voo/balanço. Helicóptero GLB real de9,5 m, dois rotores, órbita e pausa verificados.
- Piso: eliminada sobreposição das tampas das casas com as lajes. Céu: eliminado recorte pelo far-plane, que produzia a falsa pirâmide branca.

## Capturas e comparação

Artefatos fora do Git em `/Users/ruben/csbrasil/worktrees/lajes-visual/artifacts/lajes-visual/v5/`:

- `comparacao-v4-v5.html`: nove pares antes/depois e duas vistas complementares de horizonte; arquivo independente, cerca de1,1 MB.
- `browser-final/`: PNGs1536×1024, câmeras, passes completos, boot/GLBs, medições e cinco percursos físicos.
- `image-manifest.json`: tamanho e SHA256 das onze imagens finais.
- `browser-first/`, `browser-second/`, `browser-third/`: iterações e defeitos preservados; não representam aprovação.
- `browser-low/`: boot em low, carregamento real, piso/portas/oclusão e céu/PBR verificados. Sem galeria de low nem benchmark de FPS.

Oito câmeras são iguais às da V4. Beco-oeste muda x−15→−14 para acompanhar o novo eixo transitável; não é uma comparação geométrica isolada. Armas/bots/estado CTF não foram congelados entre rodadas. Os percursos finais foram feitos antes do último ajuste exclusivo de raio do domo; geometria e física desses percursos permanecem idênticas. O cálculo posterior de bounding boxes altera apenas a seleção preliminar dos raycasts, com equivalência testada.

## Validação real

- Doze gates Lajes originais verdes: layout, rooftop, visual, nav, ctf-surface, authored, spatial, gap, circuito, antitrap, vertical e bots.
- Identidade:120 cortes de largura,1.199 amostras livres de corpo, inventário de rotas/escadas/spawns preservado. Quatro mutantes causais: beco largo, obstruído, sem helicóptero e sem pipas, todos reprovados; restauração verde. Node mede registro estrutural; GLB/pixel exigem browser.
- Visual:24 portas, quatro pisos, quatro setas,16 visadas entre spawns. Quatro mutantes de porta, seta, oclusão e builder anterior, com restauração, registrados em final-gates.
- Sobreposição de piso LRO1: baseline com duas faces coplanares em16/16 amostras; correção com uma face em16/16. Duplicar um piso volta a reprovar quatro amostras; restauração verde.
- Navegação:609 nós conectados, zero nós ocupados e zero arestas bloqueadas entre3.257. Anti-trap:6.839/6.839 células retornam. MAP3: piso0,300 m, espelho0,1722 m, Blondel0,644 m, largura2,35 m, desvio zero. MAP1/MAP4/MAP6 verdes; CTF2 com duas rotas nos oito pares.
- Browser: cinco percursos por `_updatePlayer`,9.118 chamadas a `_collide`, sem salto obrigatório ou mantle. Três percursos no chão e dois circuitos superiores. Boot final med:77 GLBs HTTP200 e zero erros JS; low:93 GLBs HTTP200 e zero erros JS. Quantidades diferem por armas/população carregadas e não são comparação de custo.
- Céu: fuselagem e rotores reais, órbita/ângulos mudam, pausa mantém estado; duas pipas GLB. Três famílias de normalmap locais com imagens carregadas. Domo + extremo jogável367,51 m abaixo do far-plane400 m.
- Globais executados: mapa Lajes, mapcontrato, mapid, mapjson, map-source, ambience-registry, syntax, build, ARCH, skills e docs:check passaram. Resultados, comandos e hashes por execução: `final-gates/summary.json` e complementos.

Não reexecutei todo check:fast nem declarei saneado o pack geral de áudio/decalques ou o SSR legado. Falhas herdadas desses domínios permanecem documentadas na entrega V4. O servidor estático continua sem APIs reais; falhas HTTP de endpoints não são aprovação do backend. Não houve nova aprovação auditiva.

## Custo e limites

Nove passes completos da captura final: **780–1.095 chamadas e1.330.736–1.536.176 triângulos**. São valores observados, não aprovação de FPS, GPU, orçamento ou comparação controlada com a V4. Não houve janela exclusiva; nenhum servidor/processo alheio foi encerrado.

O casario foi separado em lotes espaciais24 m para preservar rejeição de raycasts distantes. Em um ensaio Node alternado com192 raios, bounding boxes produziram as mesmas primeiras interseções em todos os casos: mediana347,3 ms com caixas versus463,4 ms sem caixas, redução observada de25% nesse ensaio. Não se extrapola para FPS. Script e dados `raycast-bounds.mjs/.json` preservados. Tempos completos do bot-check antes/depois estão na régua; o baseline coexistiu com capturas, portanto o delta não isola toda a mudança.

MAP5 continua como indicador abaixo do alvo (densidade de props0,21 versus0,35), sem afrouxar limiar. Simulação de combate ainda concentra bots no chão, sem cláusula de aceite comportamental. A crítica2 reconhece identidade/estreitamento/objetos de céu, mantém repetição das casas e continuidade distante como limitações, e confirmou que estrias e pirâmide branca desapareceram na imagem final. Não tratar testes técnicos como substituto do olhar do dono.

## Isolamento e checkpoints

Worktree exclusivo `/Users/ruben/csbrasil/worktrees/lajes-visual`, branch `codex/lajes-visual`, base desta rodada `688765c0`. Checkpoints V5: `97861946` arquitetura/identidade/céu, `df6341b2` pisos/recorte/custo e `744e1f22` instrumentos. Todos locais DCO/Agent. PR438 foi consultado novamente: OPEN, CONFLICTING, head `map2/lajes`, base `feat/times-e-mapas-completo`. Seus checks remotos não validam estes commits locais. Sem push, merge, deploy ou alteração da branch original.

Próximo passo de direção de arte: revisão do dono nas mesmas câmeras e jogando, concentrando acréscimos assimétricos e continuidade do tecido urbano. Manter becos, portas, spawns e percursos medidos. Continuidade em LAJES-VISUAL-CONTINUIDADE.md; críticas1 e2 preservadas.

## Arquivos desta rodada

26 arquivos, incluindo esta entrega; os três gerados de mapa/overlays são preservados como artefatos e restaurados.

- `ARCH.generated.md`
- `README.md`
- `STATUS.md`
- `docs/docs/arquitetura.md`
- `docs/docs/colaborar.md`
- `docs/docs/comecando.md`
- `docs/docs/stack.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/arquitetura.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/colaborar.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/comecando.md`
- `docs/i18n/en/docusaurus-plugin-content-docs/current/stack.md`
- `docs/maps/LAJES-V5-CEU.md`
- `docs/maps/LAJES-V5-CRITICA-1.md`
- `docs/maps/LAJES-V5-CRITICA-2.md`
- `docs/maps/LAJES-V5-DIRECAO.md`
- `docs/maps/LAJES-V5-ENTREGA.md`
- `docs/maps/LAJES-V5-REGUA.md`
- `docs/maps/LAJES-VISUAL-CONTINUIDADE.md`
- `package.json`
- `public/js/lajes_houses.js`
- `public/js/lajes_sky.js`
- `public/js/map_lajes_authored.js`
- `tools/eval/lajes-browser-check.mjs`
- `tools/eval/lajes-identidade-check.mjs`
- `tools/eval/lajes-roof-overlap-check.mjs`
- `tools/eval/lajes-visual-measure.mjs`
