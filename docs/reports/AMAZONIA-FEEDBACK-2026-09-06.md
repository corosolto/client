# Treta na Amazônia — rodada do feedback de 06/09/2026

Implementados nove acessos reais às varandas, vegetação adicional, araras em voo,
canoa-rabeta navegando, redução de chamadas de desenho e thumbnail do runtime.
Preview local: <http://127.0.0.1:8157/?map=amazonia&perfilauto=0&lang=pt-BR>.
Recarregar com Cmd+Shift+R. Menu da main preservado, seleção de facção validada.

## Escopo e procedência

Worktree `codex/amazonia-visual`; início desta rodada em 97eeb516. Assets preparados em
5774823c; correções e réguas em ebfda5c9; inventários em 070ba900. Snapshot local da main 69555790, sem merge/rebase/push/deploy. Não houve
alteração de outro checkout ou do renderer/game.js compartilhado. O consentimento
para Mint veio do usuário. Geração, fontes e hashes estão nos FONTEs/registro.

Código medido SHA256:
`6435500ab916414271c3f531fa21462680a4895cfebd666cdde14cb412cfb74f`.
Capturas e evidências ficam em `artifacts/amazonia-visual/` nesta worktree.

## O que mudou

- As escadas embutidas no GLB tinham aproximadamente 0,70 m de largura, contra corpo
  de 0,76 m, e ficavam dentro do colisor da casa. O derivado remove essas faces e
  recebe um lance lateral de 1,60 m, com 12 degraus de 0,129 m até a varanda a 3,85 m.
  O colisor acompanha o corpo fechado da casa; deck e guarda têm abertura real.
- 30 árvores adicionais fecham a paisagem externa. As 63 árvores e 27 palmeiras interiores
  preservam rotas, spawns e bandeiras. Derivados reduzem árvore de 4.334 para 3.324 triângulos e
  babaçu de 4.694 para 2.830 triângulos. A camada externa não projeta sombras.
- Peças estáticas opacas são agrupadas por material e setor de 14 m. Superfícies
  marcadas `nonSolidSurface` ficam fora do merge; os objetos de oclusão são
  preservados para tiros. `?amzbatch=0` desliga o agrupamento.
- Quatro araras da main (duas em low), com asas e órbitas animadas. Uma canoa Mint
  / TripoP1, com 3.758 triângulos e 360.236 bytes, navega além dos bounds: z de 45,38 a 54,62, sobre a
  água existente. `?amzlife=0` desliga essas adições de ambiência.
- O snapshot anterior omitia três texturas e duas plantas. A cópia foi completada
  e ganhou sincronização reproduzível em `tools/amazonia-preview-sync.mjs`.
- `public/img/map-previews/amazonia.jpg` agora deriva diretamente do canvas do
  jogo, sem HUD/arma. Recibo: `AMAZONIA-THUMBNAIL.json`; imagem de 960×640, com 85.533 bytes.

## Validação e revisão

- Runtime composto da main, Chrome, 1536×1024, qualidades med e low: 51/51 trajetos
  em cada uma, incluindo ida/volta de nove varandas e percurso desde o chão.
  Zero pageerrors/HTTP404, zero linha direta entre spawns, 63 troncos dentro do
  colisor na altura do corpo. Provas: `feedback-delivery-{med,low}/`.
- AMA1 e AMA3: nove acessos e duas paredes de chapa corretos. Os mutantes reais de
  fonte removendo piso/colisor correto falham 9/9; parede sem oclusão falha 2/2.
- MAP1=0 corpos dentro de sólido; MAP6=0 bordas altas sem guarda. Revisão independente
  encontrou a oclusão perdida das casas de chapa, metadata perdida no merge e
  arredondamento Float32 no limite do pontão; corrigidos, re-sondados e mutados.
  Não houve relaxamento dos limiares de jogabilidade.
- AMZ1–7 e AMV1–7 passaram. Os nove mutantes anteriores mordem, incluindo AMV3
  agora medindo componentes da malha agrupada em vez de depender de BoxGeometry.
  Os três novos mutantes do agrupamento/guarda/Float32 também mordem MAP1/MAP6.
- Cinco GLBs novos/reutilizados: Khronos zero erros, sete avisos reportados.
- Menu real em 8157 e 8156: abertura→singleplayer→facção→personagem→adversário→live.
  Thumbnail 960×640 carregado na seleção; zero pageerrors. Provas `menu-feedback-*`.
- Build Astro passou. `check:fast` inicial 101/104; mapa-id tinha varrido o snapshot
  arquivado e foi corrigido com escopo explícito + mutante. `docsautoria` exige
  documentação commitada; revalidado após checkpoints. `docs:check` e `arch:check`
  também passaram. Os reruns resolvem dois dos três checks inicialmente vermelhos;
  a lista completa não foi repetida. `audio:check` mantém o
  bloqueio herdado de manifest local defasado, fora desta rodada de mapa.
- Crítico visual independente: 8/10, aprovado no recorte solicitado, sem regressão
  bloqueante visível. Ainda vê enquadramento da mata obstruído por tronco e
  sub-bosque esparso, ambos herdados. Não equivale a aceite de FPS/publicação.
  Relatórios: `feedback-independent-review.md`, `feedback-final-visual-review.md`.

## Custo medido e limites

Comparação controlada com builder 97eeb516 e **todos os assets carregados em ambos**.
Mesmos sete pontos/FOV/runtime por qualidade. Soma dos passes capturados:

| Qualidade | Chamadas antes→depois | Triângulos antes→depois |
|---|---:|---:|
| Médio |3403→2935 (−13,8%)|9375441→8927614 (−4,8%)|
| Baixo |2370→1901 (−19,8%)|5830098→5534637 (−5,1%)|

Trata-se de soma de sete frames distintos, não de um frame nem de FPS. Algumas
câmeras têm custo maior por causa da mata adicional; não se reivindica melhora
uniforme. O mundo med contém 932.603 triângulos contra 981.489 antes; low contém 859.902.
Colisores aumentam com as varandas/guardas: o merge reduz desenho, não o custo
linear de colisão/raycast. A fluidez final precisa de teste humano ou janela
exclusiva de GPU; outros trabalhos permaneceram ativos. Dados por câmera:
`feedback-performance.json`, `feedback-controlled-before{,-low}/capture.json`.

O portão genérico mapa-novo continua com ORT1/ALT1/SUP1 pendentes, como na revisão
anterior (critérios de favela/representação Node; o merge também altera a leitura
de massa). Não se reivindica aprovação integral desse portão. JOG1/JOG2 estão
limpos. As capturas e referências anteriores continuam no relatório anterior;
esta rodada não reescreve a história nem transforma o sinal verde em autorização
para publicar.
