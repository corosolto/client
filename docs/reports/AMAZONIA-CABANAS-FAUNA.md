# Amazônia: cabanas, fauna e integração

Pedido: animais suspensos/estáticos e cabanas para entrar, proteger-se e atirar.
Depois, autorização para atualizar com main, resolver conflitos, validar build
e mergear; relato adicional de bots perdidos.

Baseline41eea0c1: tucano1,066m acima do apoio, papagaio2,335m; cabanas fechadas.
AMH1/2 reprovavam. Onça tinha centro próximo ao tronco, mas apoio estreito.
Agora poleiros têm suporte físico, onça repousa em madeira larga e jacaré
fica no chão plano da margem. Cabeça/respiração usam deformação local com pés,
galhos e normais da base fixos. Não se trata de locomoção ou rig completo.

GLB derivado mantém postes/telhado; shell fornece piso, porta e janelas com
os mesmos volumes para desenho, colisão e bloqueio de tiros. Recorte de folhagem
limpa interiores até o telhado e a região imediata das janelas. A árvore externa
continua limitando a vista de uma janela da chapa, conforme revisão visual.

Capturas `final-med/` e `main-low/`: AMH1–4 verdes;11cabanas,22travessias de porta,
44aproximações de janela,44disparos livres e44peitoris bloqueando _fireHitscan real.
Na main integrada,51rotas do jogador passaram, sem linha direta entre spawns.
Contraprovas detectaram porta fechada, janela tampada, ave suspensa e animação
congelada. Crítico independente aprovou contato, diferenças de pose e interiores.
O teste temporal mede variação e vértices fixos; não aprova toda a suavidade do ciclo.

Maina551204f integrada em8908cd75. Resolução manteve seus módulos compartilhados,
menu e áudio, aplicando somente Amazônia/preview e o hook opcional de superfície.
Build integrado passou. Registry original da main ainda falha em mapas sem
ambiência; teste específico da Amazônia carrega geometria real dos Mint props e
reprova ao remover o quintal, sem inventar população a partir de metadados.

Animação: substituído recálculo completo de normais por rotação ponderada.
ABBA Node concorrente mediu6,15–8,79ms→0,53–1,87ms por atualização;
poses idênticas e normais dos pés/galhos inalteradas. Isso não valida FPS.
Evidências detalhadas e limites ficam no ledger; artefatos grandes não vão ao Git.

No browser integrado em qualidade baixa,40atualizações da animação mediram
0,4475ms de média e1,2ms p95 (`main-low/habitat.json`), preservando AMH4.

Bots: a navegação confundia o chão e o piso elevado das palafitas, causando
rotas impossíveis e tentativas de recuperação. O mapa agora exclui nós inferiores
sob as casas e solicita navegação por camada, com altura atual, curva no lugar
e acompanhamento do piso. Os outros mapas mantêm o comportamento anterior.
`amazonia-bots-check.mjs`: seeds7 e42 passam71/71 percursos cada (objetivos,
retorno e saída das cabanas), zero arestas inacessíveis. Desligar a navegação
por camadas reprova3percursos e27arestas. `botsim-golden` dos demais mapas passou.
Recibos em `cabin-round/bots/production-{7,42,mutant}.json`.

Mídia real regravada após a correção dos bots: fonte23f6f611,144frames,6segundos;
poster mostra canal, canoas, palafitas e vegetação da árvore integrada.
Porta8157 serve agora a worktree atual, substituindo o snapshot antigo.
