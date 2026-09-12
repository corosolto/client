# Lajes V6: só a praça pode ser ampla

O dono rejeitou os prints da V5 em 6 de setembro de 2026: “as ruas tem que ser super estreitas igual favela so o campo do meio do mapa que é largo e só”. A régua V5 só media os becos laterais e não enxergava as avenidas centrais nem os pátios dos spawns. Verde naquela régua não significava cumprimento desse pedido.

## Medição antes do conserto

Baseline `1621a6d8`, builder V5 sem alterações de produção:

```sh
PATH=/opt/homebrew/bin:$PATH node tools/eval/lajes-ruas-check.mjs \
  --json=artifacts/lajes-visual/v6/gates/ruas-v5-red.json
```

- **LRU1 vermelho:** 2.738 de 4.795 pontos térreos fora da praça excedem o raio livre de 1,45 m. Máximo físico 5,510 m e visual 5,51000023 m: cabe um disco de 11,02 m de diâmetro nos pátios dos spawns. Exemplo `x=-2,25; z=26,25`.
- **LRU2 verde:** zero divergências em que a parede física fica mais de 0,30 m à frente da seção visual.
- **LRU3 verde:** 1.199 amostras das três rotas, zero bloqueadas para o corpo real de raio 0,38 m.

Evidência completa em `artifacts/lajes-visual/v6/gates/ruas-v5-red.{json,log}`; a cópia do builder observado fica em `map-v5-baseline.js` na mesma pasta. O JSON registra o hash SHA-256 do builder, todos os pontos e as 24 piores posições para captura no navegador.

## O que significa o limite

O raio máximo de 1,45 m é uma **escolha de geometria de jogo** para materializar o pedido do dono. Não é uma medida extraída de fotografia nem uma estatística sobre favelas: as fotos de RJ/SP não têm calibração métrica. Ele permite corredores de aproximadamente 1,8–2,0 m e os acessos de escada de 2,4 m já existentes; no cruzamento de dois corredores de 2 m, a distância ao canto é aproximadamente 1,414 m.

A praça declarada em `world.praca` (`x=-5,1…5,1; z=-7,5…7,5`) é a única exceção, com 1 m de transição em cada borda. Essa margem admite a boca do beco junto ao campo; não isenta nenhum corredor inteiro ou spawn.

## Instrumento e suas réguas irmãs

`tools/eval/lajes-ruas-check.mjs` percorre uma grade de 0,5 m por **todos os limites jogáveis**, sem escolher apenas rotas ou vistas favoráveis. Usa `Game._collide` e `groundHeightAt` reais para selecionar pontos térreos onde o corpo cabe. Não descarta bolsões isolados: eles também são medidos se houver piso e corpo livre.

- **LRU1:** em cada ponto mede a distância mínima em 360° à face de um sólido que cruza a altura dos olhos (1,62 m), incluindo caixas orientadas, e à geometria visual nessa mesma altura. A seção das malhas é calculada por interseção dos triângulos reais com o plano horizontal; não se confunde a caixa delimitadora de um objeto com uma parede. Ambas precisam estar dentro do limite. Mesas baixas e jardineiras não estreitam artificialmente a rua à altura dos olhos.
- **LRU2:** compara as distâncias físicas e visuais em todos esses pontos, além de cortes nas quatro direções cardinais quando há sólido até 3 m. Se uma barreira física aparenta reduzir a largura sem malha correspondente, reprova. A tolerância de 0,30 m admite saliências de portas, pilares e pequenos detalhes; não autoriza paredes invisíveis para fechar clareiras. O corte direcional é necessário porque uma parede lateral próxima pode esconder, na distância mínima, uma barreira invisível no sentido longitudinal.
- **LRU3:** percorre todas as três rotas declaradas em segmentos de até 0,19 m usando novamente `Game._collide`, cobrando apoio no chão. Encher os caminhos de obstáculos para melhorar LRU1 viola LRU3. A conectividade de todos os spawns, cobertura da navegação e trajetos físicos no navegador permanecem a cargo das réguas existentes e do teste de percurso.

Falta de builder, praça, rotas, seção visual ou amostragem suficiente reprova explicitamente. O custo observado no baseline foi aproximadamente 6 s; a seção horizontal evita raycasts repetidos contra toda a cena.

## Teste do teste

Os mutantes alteram objetos efetivos em memória, sem editar arquivos de produção. Exigem uma alteração aplicada; código de saída 1 sozinho não prova que um mutante foi morto: o relatório também deve conter `mutation` e a cláusula esperada vermelha.

```sh
node tools/eval/lajes-ruas-check.mjs --mutante=abrir-rua-central --json=artifacts/lajes-visual/v6/gates/mutante-abrir-rua-central.json
node tools/eval/lajes-ruas-check.mjs --mutante=barreira-invisivel --json=artifacts/lajes-visual/v6/gates/mutante-barreira-invisivel.json
node tools/eval/lajes-ruas-check.mjs --mutante=rota-bloqueada --json=artifacts/lajes-visual/v6/gates/mutante-rota-bloqueada.json
```

`abrir-rua-central` remove sólidos centrais da metade norte: LRU1 deve reprovar a abertura física mesmo que a fachada visual continue lá. Os dois outros mutantes introduzem um sólido alto sem malha sobre uma testemunha antes livre da rota: LRU2 e LRU3 devem perceber respectivamente a barreira invisível e a obstrução.

Na V5, `barreira-invisivel` já transformou as cláusulas irmãs antes verdes em vermelho: LRU2 passou de zero para 151 divergências e LRU3 de zero para oito pontos bloqueados. Evidência `artifacts/lajes-visual/v6/gates/ruas-v5-mutante-invisivel.{json,log}`. Isso comprova essas detecções específicas, mas não substitui repetir todos os mutantes sobre uma V6 inicialmente verde.

## Validação V6

Na primeira geometria V6, a mesma inserção de barreira mostrou uma cegueira da comparação apenas por distância mínima: LRU3 detectava a obstrução, mas a parede lateral próxima mantinha LRU2 verde. A régua foi corrigida para comparar também as quatro direções. A produção não foi alterada para fazer esse mutante funcionar.

Com o instrumento completo, `ruas-v6-final.{json,log}` mostra **LRU1/2/3 verdes**: 1.148 pontos térreos medidos fora da praça, nenhum amplo, raio máximo físico 1,08706026 m e visual 1,08706040 m; 2.264 cortes direcionais, nenhuma divergência física/visual; 1.194 amostras de rota, nenhuma bloqueada. O limite de 1,45 m não foi alterado.

Os três mutantes foram aplicados sobre essa V6 verde:

| Mutante | Efeito observado |
|---|---|
| `abrir-rua-central` | LRU1 vermelho: 622 pontos inválidos, raio físico máximo 5,43737069 m |
| `barreira-invisivel` | LRU2 vermelho: 24 cortes divergentes; LRU3 também acusa 14 pontos bloqueados |
| `rota-bloqueada` | LRU3 vermelho: 14 pontos bloqueados; LRU2 também acusa 24 cortes divergentes |

Os dois últimos nomes exercitam o mesmo sólido inserido, com cláusulas irmãs diferentes; não são anunciados como defeitos geométricos independentes. JSONs/logs `mutante-*.{json,log}` na pasta `v6/gates` contêm a testemunha antes livre e o efeito da mutação.

A régua lateral `lajes-identidade-check.mjs` foi **apertada** de 1,8–2,8 m para **1,8–2,2 m**, coerente com o novo alvo de corredores de 2 m. Não houve redução do mínimo: a V6 já mede 2,05–2,10 m entre sólidos e 1,8425–2,10 m na malha, portanto não existe evidência que justifique permitir 1,5 m. `identidade-final.{json,log}` preserva LID1–4 verdes; LID4 continua sendo somente registro do céu e exige o navegador para certificar os GLBs reais.

## O que este instrumento não aprova

A grade tem resolução finita; não é uma prova contínua de cada milímetro. A geometria procedural existe no arnês Node, mas os GLBs carregados, a iluminação, os materiais e a perspectiva precisam de navegador. O JSON fornece `worst` para o responsável pela rodada capturar e inspecionar as piores posições, além de repetir os prints de spawn, acesso ao campo e becos. A ausência de uma captura verdadeira nunca vira aprovação visual. A régua não substitui a crítica adversarial nem a aceitação do dono.

Integração em `package.json`, captura visual e resultados V6 finais ficam com o responsável pela implementação, evitando edições concorrentes fora dos dois arquivos desta subtarefa.
