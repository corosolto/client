# Emissão FP na pose final

O auto-fire da AK emitia o clarão e a origem do traçante antes de a câmera, o mixer e o ADS terminarem o frame. No navegador, 28 tiros com ADS completo terminaram com169,360px entre clarão e boca; máximo188,679px no tiro que iniciou recarga. Medida anterior: sessão Ego R6,31/10/2026, Piscina offline,1320×880, qualidade baixa e bloom desligado.

A emissão visual FP autorada agora espera o início de `_updateFx`, depois de `_updatePlayer`. O hitscan, dano, destino já calculado, munição, cadência, recuo e marca de deduplicação do eco continuam no ponto original. Endpoints da rede são copiados. A fila é descartada quando o jogador morre, troca arma/câmera, reinicia rodada, cancela entrada por blur/aba oculta/pausa/chat ou faz dispose. Soltar o gatilho sem cancelar a entrada mantém o tiro aceito. 3P, bots e fallback legacy continuam imediatos; o kill-switch online `bocacano=0` preserva a origem antiga.

O clarão acompanha o cano durante sua vida; o traçante preserva a trajetória no mundo após a emissão. A fila não retira objetos dos pools antes do flush. A ordem global de sorteios cosméticos muda: esta correção não promete equivalência byte a byte de partidas seeded com bots.

O primeiro protótipo com fila ainda falhou no navegador:98,099px no ADS. `updateWorldMatrix` não executa o hook `SkinnedMesh.updateMatrixWorld` do Three r160 vendorizado. `getVertexPosition` lia `bindMatrixInverse` anterior, e o render corrigia depois. `_frontMuzzle` agora atualiza ancestrais e executa os hooks recursivos antes de deformar os vértices. Uma fixture rígida não reproduzia esse segundo defeito; a régua usa SkinnedMesh Attached, AnimationMixer, AuthoredViewModels e Game.update reais.

## Verificação

`npm run eval:shot-final-pose` executa o nominal e seis mutações em memória: emissão imediata, ausência de acompanhamento, destino deslocado, flush ausente, inverse de skin antigo e cancelamento que preserva a fila. Cada mutante precisa falhar pela cláusula causal, não por exceção de setup. Há casos de auto-fire, clique fora de update, transição/ADS, morte/troca, cancelamento direto/pausa/chat com retomada sem FX tardio, eco online, kill-switch,3P e legacy. Os limiares numéricos são tolerâncias de arredondamento da projeção e transporte; não são uma nota artística.

Na prova Ego R9 com assets reais:33 tiros/traçantes/clarões,33 retornos do pool,470 passos completos, pool final3/ativos0, dados finitos e preferências restauradas. Delta clarão-boca final0px; origem transportada2,97e-12px. Landmark independente: centro dos14 vértices da face extrema Y do corpo da AK no espaço Rifle_metarig, topY0,5414973544. Maior distância do clarão e origem ao landmark3,92451px. Essa diferença mede a média da faixa frontal de3cm usada pela boca versus a face extrema; não foi ocultada por um teto novo. Codex viu os quatro PNGs em3:2: emissão ligada ao cano no quadril/transição/fim da rajada, sem a estrela solta à esquerda no ADS.

As capturas e JSONs R6/R8/R9 ficam no audit de31/10 do projeto; não são assets de runtime. Prova local/offline, sem aceite amplo de mobile físico, MP, todas as armas ou FPS. O ângulo câmera/hitscan amostrado antes da atualização da câmera não é uma nova prova de erro balístico.
