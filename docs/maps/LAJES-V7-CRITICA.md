# Lajes V7 — crítica independente de pixels

Data: 2026-09-06. Checkout: `worktrees/lajes-visual`, branch `codex/lajes-visual`, HEAD inicial observado `b14b72e0`; HEAD na revisão final `5540db4d`. Revisão independente; sem alterar produção, abrir navegador ou ler relatórios dos construtores. Protocolo `asset-review` lido em `HEAD:.claude/skills/asset-review/SKILL.md`, pois estava removido na árvore de trabalho.

## Veredito final vigente — APROVADO com ressalvas P2

**P1 de sobreposição aérea RESOLVIDO. Aceite visual independente da V7: APROVADO, nota editorial 8/10.** A aprovação cobre o cenário, solo, pequenas faixas de grama, fauna em deslocamento, pipas, integração do 14-bis e previews examinados. Não é aprovação humana do dono nem certificação de FPS, CI, colisão, pausa ou descarte.

Na captura definitiva feita da laje norte, sem HUD sobre o avião, `life-final/santos-voo-first.png` mostra o 14-bis sozinho em x≈725–820/y≈470–526; em `santos-voo-last.png` ele avançou para x≈928–1056/y≈449–510. Canard separado, treliça e células biplanas compõem uma silhueta reconhecível sobre céu livre. Não há helicóptero misturado à aeronave nos PNGs nem nos quatro frames amostrados do WEBM. O movimento da passagem é visível; o antigo aspecto de veículo híbrido desapareceu.

**Limitação honesta do piloto:** na escala destes PNGs de 1536 × 1024, o avião ocupa aproximadamente 95–125 px de largura e o piloto se reduz a detalhe central pequeno. Não afirmo que figura humana, rosto ou chapéu sejam reconhecíveis nessa distância. A presença e o desenho do piloto foram aprovados nos renders isolados `santos/quarter.png` e `santos/underside.png`; a captura runtime aprova a leitura do 14-bis no bairro. Não proponho ampliar artificialmente a pessoa para resolver esse limite natural da distância.

Ressalvas P2 mantidas, sem bloquear esta entrega: contraste baixo da barata contra a terra; contornos retos e verde chapado das pequenas manchas de grama; cesta com leitura de ripas em vez de vime no render próximo. Rato afastado da soleira, junta transversal da praça e composição aérea anterior estão fechados nas imagens finais.

O integrador forneceu resultado de teste de separação das rotas, mas esta crítica não o executou nem o usa como substituto dos pixels. A amostra visual resolve o defeito observado; não prova ausência de sobreposição em todo instante ou câmera possível. Não houve leitura de relatório de construtor nem operação de navegador.

Identificação dos arquivos definitivos, pois o caminho `life-final/santos-voo*` foi recapturado após a câmera obstruída: SHA-256 de `santos-voo-first.png` = `885a7aa3b95b2c0f6641aeacd517582d1cfc5e6d5b2cb69adad8761c8fa8b7d1`; de `santos-voo-last.png` = `9e137852bb3e6d6a3ffa5a79c437b26317bce4fda5934efe5134dc250e425d02`; de `santos-voo.webm` = `dcc56b71b2434bdbf890085c1a935a0a1ff5e7072d20dd8426307680712655b4`. HEAD observado: `5540db4d`.

Grid final inspecionado: `/tmp/csbrasil-v7-critica-santos-final.png`, reproduzível com `ffmpeg -i artifacts/lajes-visual/v7/life-final/santos-voo.webm -vf 'fps=1/2,crop=1200:640:120:0,tile=2x2' -frames:v 1 /tmp/csbrasil-v7-critica-santos-final.png`. Os PNGs completos foram vistos antes dos recortes. Um crop ampliado do último PNG foi usado apenas para conferir o limite de leitura do piloto, nunca como evidência de que ele seria grande no jogo.

**Continuação:** nenhuma correção visual bloqueante permanece dentro desta revisão. O integrador pode prosseguir com a preparação do PR e seus controles técnicos. Aceite humano, publicação e resultados de CI continuam responsabilidades separadas. As seções abaixo documentam as rodadas anteriores; este veredito prevalece.

## Revalidação intermediária da correção aérea — histórico da câmera rejeitada

HEAD observado nesta rodada: `5540db4d`, mesma branch. O novo par `life-final/santos-voo-{first,last}.png` foi rejeitado como evidência: a câmera está sob uma marquise que oculta a passagem inteira do avião. O integrador confirmou o problema da câmera e anunciou recaptura no centro do campo. Não afirmo que a sobreposição anterior ainda exista no código corrigido; falta imagem útil para fechar seu aceite visual.

`browser-sky-final/horizonte-norte.png` mostra helicóptero sozinho em céu livre. `horizonte-sul.png` mostra o 14-bis separado do helicóptero, mas a mensagem central “GO GO GO!” encobre parte relevante da aeronave. Ambos indicam melhora de separação nos respectivos instantes, sem substituir uma passagem legível com piloto.

**Fauna e preview recapturados: APROVADOS no escopo visual.** Em `life-final/ratos-first.png` e `ratos-last.png`, o rato deslocou-se para a terra livre da soleira (aprox. x790/y658 → x799/y594), com corpo, patas e cauda identificáveis. A ressalva anterior de caminho sobre a soleira não aparece nesse par. A barata muda de posição entre `baratas-first.png` e `baratas-last.png` (aprox. x775/y495 → x747/y638), mantendo a ressalva P2 de baixo contraste marrom sobre marrom.

O novo `public/img/map-previews/lajes.jpg` e quatro frames de `public/video/map-previews/lajes.webm` mantêm mapa cheio, câmera aérea variada, pipas e leitura das lajes. Sem frame vazio, marquise cobrindo o mapa ou silhueta híbrida de aeronaves na amostra do preview. Grid inspecionado: `/tmp/csbrasil-v7-critica-preview-final.png`, extraído com `ffmpeg -i public/video/map-previews/lajes.webm -vf 'fps=1/3,scale=720:480,tile=2x2' -frames:v 1 /tmp/csbrasil-v7-critica-preview-final.png`. Isso não é teste de fluidez, reprodução no menu ou FPS.

## Veredito da rodada anterior — histórico do P1

**REPROVADO para aceite visual final: um bloqueio P1 na integração aérea.** Cenário/solo/fauna/previews aprovados com polimento P2. Nota editorial do cenário final: **8/10**; 14-bis isolado permanece **8/10**, mas sua composição no céu está **5/10** porque helicóptero e avião se sobrepõem persistentemente. Não são notas de desempenho nem testes automatizados.

O bloqueio: `browser-final/horizonte-norte.png` mostra helicóptero sobreposto ao 14-bis em x≈1180–1450/y≈60–215. `life/santos-voo-last.png` repete a sobreposição em x≈1080–1315/y≈414–570. Quatro frames amostrados de `life/santos-voo.webm`, cobrindo o clipe a cada dois segundos, mostram os dois veículos avançando juntos com as silhuetas unidas. Não é apenas um cruzamento instantâneo; roda, célula, rotor e fuselagem se misturam na mesma mancha. O piloto não fica identificável nessa passagem.

**Conserto mínimo para liberar:** separar a trajetória, fase ou altura dos veículos de forma que a passagem normal apresente o 14-bis isolado; então recapturar um trecho em três quartos/por baixo, com canard e piloto identificáveis na escala do jogo. Uma nova imagem isolada em Blender não fecha este item. Não é necessário reabrir o cenário e a fauna para resolver o bloqueio.

### Itens fechados na rodada final

| Item | Veredito atual | Evidência observada |
|---|---|---|
| Casas e becos | APROVADO | Pares finais preservam estreitamento V6 e fachadas em reboco/tijolo sem retorno das casas azuis. |
| Terra e junta transversal da praça | APROVADO | A linha horizontal anteriormente visível em y≈748 desapareceu de `browser-final/praca-sul.png`; a terra agora atravessa essa região continuamente. |
| Gramado | APROVADO com P2 de acabamento | Na praça final há superfície verde sob os tufos, claramente visível no canto esquerdo inferior x≈0–125/y≈772–865 e na faixa sob fachada. São pequenas manchas/faixas de grama, não gramado extenso. O contorno reto e o verde chapado ainda parecem recorte de plano, mas não bloqueiam o pedido de terra com gramados. |
| Horizonte sem bot diante da lente | APROVADO | O personagem que escondia a metade inferior foi retirado da captura final; lençol e lajes permanecem legíveis. |
| Mais pipas | APROVADO | Horizonte final mantém múltiplas pipas, linhas e rabiolas em regiões separadas do céu; a sequência de voo também mostra mudanças de posição da pipa com a câmera fixa. |
| Ratos passando | APROVADO com P2 de percurso | `life/ratos-first.png`, `ratos-last.png` e frames do WEBM mostram rato pequeno escuro com corpo/patas/cauda movendo-se junto à porta e avançando pelo chão. Em parte do trajeto, a projeção do corpo coincide com a soleira, dando aparência de pisar nela; conferir encaixe da rota se polir depois. Não afirmo penetração geométrica a partir desses pixels. |
| Baratas passando | APROVADO com P2 de contraste | O WEBM mostra corpo oval achatado marrom com apêndices finos deslocando-se junto à borda esquerda do corredor. Stills inteiros têm contraste fraco contra pedras da mesma cor; os frames sucessivos permitem identificar o bicho e o movimento. Escurecer levemente corpo/apêndices ou passar por trecho menos ruidoso melhoraria leitura sem aumentar escala. |
| Preview estático e menus | APROVADO | `public/img/map-previews/lajes.jpg` mostra malha densa de casas, terra na praça e pipas. `preview/hover-cartaz.png` e `hover-card.png` exibem esse mapa com título legível e seleção clara, sem imagem vazia, distorção ou UI cobrindo o assunto principal. Não se pretende que a vista aérea demonstre fauna miúda ou todos os assets. |
| 14-bis voando | REPROVADO P1 | Deslocamento é comprovado, mas composição aérea fundida ao helicóptero e piloto ilegível impedem aceite do pedido completo. |

Evidência adicional desta rodada: `artifacts/lajes-visual/v7/browser-final/{praca-sul,beco-oeste,horizonte-norte}.png`; `artifacts/lajes-visual/v7/life/{ratos,baratas,santos-voo}-{first,last}.png`, respectivos `.webm` e `.json`; `public/img/map-previews/lajes.jpg`; `artifacts/lajes-visual/v7/preview/{hover-cartaz,hover-card}.png`. JSONs consultados apenas como metadados de câmera e estados antes/depois, sem substituir julgamento dos pixels.

Amostragem reproduzível da sequência aérea: `ffmpeg -i artifacts/lajes-visual/v7/life/santos-voo.webm -vf 'fps=1/2,crop=880:530:650:130,tile=2x2' -frames:v 1 /tmp/csbrasil-v7-critica-santos.png`. Foram olhados também grids de ratos (`crop=580:680:560:340`) e baratas (`crop=580:570:610:450`) com a mesma amostragem. Recortes servem à inspeção; o aceite de escala foi feito com os PNGs inteiros. Não julguei FPS, fluidez contínua, pausa, descarte ou killswitch.

Próximo passo: integrador corrigir apenas a sobreposição aérea e enviar nova sequência de passagem com silhueta livre e piloto visível. Os achados iniciais abaixo ficam como histórico, superados pelos vereditos desta seção quando houver conflito.

## Escopo e veredito inicial — histórico

Pedido: preservar ruas estreitas aceitas da V6, retirar casas azuis, chão de terra com gramados, ratos/baratas passando pelo chão, mais pipas e Santos Dumont voando no 14-bis. Ficha conferida: `plans/24-LAJES-SANTOS-DUMONT.md`.

**Nota visual provisória do cenário V7 browser-first: 7/10. Nota do 14-bis isolado: 8/10. Entrega integrada ainda REPROVADA por evidência incompleta.** As notas são juízo editorial, não resultado de medição automática nem limiar de qualidade. O browser-first precede a integração do avião e uma revisão do gramado informada pelo integrador; a ausência dessas mudanças nessas imagens não demonstra defeito no código posterior.

O bairro mantém a compressão espacial e o caráter de lajes, reboco, tijolo exposto, fios e varais da V6. A terra aquece a paleta e as fachadas azuis observadas foram substituídas. Os gramados ainda não se leem como manchas verdes nesta primeira rodada. As imagens não permitem reconhecer e acompanhar rato e barata. Mais pipas estão visíveis. O 14-bis isolado tem identidade clara, mas isso não aprova sua presença e legibilidade no jogo.

## Evidência examinada

Pares V6/V7, visualizados individualmente em resolução de origem 1536 × 1024:

- `artifacts/lajes-visual/v6/browser-final/praca-sul.png` e `artifacts/lajes-visual/v7/browser-first/praca-sul.png`.
- `artifacts/lajes-visual/v6/browser-final/beco-oeste.png` e `artifacts/lajes-visual/v7/browser-first/beco-oeste.png`.
- `artifacts/lajes-visual/v6/browser-final/horizonte-norte.png` e `artifacts/lajes-visual/v7/browser-first/horizonte-norte.png`.

Modelo isolado, 1500 × 1000: `artifacts/lajes-visual/v7/santos/quarter.png`, `side.png` e `underside.png`.

Coordenadas abaixo são localização aproximada por inspeção visual, origem no canto superior esquerdo. Não constituem teto geométrico ou métrica automatizada.

## Conferência por pedido

| Item | Veredito da evidência inicial | O que o pixel comprova |
|---|---|---|
| Ruas estreitas V6 | APROVADO no escopo dos pares | Em `beco-oeste`, limites das fachadas e fuga central preservam o mesmo corredor comprimido. Em `praca-sul`, os dois blocos centrais e a abertura entre eles mantêm a composição V6. Sem prova de colisões ou dimensões métricas. |
| Retirada de casas azuis | APROVADO nos enquadramentos | O grande pano azul à esquerda da praça (aprox. x18–502, y356–679), a parede esquerda do beco (x0–368) e os panos azulados do horizonte deram lugar a reboco bege/acinzentado. Portas, HUD e roupas coloridos não contam como casas azuis. |
| Terra | APROVADO com acabamento pendente P2 | Praça e beco agora têm solo marrom de pedra/terra, claramente distinto do piso cinza V6. No primeiro plano da praça a textura tem relevo aparente e variação; há uma junta linear escura artificial descrita abaixo. |
| Gramados | REPROVADO nesta rodada inicial | Praça: tufos escuros isolados no canto inferior esquerdo e sob a fachada esquerda. Beco: faixa estreita de pontas verdes acompanha o rodapé direito. O conjunto se lê como mato esparso, sem superfície de gramado reconhecível. Exige recaptura após a revisão. |
| Ratos e baratas passando | REPROVADO por falta de evidência identificável | Há cão, pombos e uma silhueta escura pequena na praça perto de x639, y619; esta não permite identificar com segurança rato ou barata. Nenhum still demonstra deslocamento. Não concluo que os animais estejam ausentes do runtime. |
| Mais pipas | APROVADO para presença visual | `horizonte-norte` V7 contém pipas reconhecíveis perto de (246,461), (1109,217) e (1167,85), com linhas/rabiolas. A V6 comparada mostra uma pipa junto à borda esquerda. Isto demonstra maior presença neste enquadramento, não o total do sistema nem movimento. |
| 14-bis com piloto | APROVADO como render isolado; REPROVADO para aceite integrado | `quarter` e `underside` exibem avião e piloto; browser-first não é evidência dessa integração. A trajetória, animação, pausa e legibilidade à distância continuam sem avaliação. |

## Problemas concretos e prioridade

### P1 — demonstrar os gramados revisados no chão servido

No `praca-sul` inicial, as regiões verdes aproximadas x0–113/y751–838 e x416–524/y596–642 aparecem como hastes escuras. O solo permanece marrom entre elas. No `beco-oeste`, x830–958/y611–839 mostra uma linha repetitiva de pontas verdes, algumas encostadas no ressalto claro da porta, sem área verde ampla.

Conserto mínimo: validar a revisão já informada com a mesma câmera. Se o resultado continuar semelhante, fazer a superfície verde aparecer entre os tufos, com borda irregular junto à terra, sem cobrir a faixa inteira da passagem. Não aumentar a largura das ruas para acomodar vegetação.

### P1 — provar rato/barata e passagem do avião na distância real

As capturas disponíveis não permitem conferir o substantivo nem o verbo do pedido de fauna: não identificam claramente cada bicho e não mostram que atravessa o chão. O render do avião também não mostra sua escala aparente em Lajes.

Conserto mínimo de evidência: sequência curta de câmera parada, na altura do jogador, com cada espécie atravessando uma região de chão visível, e sequência da passagem do 14-bis sobre os telhados. Usar imagens naturais de gameplay como aceite; um close adicional pode esclarecer anatomia, mas não substitui a leitura em jogo.

### P2 — junta reta no chão da praça

`praca-sul` V7 apresenta linha escura horizontal em y≈748, atravessando x≈0–1100 até a arma. Ela corta a terra como união de placas. Uma junta similar já era perceptível no piso V6; a textura terrosa mantém a marca artificial evidente. Não classifico a causa técnica só pela imagem.

Conserto mínimo: conferir a superfície nessa união e remover a linha caso seja borda de geometria/textura, mantendo continuidade de terra. O requisito é visual: não parecer placa retangular atravessando a praça.

### P2 — captura do horizonte obstruída

No `horizonte-norte` V7, o lençol branco (grande região esquerda inferior) e principalmente o personagem próximo (aprox. x533–957/y628–1023) ocultam cenário que estava visível na V6. A fumaça também reduz a leitura dos blocos centrais. As pipas podem ser julgadas; a comparação do conjunto inferior perde qualidade.

Conserto mínimo: repetir a mesma câmera em momento sem personagem colado à lente. Isto é correção de evidência, não pedido para remover o varal ou a vida do mapa.

## 14-bis isolado

**APROVADO para prosseguir à verificação em jogo.** No `quarter`, as células creme, montantes em madeira e tirantes diagonais formam silhueta específica; o canard em caixa fica separado à esquerda (aprox. x361–627/y425–686), e o piloto em pé na cesta aparece no centro (x829–934/y315–507). Roupa escura, colarinho claro e chapéu contrastam com a estrutura. `underside` confirma que o conjunto ainda pode mostrar canard, piloto e rodas quando visto de baixo, ângulo relevante para quem está no chão.

Limitações visuais concretas:

- **P1 de integração, não reprovação da malha:** no `side`, o painel lateral da asa (aprox. x905–1130/y390–571) esconde praticamente todo o piloto. Uma passagem exclusivamente de perfil pode entregar apenas um avião antigo; a trajetória precisa oferecer um trecho em três quartos/por baixo no qual o piloto apareça. Primeiro conferir a passagem real, antes de mexer na anatomia.
- **P2 de material:** a cesta no `quarter` parece caixa de ripas horizontais de madeira, com canto reto bem marcado, mais do que vime trançado. Se o piloto/cesta forem grandes o suficiente no jogo, uma indicação simples de trama cruzada melhora a ficha. Não há razão para adicionar detalhe invisível à distância.
- O bigode é discreto; o conjunto chapéu/roupa/avião comunica a intenção, mas não afirmo semelhança facial histórica nem réplica 1:1. As imagens isoladas não contêm escala humana externa para verificar metros.

Não avaliei fidelidade histórica por fonte externa nem licenças por pixel. Não vi gore ou pessoa contemporânea nos renders examinados. Piloto histórico estilizado está explicitamente previsto na ficha e no pedido recebido.

## Continuação para fechar o aceite

Solicitado ao integrador: `praca-sul`, `beco-oeste` e `horizonte-norte` finais nas mesmas câmeras, após gramado revisado e avião integrado; horizonte sem personagem obstruindo; sequência de rato/barata no chão e passagem aérea em câmera de jogador. A crítica final deve ser anexada aqui depois de olhar esses arquivos.

Fora do que screenshots estáticos podem provar: FPS, custo de renderização, travamentos, órbita, hélice animada, pausa, descarte, killswitch, colisão, quantidade total de fauna/pipas e validade dos testes. Nenhuma aprovação desses itens foi inferida nesta revisão.
