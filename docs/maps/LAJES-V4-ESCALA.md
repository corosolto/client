# Lajes V4 — escala arquitetônica medida

A redução global de `lajes_casa_01..07` não produz casas térreas: os GLBs já contêm composição vertical, e a escala uniforme encolhe também seus elementos internos. Para o primeiro plano da V4, a opção local mais controlável é reutilizar o **corpo c1 authored, 4,40 × 6,75 × 2,80 m**, com porta/janela dimensionadas separadamente. O GLB completo `lajes_modulo_c` tem 7,10 m de altura e **não** é esse corpo isolado. Nenhum dos módulos a–e completos é térreo.

Estado: pesquisa e medição concluídas em 06/09/2026, branch `codex/lajes-visual`. Referência de código anterior ao redesenho: HEAD `b3afbcb1`; o builder evolui em paralelo. Este documento não aprova aparência, colisão, navegação ou FPS. Não houve render, browser, importação de mídia ou alteração de produção nesta medição.

## Evidência reproduzível

- Script: [`measure.mjs`](../../artifacts/lajes-visual/v4-scale/measure.mjs).
- Resultado completo, com SHA-256, bytes e primitivas: [`measurements.json`](../../artifacts/lajes-visual/v4-scale/measurements.json), timestamp `2026-09-06T01:58:43.107Z`.
- Execução: `PATH=/opt/homebrew/bin:$PATH node artifacts/lajes-visual/v4-scale/measure.mjs`.
- Método: leitura dos vértices indexados do GLB, transformações da hierarquia da cena e união dos limites, usando apenas matemática do Three.js vendorizado. Sem renderer. W=X, D=Z, H=Y; dimensões arredondadas a três casas. A interpretação em metros é a convenção do jogo, não certificação da escala do autor original. AABB inclui canos, beirais e ferragens; **altura total não equivale a pé-direito**.

## Kit legado

| Arquivo em `public/models/props/` | W | D | H | W/H | D/H | Triângulos | W após H=2,70 |
|---|---:|---:|---:|---:|---:|---:|---:|
| lajes_casa_01.glb | 2,300 | 6,448 | 6,148 | 0,374 | 1,049 | 1.883 | 1,010 |
| lajes_casa_02.glb | 2,200 | 6,224 | 4,203 | 0,523 | 1,481 | 1.354 | 1,413 |
| lajes_casa_03.glb | 2,369 | 4,566 | 6,746 | 0,351 | 0,677 | 7.014 | 0,948 |
| lajes_casa_04.glb | 2,528 | 6,419 | 6,648 | 0,380 | 0,966 | 1.827 | 1,027 |
| lajes_casa_05.glb | 2,323 | 6,255 | 6,111 | 0,380 | 1,024 | 891 | 1,026 |
| lajes_casa_06.glb | 2,300 | 4,332 | 6,333 | 0,363 | 0,684 | 750 | 0,981 |
| lajes_casa_07.glb | 2,200 | 6,532 | 6,181 | 0,356 | 1,057 | 2.942 | 0,961 |

Os nós apresentam componentes em bandas verticais de aproximadamente 2 m, repetidas em alturas como 0–2, 2–4 e 4–6 m. Isso demonstra composição empilhada; não identifica, por si só, o vão de uma porta ou um piso habitável. Nomes genéricos `Object_*` e materiais numéricos não permitem certificar portas ou peitoris individuais por metadata.

No builder anterior à V4, o fallback de casas rasas 03/06 usava `targetH=2.70`. A transformação `s=targetH/nativeHeight` produz larguras de **0,948/0,981 m** e transforma um componente de 2 m em **0,801/0,853 m**. Mesmo H=5,15 leva as larguras a somente 1,809/1,870 m e os componentes a 1,527/1,626 m. O problema não se resolve apenas aumentando a altura global: é necessário selecionar um pavimento ou reconstruir a fachada mantendo escala humana.

Procedência: extras dos GLBs atribuem **Modular Slums, lexferreira89, CC-BY-4.0**; extração em `tools/blender/extract_favela_houses.py`. Página do autor: [Modular Slums](https://sketchfab.com/3d-models/modular-slums-e2b6f532e1fe4f7280890971d78183f4). Preservar atribuição se reutilizado.

## Alternativas locais

| Caminho em `public/models/props/` | W × D × H | Triângulos | Uso/limite |
|---|---|---:|---|
| lajes_modulo_a.glb | 7,780 × 7,981 × 6,620 | 8.240 | Três fachadas adjacentes, corpos de dois pavimentos |
| lajes_modulo_b.glb | 7,480 × 7,731 × 6,620 | 6.052 | Corpo b1 térreo inserido em composição com vizinho e fundos altos |
| lajes_modulo_c.glb | 8,695 × 7,991 × 7,100 | 5.516 | Corpos térreos c0/c1 + terraço, volume superior e ferragens |
| lajes_modulo_d.glb | 7,690 × 7,731 × 6,620 | 4.512 | Loja, pilotis e volume superior; não térreo isolado |
| lajes_modulo_e.glb | 7,420 × 7,975 × 6,500 | 2.168 | Composição inferior/superior e laje; não térreo isolado |
| lajes_casa_tijolo.glb | 14,136 × 13,352 × 10,000 | 9.914 | Sem autoria/licença identificadas no metadata examinado |
| lajes_casa_escada.glb | 8,946 × 8,084 × 6,000 | 10.546 | Sem autoria/licença identificadas no metadata examinado |
| lajes_bloco_tijolo.glb | 6,928 × 4,810 × 4,000 | 12.562 | Sem autoria/licença identificadas no metadata examinado |
| fav_brasileira.glb | 11,521 × 15,505 × 14,929 | 780 | Conjunto completo; nenhuma unidade térrea certificada |
| fav_modular.glb | 17,250 × 6,590 × 6,746 | 16.661 | Kit de origem das casas legadas; composição inteira |
| fav_house.glb | 8,035 × 6,723 × 6,723 | 1.070 | CC-BY-NC-4.0; não usar como alternativa liberada |

Os módulos a–e têm autoria **CS BRASIL project**, fonte `tools/blender/build_lajes_authored_kit.py` e licença **AGPL-3.0-only** registrada em `scene.extras`. São reutilizáveis no projeto com controle geométrico pela fonte. O script junta objetos antes de exportar; o GLB otimizado contém um mesh com primitivas por material e nomes deduplicados. AABB de material pode reunir várias janelas: não é medida de uma janela individual. Preferir exportar a unidade a partir do script a recortar um GLB por nomes que já foram perdidos.

`fav_brasileira` atribui iagoDev, CC-BY-4.0 ([página](https://sketchfab.com/3d-models/favela-brasileira-b9797c38e4e645b39f0cda8c05bebd5f)). `fav_house` atribui SnowziN2, CC-BY-NC-4.0 ([página](https://sketchfab.com/3d-models/favela-house-333a62c2d46e4b748d6a87a47266e3ed)). O arquivo de recibo em `props/favela_house/` descreve geração text-to-model separada; não foi demonstrada relação com os três arquivos `lajes_*tijolo/escada`, portanto sua procedência não deve ser transferida por semelhança de nome.

## Unidade authored reutilizável e defeitos concretos

Medidas abaixo vêm de `facade_unit()` e `module_b/module_c()` no script Blender, conferidas onde separáveis nos limites das primitivas do GLB. Z do Blender vira Y no GLB.

| Elemento | Medida da fonte | Decisão |
|---|---|---|
| Corpo c1 | W4,40 × D6,75 × H2,80 | Melhor candidato térreo de largura 4–7 m; isolar da composição c |
| Corpo c0 | W3,20 × D6,20 × H2,80 | Unidade estreita opcional, não a fachada principal solicitada |
| Corpo b1 | W3,70 × D3,00 × H2,75 | Não atinge largura 4 m; não confundir com bbox do módulo b |
| Recesso de porta | W0,98 × H2,10, base0 | Escala vertical coerente; largura não significa passagem livre |
| Folha de porta | W0,82 × H1,94, base0,05 | Topo1,99; corrigir se a intenção for folha de 2,10 m |
| Janela térrea | W1,08 × H1,12, peitoril0,82 | Preservar dimensões humanas; não escalar junto de toda a composição |
| Medidor | centro2,92; altura0,38 | Alto demais para servir de detalhe genérico de corpo térreo sem revisão |
| Conduíte | centro3,80; altura1,55; topo4,575 | **Continua presente mesmo quando height=2,75/2,80**; remover/reposicionar ao extrair térreo |

O parâmetro `height` reduz o corpo e condiciona a janela superior, mas não reposiciona medidor/conduíte. Exportar `c1` como está ainda deixaria a AABB com infraestrutura até 4,575 m; usar essa AABB para normalizar altura repetiria o erro. Também é preciso decidir a presença da viga intermediária fixa em 2,38 m. Laje, platibanda, tanque e ferragens devem ser elementos separados do datum do corpo.

## Régua proposta para o redesenho

Estes valores são **decisões de projeto do jogo**, não descrição universal de moradias de comunidade nem orientação de construção. São pontos de partida verificáveis, não novos tetos automáticos de qualidade.

| Elemento | Valor inicial | Base e verificação |
|---|---|---|
| Fachada térrea principal | W4,40 × D6,75 | Corpo c1 existente; variar paredes entre 4–7 m sem alongar porta/janela |
| Pé-direito livre | 2,60 m | Referência técnica oficial MCMV; medir do piso acabado ao intradorso |
| Piso acabado / laje | piso +0,05; laje 0,15; topo2,80 | Receita proposta: 0,05+2,60+0,15; espessura/piso são escolhas do jogo |
| Porta residencial visual | folha W0,80–0,90 × H2,10 | Catálogo comercial de dimensões, sem assumir passagem livre equivalente |
| Passagem principal jogável | avaliar W1,10–1,20 livre | Escolha de circulação FPS, sujeita à cápsula e colisão reais; não valor normativo |
| Janela simples | W1,20 × H1,00; peitoril1,00 | Formato comercial e escolha de composição; topo2,00 próximo à verga da porta |
| Segundo pavimento, quando deliberado | repetir passo de piso2,75; topo5,55 | Derivação da receita térrea, sem incluir caixa d'água/platibanda |
| Entrada/respawn inferior | datum próprio do piso transitável | Vincular ao piso/collider real; a escala de uma casa não define superfície de spawn |

A referência oficial [especificações MCMV do Ministério das Cidades](https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/habitacao/arquivos-1/20240226_Portaria_MCID_725_Especificacoes_MCMV_FAReFDS_COMPILADA.pdf) indica pé-direito mínimo de 2,60 m, admitindo 2,30 m em banheiro. Esse programa fornece uma escala humana de comparação; não comprova as dimensões de casas existentes nas fotos de referência.

O fabricante Pormade apresenta altura usual de porta de 210 cm e larguras residenciais de 80/90 cm em [guia assinado por Natalia Eduarda Fecht, 25/05/2026](https://blog.pormade.com.br/2026/05/25/planta-baixa-guia-completo-com-simbolos/). A Esquadrisul lista formatos de janela de correr como 100×120 e 120×120 cm na [linha TopSul](https://www.esquadrisul.com.br/c%C3%B3pia-janela-de-correr-fortsul). A orientação dos eixos do catálogo não foi certificada nesta leitura; W1,20/H1,00 e peitoril1,00 são decisões explícitas, não medidas extraídas de fotografia.

## Ambiência e limites de aceitação

Manter a lógica de uso documentada em [LAJES-VISUAL-REFERENCIAS.md](LAJES-VISUAL-REFERENCIAS.md): acesso à laje, água, manutenção, varal e comércio precisam de lugar e suporte físico. A pesquisa de [Freire-Medeiros e Name sobre a laje](https://www.scielo.br/j/ts/a/wCwQPXPpVJVSx6cYgtmS5Lr/?format=html) e o [acervo Memória Rocinha](https://memoriarocinha.com.br/projeto/) apoiam essa leitura de moradia habitada, sem transformar desordem ou pobreza em decoração aleatória. Referência fotográfica não é licença para integrar imagens; não houve medição de pixels nem download nesta rodada.

A saída recomendada é fachada simples authored com porta, janela, laje e infraestrutura dimensionadas, reaproveitando materiais locais com procedência. Isso preserva melhor a escala que deformar um conjunto completo. O kit legado pode continuar candidato a fundo após revisão visual, mas nenhuma aprovação de fundo deriva apenas de seu baixo número de triângulos.

Próximo passo do responsável pelo builder: extrair/corrigir c1 ou montar a fachada simples; medir porta, piso e altura no objeto final; conferir no jogo ao lado do jogador e durante aproximação/entrada. A aceitação visual permanece com a revisão independente e o usuário. O presente diagnóstico conclui apenas a causa geométrica e a disponibilidade local.
