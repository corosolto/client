# Lajes V5 — crítica visual independente do lote final

Data: 2026-09-06. Avaliação por pixels, sem ler relatórios do builder ou código de produção. Worktree `lajes-visual`, branch observada `codex/lajes-visual`, HEAD observado `97861946`; havia alterações não commitadas. O hash identifica o checkout observado, não prova a origem exata das capturas.

## Veredito

A V5 melhora substancialmente a V4 e agora é reconhecível como uma comunidade brasileira densa e verticalizada. O beco oeste deixou de parecer uma rua larga entre muros baixos: há fachadas próximas, pavimentos superiores, marquises, portas e fios ocupando a perspectiva. A paisagem das lajes também ganhou casas sobrepostas; pipas e helicóptero aparecem de maneira verificável.

Isso atende uma parte importante da rejeição do usuário. Não sustenta, porém, afirmar que toda a simplificação ou a aparência low-poly foi resolvida. Ainda parece um cenário modular estilizado: os novos prédios repetem quase a mesma composição, o relevo distante é uma silhueta poligonal e há um defeito visível no piso em uma captura. A identidade voltou; a variedade e a integração do ambiente permanecem parciais. Esta crítica não concede aprovação do usuário ou um selo de conclusão.

## Material observado

Comparei os nove pares de `artifacts/lajes-visual/v4/browser-approved/` e `artifacts/lajes-visual/v5/browser-third/`: `spawn-norte`, `spawn-sul`, `praca-norte`, `praca-sul`, `praca-da-laje`, `laje-oeste`, `beco-oeste`, `fachada-oeste`, `escada-norte`.

Também observei na V5 `horizonte-norte.png`, `horizonte-sul.png` e, como amostra complementar, `beco-leste-003.png`, `beco-oeste-003.png`, `circuito-superior-oeste-024.png`. As coordenadas abaixo são regiões aproximadas localizadas visualmente, em imagens de 1536 × 1024, com origem no canto superior esquerdo. Não representam medidas de largura, distância ou altura no mundo.

Observei as fotografias fornecidas de [Paraisópolis](https://vitruvius.com.br/media/images/magazines/grid_12/dae661378a41_08.jpg) e [Providência](https://vitruvius.com.br/media/images/magazines/grid_12/7437dc14320c_14.jpg), baixadas apenas para consulta local em `/tmp/lajes-v5-critica2/`. Elas mostram diferenças úteis de composição: profundidade urbana e variação de coberturas em Paraisópolis; ocupação acompanhando relevo, vegetação e várias camadas de distância em Providência. Não trato as fotos como exigência de reprodução fotográfica nem generalizo duas vistas para todas as comunidades de RJ/SP.

## Melhorias visíveis sobre a V4

- **Beco oeste:** em `beco-oeste.png`, a V4 exibia um corredor aberto entre um muro direito e casas baixas. Na V5, fachadas altas e marquises à direita, paredes próximas à esquerda e fios atravessando o trecho criam confinamento convincente. A diferença está em praticamente toda a área do cenário, sobretudo x380–1240, y130–850.
- **Densidade das lajes:** em `praca-da-laje.png`, x0–1535, y110–380, uma faixa baixa de blocos da V4 foi substituída por vários pavimentos e coberturas com alturas diferentes. `laje-oeste.png` confirma a mudança nas laterais e no fundo. Varais, bar, parapeitos e caixas d'água continuam legíveis.
- **Fachadas:** `fachada-oeste.png`, x1130–1490, y120–530, mostra reboco com granulação mais evidente. Há trechos de tijolo aparente junto à base em outras vistas. As portas, grades e pequenas coberturas ajudam o beco a parecer habitado.
- **Céu:** uma pipa é reconhecível em `praca-sul.png`, perto de x686, y262, com linha e rabiola; outras aparecem nas vistas de spawn e laje. O helicóptero em `horizonte-norte.png`, x1200–1365, y105–210, tem fuselagem, rotor e esquis reconhecíveis. A presença está comprovada nesses quadros; frequência, movimento e visibilidade durante uma partida não foram testados.

## Três limitações prioritárias

### 1. As novas casas ainda parecem módulos repetidos em fileiras

**Evidência:** `praca-da-laje.png`, x290–1490, y115–370; `praca-sul.png`, x625–930, y330–493. O complemento `circuito-superior-oeste-024.png`, x30–1400, y80–575, torna especialmente evidente a repetição de pares de janelas, faixas horizontais contínuas, cantos retos e coroamentos semelhantes. A alternância de tinta e tijolo varia a cor mais do que a construção.

**Consequência:** recuperou-se densidade, mas a leitura de autoconstrução por acréscimos continua fraca. A própria repetição cria uma nova versão da aparência simplificada rejeitada pelo usuário. As fotos mostram variação de recuos, aberturas, coberturas e ocupação em profundidade que ainda falta ao conjunto.

**Próxima verificação:** variar algumas composições realmente visíveis — posições e tamanhos relativos de vãos, recuos, volumes laterais e tipos de cobertura — e comparar os mesmos enquadramentos. Mais textura sozinha não resolve esse padrão. Causa de implementação e custo não foram verificados.

### 2. O fundo recuperou relevo, mas não um horizonte urbano convincente

**Evidência:** `spawn-norte.png`, x620–966, y304–408, e `escada-norte.png`, x640–898, y325–410, mostram uma massa muito clara, com poucos segmentos retos. Em `horizonte-sul.png`, x0–466, y375–497, o morro parece uma superfície lisa e isolada atrás da primeira faixa de casas.

**Consequência:** existe um fundo onde a V4 deixava principalmente céu vazio, mas a comunidade ainda parece terminar logo atrás dos prédios próximos. A foto da Providência fornece uma referência de relevo ocupado e planos sucessivos; Paraisópolis mostra continuidade de tecido urbano e cidade além dele. A V5 recupera a ideia de morro, sem transmitir ainda essa extensão.

**Próxima verificação:** quebrar a silhueta e introduzir camadas distantes de ocupação/vegetação com contraste reduzido, mantendo leitura simples de jogo. Pipas e helicóptero devem continuar reconhecíveis. Não é necessário copiar um marco real ou buscar fotografia 1:1.

### 3. O piso da vista sul tem fragmentos que parecem defeito de superfície

**Evidência:** `horizonte-sul.png`, x550–1015, y800–1010: o turquesa do piso é recortado por várias estrias bege e contornos serrilhados; o padrão continua à direita sob a arma. Não se lê como desgaste material convincente.

**Consequência:** mesmo sendo localizado, o defeito contradiz a melhoria de acabamento e distrai no primeiro plano. A imagem é compatível com superfícies sobrepostas, mas não permite confirmar z-fighting ou sua causa.

**Próxima verificação:** inspecionar essa área em movimento e em câmeras próximas, corrigir a origem do recorte e recapturar a mesma vista. Sem par equivalente de horizonte na V4, não classifico esse defeito como regressão introduzida pela V5.

## Atendimento às perdas citadas pelo usuário

| Queixa | Leitura deste lote |
|---|---|
| Becos térreos largos | Melhorada de forma convincente no beco oeste principal. Os quadros complementares das extremidades mostram áreas abertas de spawn/escada; não provam a largura de todos os percursos. |
| Simplificou demais / perdeu favela | Identidade recuperada, sobretudo pelo confinamento, adensamento e verticalidade. Variedade construtiva ainda parcial. |
| Low-poly | Parcial. Reboco e detalhes melhoram a superfície, mas casas muito regulares, morro angular e cão facetado em `praca-norte.png`, x642–774, y610–740, mantêm essa leitura. Não é possível deduzir contagem de polígonos pela captura. |
| Perdeu horizonte | Parcial. Há mais fundo residencial e relevo, mas a continuidade urbana distante segue fraca. |
| Perdeu pipas e helicóptero | Presença visual atendida nas capturas indicadas; comportamento em jogo não avaliado. |
| Referência RJ/SP | Há maior afinidade visual com as referências reais, especialmente no adensamento. O lote não demonstra reprodução específica de Paraisópolis ou Providência, nem precisa ser idêntico às fotos para funcionar. |

Não executei browser, não medi desempenho/colisão/flow e não alterei produção. A revisão documenta o que os PNGs demonstram e deixa as limitações abertas para o próximo passo.

## Adendo — duas correções conferidas em `browser-final`

Ainda em 2026-09-06, examinei somente `artifacts/lajes-visual/v5/browser-final/horizonte-sul.png` e `spawn-norte.png`, mantendo o restante da revisão acima ligado ao lote `browser-third`.

- **Piso sul: defeito anterior não aparece na nova captura.** Na mesma região x550–1015, y800–1010, agora há piso bege contínuo e a linha branca curva da quadra. Os fragmentos turquesa/bege e as estrias serrilhadas denunciados na limitação 3 desapareceram. Isso confirma a correção visual nesse enquadramento; não examinei sua estabilidade em movimento.
- **Forma branca triangular no spawn norte: ausente na nova captura.** Em x620–966, y304–408, vê-se agora céu contínuo atrás da pipa e das casas. Retiro a interpretação daquela forma específica como morro: o responsável pela correção informou que era uma abertura causada pelo recorte do domo do céu pela câmera. Não auditei o diagnóstico por raios ou seus valores; minha confirmação independente é a ausência do artefato no PNG final.

A limitação 2 precisa, portanto, ser lida com essa retificação: a forma triangular do spawn norte não é evidência válida de geometria de morro. A observação separada sobre pouca continuidade urbana distante e a silhueta lisa à esquerda de `horizonte-sul.png` permanece; essa região continua visível na nova captura. Não revisei `escada-norte.png` no lote final.

As novas imagens resolvem os dois defeitos de imagem específicos conferidos. A regularidade dos módulos arquitetônicos, a variedade construtiva e a profundidade do horizonte continuam limitações da avaliação anterior. Não houve reavaliação global, aprovação humana, alteração de produção, execução de browser ou commit por este crítico.
