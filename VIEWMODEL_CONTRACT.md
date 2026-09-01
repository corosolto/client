# Contrato dos viewmodels golden: AK e pistola

Este é o contrato normativo dos viewmodels golden do CoroSolto. A AK é a referência aprovada;
a pistola é a segunda candidata técnica e ainda depende da revisão de gameplay do dono. Arma
pesada e o restante do arsenal ficam fora do lote atual.

Os princípios gerais e o histórico do caminho reprovado ficam em
[`docs/development/VIEWMODEL-1P-PROFISSIONAL.md`](docs/development/VIEWMODEL-1P-PROFISSIONAL.md).
A decisão da fonte canônica está em
[`docs/reports/GOLDEN-AK-DECISION.md`](docs/reports/GOLDEN-AK-DECISION.md).
A decisão específica da pistola está em
[`docs/reports/GOLDEN-PISTOL-DECISION.md`](docs/reports/GOLDEN-PISTOL-DECISION.md).

## Escala, jogador e câmeras

| Invariante | Contrato | Fonte reproduzível |
|---|---|---|
| Unidade | Uma unidade de mundo é um metro. O rig golden conserva escala raiz uniforme `2,392897`, fixada pelo encaixe mão–AK; ela não varia entre clips nem é reaplicada no JavaScript. | `node tools/eval/ak-viewmodel-contract.mjs` |
| Jogador em pé | O olho fica a 1,62 m do piso; agachar e aterrissar são deltas do runtime, não mudanças de escala do asset. | `rg -n 'const eye =' public/js/game.js` |
| AK no mundo | A referência de comprimento da AK é 0,88 m. O viewmodel pode cortar a coronha atrás do olho, mas não reescalar peças durante uma ação. | `rg -n '^  ak:' public/js/weapons.js` |
| Câmera do mundo | VFOV de quadril de 70°, definido pelo jogo. | `rg -n 'new THREE.PerspectiveCamera\(70' public/js/game.js` |
| Câmera do viewmodel | `AK_Hires_FP_Camera`, VFOV 58°, exportada no GLB. O runtime usa esta lente e matriz; não existe um segundo enquadramento escrito à mão. | `node tools/eval/ak-viewmodel-contract.mjs` |
| Câmera da pistola | Base de 60° em 16:9, normalizada pelo runtime para preservar a meia-tangente horizontal; no quadro normativo 3:2 mede 68,765°. | `node tools/eval/pistol-viewmodel-contract.mjs` |
| Enquadramento autorado | A câmera é deslocada 0,23 m no eixo lateral local e 0,08 m no eixo vertical local durante o build; o runtime não reaplica esses offsets. | `artifacts/viewmodels/golden-ak/build-final-v2/build-report.json` |
| Aspecto | 3:2 é o quadro normativo de aprovação. Em outros aspectos, o runtime deriva o VFOV da lente e do aspecto exportados, preservando a meia-tangente horizontal conforme o C6 vigente. | [`tools/eval/BAR-CONSISTENCIA.md`](tools/eval/BAR-CONSISTENCIA.md) C6 |

Em quadril, a caixa de braços mais arma começa em `x/W ∈ [0,50; 0,66]`, começa em
`y/H ≥ 0,45` e deixa livre o quadrado central de ±8%. Esses limites vêm das seis imagens
medidas em [`tools/eval/BAR-CONSISTENCIA.md`](tools/eval/BAR-CONSISTENCIA.md), seção 2.6,
e são reproduzidos por `tools/eval/vm-gauntlet.mjs`. Durante as ações, nenhum pixel pode
encostar no topo: o gate exige margem mínima de 8 px. A linha de base publicada deixa 43 px,
enquanto `mutante-final-v6-topo/relatorio.json` mede 0 px; ambos são reproduzidos pelo mesmo
script em 1440 × 960.

## Pacote canônico

- Fonte Blender reproduzível: `tools/blender/viewmodels/build_ak_hires_pilot.py`.
- GLB servido: `public/models/viewmodels/coro/ak-hires.glb`.
- Um único skin: `coro_solto_hires_fp_rig`.
- Câmera: `AK_Hires_FP_Camera` dentro do mesmo GLB.
- Geometria visível: braços/luvas/manga do projeto, AK do projeto, carregador instalado,
  carregador de reposição e ferrolho. Geometria ou material visual do doador é proibido.
- O rig exporta escala raiz uniforme `2,392897`, sem escala animada. Aplicar esse transform
  destrói o encaixe medido e é proibido. Peças rígidas são dirigidas pelos ossos
  `Rifle_metarig`, `Mag_metarig`, `Mag.001_metarig`, `Bolt_metarig` e `Trigger_metarig`.
- A orientação canônica é a câmera exportada olhando para o eixo de tiro autorado. Espelho,
  rotação e escala de correção no JavaScript reprovam a verdade Blender → GLB → runtime.

## Anatomia e contato

- A mão forte permanece fechada no cabo em todos os frames. Polegar, médio, anelar e mínimo
  envolvem o volume; o indicador repousa no gatilho e tem compressão/retorno legível em
  `Shoot`.
- A mão de apoio permanece no guarda-mão em `Idle`, `Equip` e `Shoot`. Em `Reload`, ela só
  pode soltar o guarda-mão para possuir o carregador ou operar o ferrolho.
- O erro palma/ponto de contato é no máximo 1 cm em cada amostra de dois frames, conforme o
  C7. Distância global entre “alguma mão” e “alguma arma” não vale como prova.
- Ombro, cotovelo e pulso preservam volume. Nenhum braço pode atravessar o quadrado central,
  subir acima da caixa permitida ou mudar de comprimento entre clips.
- O fim de cada clip precisa coincidir com a pose inicial do `Idle` sem salto visível. O
  erro por track não pode passar de 1° de rotação, 5 mm de translação ou 0,01 de escala.
  Esses tetos são executados por `tools/eval/ak-viewmodel-contract.mjs`; o relatório
  `artifacts/viewmodels/golden-ak/build-final-v2/contract-public-v2.json` traz a medida do
  GLB publicado. O contact sheet inclui os frames intermediários; primeiro e último frame
  não bastam.

## Personagem e materiais

O piloto usa um conjunto fixo: luvas integrais, manga Mandrake e braços do rig golden. Como a
luva cobre a mão inteira, pele exposta não é sintetizada. Se uma revisão abrir punho ou dedo,
a pele precisa virar uma superfície própria `CoroSolto_FP_Skin`, alimentada pelo mesmo perfil
de personagem.

- O piloto golden preserva os fatores de base e os normal maps embutidos de luva e manga.
  Não depende do tint nem das texturas compartilhadas do personagem no runtime. Uma futura
  variação por personagem exige novo contrato e nova captura.
- A AK preserva base color, normal e ORM exportáveis em glTF. Metal não recebe tint de roupa.
- Nenhum shader exclusivo do Blender entra como requisito visual. O render aprovado usa o
  subconjunto Principled compatível com GLB e precisa coincidir com Three.js sob o rig de luz
  do jogo.
- Malha sem material, textura ausente, placeholder visível, superfície lavada ou continuidade
  quebrada entre manga e luva reprovam.

## Estados e cadência

| Estado do jogo | Clip GLB | Cadência |
|---|---|---|
| `draw` | `Equip` | 1,0 s até a pose de `Idle`; fonte: `VM_FAMILY.ak.cs16.draw` |
| `idle` | `Idle` | loop ativo estável de 3,333 s, sem ação concorrente |
| `fire` | `Shoot` | clip de 0,433 s; cada tiro real reinicia a ação e a AK mantém ciclo de gameplay de 0,1 s |
| `reload` | `Reload` | ajustado à recarga de gameplay da AK, 2,5 s |

Os valores são reproduzidos por `node tools/eval/ak-viewmodel-contract.mjs` e por
`rg -n "ak:.*rate:|ak:.*reload:" public/js/data/weapons.js`. Alterar a cadência exige nova
captura intermediária e atualização da fonte, não um número duplicado em outro documento.

O `Equip` é amostrado em 0%, 25%, 50%, 75% e 99,9%: começa fora do quadro, entra de baixo
e termina em `Idle`, sem piscar a pose pronta antes do saque. O `Shoot` usa as mesmas cinco
frações e precisa deslocar o centro da arma em pelo menos 4% da diagonal da arma. A base
aprovada mede 9,2%; o estado reprovado anterior media 0,9% em
`gauntlet-before-critic-fixes/relatorio.json`. Fonte e reprodução:
`tools/eval/vm-gauntlet.mjs` e `gauntlet-final-v7/relatorio.json`, ambos sob
`artifacts/viewmodels/golden-ak/`.

## Carregador e peças móveis

- O carregador instalado e o de reposição são duas peças reais. Uma troca pode ocorrer apenas
  fora do quadro; nunca por encolhimento visível ou salto no meio da tela.
- Enquanto visível, a escala do carregador é unitária e constante. Ocultação usa a fase já
  autorada fora do quadro e não pode ser percebida como mudança de tamanho.
- A evidência da recarga mostra, no mínimo: contato antes da remoção, saída, transporte,
  aquisição do carregador novo, inserção, assentamento e retorno da mão ao guarda-mão.
- A trajetória do carregador e da mão é contínua nos frames intermediários. A arma não pode
  perseguir um carregador parado no mundo.
- O ferrolho completa puxada e retorno após o carregador assentar. O pente precisa estar
  visível como peça independente nos frames críticos medidos pela sonda.
- Entre 60% e 68% de `Reload`, o ferrolho percorre no mínimo 30 mm e, em 76%, retorna com
  erro máximo de 2 mm. O GLB publicado mede 41,31 mm e 0 mm, respectivamente, no relatório
  estrutural; o mutante `--mutante-ferrolho-estatico` prova que a régua reprova curso zero.

## Exportação e reprodução

O build aprovado produz `.blend`, GLB e renders de QA a partir do doador local e da AK do
projeto. O GLB final contém um skin, a câmera e exatamente os quatro clips canônicos. Ações
ativas e NLA não podem acrescentar clips, prolongar ranges ou tocar duas ações concorrentes.

Build reproduzível:

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b \
  --python tools/blender/viewmodels/build_ak_hires_pilot.py -- \
  --doador=/Users/ruben/Downloads/ak-12animated.glb \
  --arma=public/models/weapons/ak.glb \
  --saida=artifacts/viewmodels/golden-ak/build-final-v2 \
  --publicar
```

O relatório `artifacts/viewmodels/golden-ak/build-final-v2/build-report.json` ancora os hashes
dos dois insumos e do GLB. O hash do produto e de `public/models/viewmodels/coro/ak-hires.glb`
é o mesmo no relatório; `--publicar` é a única opção que copia o resultado para o caminho
servido.

No runtime, o carregador escolhe a chave golden somente para `ak`; as demais armas continuam
no caminho anterior. O `AnimationMixer` toca os clips do próprio GLB. A câmera incorporada é
normalizada uma vez para o espaço da `vmScene`; offsets específicos da AK ficam vazios.

## Portões de aprovação

1. `tools/eval/ak-viewmodel-contract.mjs`: câmera, rig, clips, escala do pente, dedos e
   mutantes estruturais.
2. `tools/eval/vm-gauntlet.mjs --armas=ak --modo=golden`: jogo real em 3:2; duas mãos,
   enquadramento, centro livre, carregador, saque e recoil legíveis.
3. Contact sheet do GLB reimportado e contact sheet do jogo, com `draw`, idle prolongado,
   rajada, recarga completa, caminhada, corrida, salto e proximidade de parede.
4. Comparação do mesmo frame Blender × navegador: lente, caixa e pose precisam coincidir.
5. Crítico adversarial de contexto limpo. Quem constrói não libera.

Evidência aprovada desta versão:

- build publicado: `artifacts/viewmodels/golden-ak/build-final-v2/build-report.json` e
  `contract-public-v2.json` no mesmo diretório;
- GLB público reimportado: `artifacts/viewmodels/golden-ak/offline-final-v2/contact-sheet.png`;
- detalhe mecânico da recarga: `artifacts/viewmodels/golden-ak/offline-reload-detail-v2/contact-sheet.png`;
- jogo real: `artifacts/viewmodels/golden-ak/runtime-final-v11/contact-sheet.png` e
  `runtime-report.json` no mesmo diretório;
- régua visual: `artifacts/viewmodels/golden-ak/gauntlet-final-v7/relatorio.json`;
- mutantes visuais: `mutante-final-v6-draw-idle/`, `mutante-final-v6-tiro-estatico/`,
  `mutante-final-v6-topo/`, `mutante-final-v6-sem-pente/` e `mutante-final-v6-centro/`,
  dentro de `artifacts/viewmodels/golden-ak/`;
- smoke do fluxo jogável: `artifacts/viewmodels/golden-ak/smoke-final/report.json`.

A AK só fica `ready` se todos os portões estiverem verdes e as imagens não mostrarem defeito
anatômico ou mecânico. Um portão verde contra uma reprovação visual abre defeito na régua.

## Candidata técnica: pistola

A pistola usa a família licenciada X18/G18, construída por
`tools/blender/viewmodels/build_paid_family.py` e assada por
`tools/viewmodels/assemble_paid_family.mjs`. O produto servido é privado:
`/private-assets/viewmodels/pistol/pistol-runtime.glb`, chave `pistol#pistol`. Braços e arma
ficam em skins separados de 67 e 8 joints. Os estados canônicos são `idle`, `shoot`,
`reload_tactical` e `reload_empty`; `draw` é o arco procedural da família de pistola.

O frame-base é `x=0,150`, `y=-0,015`, `z=-0,200`, rotação `[-9°, 12°, -2°]`, base de FOV
60° e `drawDrop=0,34`. O idle precisa iniciar a caixa completa em
`x/W ∈ [0,50; 0,66]` e `y/H ≥ 0,45`, sem invadir o centro. Em 1440 × 960, a base mede
`(0,5965; 0,4906)` e deixa o centro livre.

O tiro desloca o centro da arma em pelo menos 4% da própria diagonal; a base mede 11,5%. Na
recarga, o corpo da arma pode percorrer no máximo 55%, o pente precisa percorrer ao menos 12%
e a mão de apoio precisa chegar a no máximo 24 px dele quando destacado. A base mede,
respectivamente, 22%, 97% e 0 px. O pente possui 1.257 vértices dominados pelo joint `Mag`;
sua excursão local calibrada fica entre 18 e 24 unidades e o corpo da arma não acompanha a
translação.

As texturas compartilhadas sempre são regeneradas dos PNGs licenciados: base/ORM em
1024 × 1024 e normal em 2048 × 2048. Um GLB já otimizado nunca pode ser fonte dessas imagens.

Build reproduzível:

```bash
python3 tools/viewmodels/build_paid_catalog.py --family pistol
node tools/viewmodels/optimize_paid_family.mjs
node tools/viewmodels/validate_paid_catalog.mjs
```

Portões específicos:

1. `node tools/eval/pistol-viewmodel-contract.mjs
   --runtime-report=artifacts/viewmodels/golden-pistol/runtime-final/runtime-report.json` valida
   arquivo, rota, câmera, clips, materiais, texturas e SHA servido.
2. `node tools/eval/vm-gauntlet.mjs --modo=kinemation --armas=pistol --largura=1440
   --altura=960` mede o jogo real. Os seis mutantes visuais descritos em
   `docs/reports/GOLDEN-PISTOL-DECISION.md` precisam ficar vermelhos.
3. `artifacts/viewmodels/golden-pistol/runtime-final/contact-sheet.png` cobre draw, idle,
   fire, nove fases da recarga, corrida, salto, espaço estreito e parede.
4. A AK precisa continuar verde no mesmo gauntlet antes de qualquer liberação.

Somente a AK está aprovada pelo dono. A pistola pode permanecer `ready` para revisão local,
mas não autoriza expandir o restante do arsenal até receber aprovação visual explícita.
