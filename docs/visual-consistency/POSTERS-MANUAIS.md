# Cartazes manuais — régua `manual-poster-placement-check`

Gate: `node tools/eval/manual-poster-placement-check.mjs` (mapas `praca_poderes`, `posto_treta`).

Praça também é medida em default, `?bigscale=0` e `?minsq=0`, com geometria real
do ministério: quatro arquivos originais, uma posição por arquivo e dois cartazes
por lado. Essa cobertura adicional cobra inventário, unicidade e forma/nome;
não aprova suporte ou overlap no small, que ainda conserva o afastamento legado
de0,3m. Os checks completos de suporte/overlap do nominal permanecem separados.
O fallback sem ministério é medido antes de carregar a fixture: zero cartazes
significa ausência de geometria, sem aceite de arte ou inventário vazio verde.

## Contrato
- **CONTAGEM_MANUAL** — mínimo 4 cartazes na Praça, 1 outdoor no Posto.
- **NOME_CANONICO** — mesh nomeada `poster:<arquivo>`; é assim que o `graffiti_pass`
  (artesPresentes) reserva o arquivo no bake e evita repetição.
- **UNICO_ARQUIVO** — cada arquivo de poster aparece em 1 posição por mapa, contando a
  malha desenhada E o inventário assado (`userData.graffitiPecas`, campo `f` =
  `poster:<arquivo>`). As duas representações da MESMA peça são unificadas somente
  quando o quad inteiro coincide (`x/y/z/ry/w/h`) dentro da quantização; mesmo arquivo
  e mesmo centro com dimensões diferentes continua sendo rival.
- **SUPORTE** — `criarSuporteGrafite(root, gradeEspacial, mesh)` com `ignorarMesh` = o
  próprio cartaz: parede opaca a ≤ `GRAFFITI_SUPPORT_DISTANCE` atrás do quad TODO.
- **SEM_OVERLAP** — cartaz manual não sobrepõe outra arte coplanar (outro manual ou
  qualquer peça do bake), exceto a sua própria representação assada.

## Coleta
- A coleta exige mesh e material desenháveis: `visible !== false`, `colorWrite !== false`
  e pais visíveis. Opacidade zero só elimina material transparente com blending
  normal; material opaco ou `NoBlending` ainda pode desenhar RGB. Esconder o
  material reduz `CONTAGEM_MANUAL`.

## Tolerâncias e procedência
- O bake quantiza peças com `r3` (mm / mrad): **EPS_GEOM = 1e-3 m** e **EPS_ANG = 1e-3
  rad** são exatamente o passo de quantização — cobrem o erro Float32 (≤2e-5 m a 90 m)
  com margem e são ~100× menores que qualquer deslocamento real entre artes distintas
  (mutantes movem ≥0,10 m; menor cartaz ~0,85 m).
- **SEP_PLANO = 2 × GRAFFITI_SUPPORT_DISTANCE (0,10 m)**: usado apenas no teste de
  coplanaridade do SEM_OVERLAP — dois quads apoiados na mesma parede ficam no máximo
  2× o afastamento de parede afastados ao longo da normal. NÃO é banda de união de
  peças no UNICO_ARQUIVO (união é por identidade).
- `retanguloGrafiteDesenhado` lê os vértices Float32 realmente desenhados; peça de
  bake `poster:` com campos não finitos reprova como `UNKNOWN_FORMATO` (fail-closed).

## Mutantes (`--mutante=`), modo selftest exit 0
| mutante | mutação REAL | cláusula exigida |
|---|---|---|
| `arte-repetida` | clona o mesh do cartaz e desloca 1 largura na parede; a re-coleta encontra o clone | `UNICO_ARQUIVO` |
| `afastado` | move o cartaz 12 cm para fora da parede; a re-coleta mede a nova geometria | `SUPORTE` |
| `sobreposto` | teleporta um cartaz de Praça sobre outro; a re-coleta mede o novo plano | `SEM_OVERLAP` |
| `peca-encolhida` | acrescenta no metadata produtor um bake do mesmo arquivo/centro com w/h menores | `SEM_OVERLAP` |
| `material-escondido` | esconde o material dos cartazes manuais da Praça e re-coleta a cena | `CONTAGEM_MANUAL` |
| `modulo-ministerios` | reintroduz na fonte a seleção por módulo; o small volta a desenhar8cartazes com arquivos repetidos | `UNICO_ARQUIVO` |

Mutante que não aplica (throw), que passa verde ou desconhecido → exit 1. Sem
`--mutante`, baseline: VERDE exit 0, reprovações exit 1. Opção não reconhecida,
mais de uma opção ou valor vazio: usage e exit2.

Baseline 31/10/2026: VERDE; 5 mutantes reprovando na cláusula certa; `--mutante=xyz`
exit 1. Logs de execução ficam no audit da rodada.

Root repetiu baseline+5mutantes e CLI em31/10/2026. Cópia intacta fora do
checkout passou; remover a comparação de dimensões deixou `peca-encolhida`
sobreviver; remover material.visible deixou `material-escondido` sobreviver.
Ambos falharam por `PASSOU VERDE`, sem precondição circular de coleta. As guardas
de aplicação conferem o estado físico mutado antes do aceite. Fotos reais e bake
final ainda pendentes nesta conferência.

Rodada R88 de01/11: antes, small com8cartazes e quatro arquivos duplicados;
depois, quatro artes únicas e balanço2/2 nas três queries. Descritores default
e minsq0 permaneceram exatos. O mutante de fonte reproduziu os seis REDs do
small, e o controle herdado arte-repetida continuou detectado. São provas Node22
com imagens da fixture representadas por metadata, sem aprovação visual.
