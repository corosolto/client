# Roadmap visual da UI — CORO SOLTO: Treta Suprema

**Base auditada:** `origin/main@8e4a64ab0` (`v2.1.0-alpha.34`), em 04/10/2026. **Escopo:** experiência de desktop do navegador, da home ao resultado de uma partida. Esta é uma proposta de produto e direção de arte; nenhum layout do jogo foi alterado nesta rodada.

Durante a auditoria, `main` avançou para `12510a25a` (`v2.1.0-alpha.35`). O diff até essa revisão altera release, dependências, documentação e `public/js/version.js`, sem mudanças em `src/pages/index.astro`, `public/style.css` ou na lógica da UI auditada. As capturas abaixo continuam identificadas pela revisão em que foram feitas.

## 1. Evidência e limites da revisão

O jogo foi servido pelo Astro local e capturado no Chrome com a rota real `/?tela=...`, sem `nav=1` nas telas decisivas. Usei 1536×1024 (3:2, proporção prioritária do dono) e 1280×720 (16:9). As imagens abaixo ficam em `artifacts/ui-audit-20261004/` neste checkout; a pasta é ignorada pelo Git por convenção do projeto.

[Ver as sete telas juntas](../../artifacts/ui-audit-20261004/visao-geral.png) (o mosaico é apenas índice; os arquivos abaixo conservam a resolução da captura).

| Tela | Captura local | Observação |
|---|---|---|
| Home 3:2, após carregar mídia | [home-real-apos-10s.png](../../artifacts/ui-audit-20261004/home-real-apos-10s.png) | Jogo real, mapa e personagem carregados |
| Home 16:9, após carregar mídia | [home-real-16x9.png](../../artifacts/ui-audit-20261004/home-real-16x9.png) | Jogo real; CTA, mapa e personagem cabem na tela |
| Modal de mapas da home | [hub-map-modal-3x2.png](../../artifacts/ui-audit-20261004/hub-map-modal-3x2.png) | Aberto pelo botão **TROCAR MAPA** |
| Seleção de personagem | [personagem-real-3x2.png](../../artifacts/ui-audit-20261004/personagem-real-3x2.png) | Modelo 3D real carregado; retratos e fundo visíveis |
| Configurações | [config-3x2.png](../../artifacts/ui-audit-20261004/config-3x2.png) | Rota de inspeção da tela, sem mudança de layout |
| HUD em partida local | [hud-real-3x2.png](../../artifacts/ui-audit-20261004/hud-real-3x2.png) | Jogo real durante o começo do round |
| Vitória | [vitoria-3x2.png](../../artifacts/ui-audit-20261004/vitoria-3x2.png) | Rota de inspeção do resultado |

Também foi registrada a [home antes de a mídia aparecer](../../artifacts/ui-audit-20261004/home-real-3x2.png). No renderizador desta máquina, a área da prévia e o personagem ficaram vazios no primeiro instante e apareceram após cerca de dez segundos de espera adicional. É uma observação do ambiente local, não uma medição de latência de produção. As capturas com `nav=1` mostram um manequim procedural por contrato de teste em [`main.js`](../../public/js/main.js); esse manequim não foi contado como defeito visual da experiência normal.

A captura do HUD não teve erro JavaScript de página, mas o checkout local não contém todo o pacote privado de áudio e viewmodels. Um 404 de viewmodel privado apareceu numa captura com `debug=1`; a imagem principal do HUD acima foi feita sem o overlay de debug. O relatório avalia hierarquia e legibilidade do HUD visto, sem declarar paridade com um cliente publicado ou partida multiplayer real.

## 2. Diagnóstico visual

| Área | Funciona hoje | Lacuna observada | Prioridade |
|---|---|---|---|
| Identidade | Logo, paleta escura, verde ácido e linguagem brasileira distinguem o jogo. | A arte fotográfica de fundo/retratos e os modelos 3D estilizados falam idiomas visuais diferentes. Na seleção, o fundo mostra uma pessoa enquanto o personagem ativo ocupa outro plano. | Alta |
| Home | O botão **JOGAR** é forte e legível; mapa e modo estão visíveis sem abrir outro painel. | A imagem do mapa ocupa a maior área, enquanto modo, armas, bots e rounds competem em uma linha de cartões com rótulos pequenos. O estado de carregamento dessa mídia não comunica progresso. | Alta |
| Escolha de mapa | Miniaturas grandes ajudam a reconhecer cenários; filtros separam oficiais/comunidade. | O modal mostra a próxima linha cortada na borda inferior e não sinaliza claramente a rolagem. O contorno verde do selecionado e o do hover podem parecer equivalentes. Nome e metadados dos cartões ficam pequenos. | Alta |
| Personagem | A ficha, atributos e elenco aparecem juntos; o modelo é girável. | Retrato, fundo e modelo 3D não compõem uma identidade única. As barras de atributos não explicam seu efeito prático; a ação **USAR PERSONAGEM** fica à esquerda, afastada do modelo escolhido. | Média |
| HUD | HP, munição, minimapa e estado do round têm posições estáveis. | Placar e texto do round ficam muito pequenos contra céu claro. Atalhos na base têm baixo contraste. A dica de pegar arma aparece perto do bloco de vida; estados transitórios competem pela mesma faixa. | Alta |
| Configurações | Painel com abas e ações de salvar/aplicar é claro. | Descrições auxiliares e o texto dentro da prévia perdem força; vale testar com distância real de monitor e em 16:9 menor. | Média |
| Resultado | Vitória, estatísticas, personagem e **JOGAR NOVAMENTE** têm boa hierarquia. | A direção de arte do personagem no resultado deve continuar reconhecível desde a seleção e a home. | Baixa |

### Comparação com referências AAA

Não proponho copiar estética ou componentes. As referências são decisões de apresentação e leitura de estado documentadas pelos próprios estúdios.

| Referência oficial | Princípio observado | Aplicação proposta no CORO SOLTO |
|---|---|---|
| [VALORANT: revisão da interface](https://playvalorant.com/en-us/news/game-updates/preview-the-future-of-valorant-s-interface/) | A Riot descreve a simplificação do lobby, contraste para a ação principal e continuidade entre agente, pré-partida e resultado. | Manter o CTA forte da home e criar um contrato visual para o mesmo personagem em card, preview, loading e resultado. Reduzir elementos decorativos que disputam o foco. |
| [Counter-Strike 2: UI e HUD](https://www.counter-strike.net/cs2) | A Valve apresenta efeitos e HUD como meios de comunicar estado importante da partida. | Dar mais leitura ao placar/round e reservar o centro para mira, ameaça e confirmação de combate. Cada cor e animação deve ter função de estado. |
| [Call of Duty: Warzone: interface de loot e HUD](https://www.callofduty.com/blog/2025/03/call-of-duty-warzone-verdansk-map-return-intel-drop) | A Activision destaca informação de item compreensível de relance e ajustes de HUD para reduzir ruído durante a ação. | Priorizar HP, munição, objetivo e dica contextual conforme urgência; recolher atalhos e mensagens secundárias fora do momento de combate. |

O resultado da comparação é de **consistência e legibilidade**, não de fidelidade gráfica: o jogo pode preservar sua sátira, tipografia expressiva e modelos estilizados enquanto melhora a leitura rápida.

## 3. Proposta de melhoria visual geral

**Direção:** “arena urbana brasileira” com uma camada funcional de interface. Usar fundo escuro e superfície sólida para dados; reservar o verde para ação/seleção, âmbar para contexto e vermelho para perigo/erro. A mesma regra vale da home ao HUD. A tipografia de exibição fica nos títulos; nomes de mapa, opções e valores de combate usam uma família de leitura com peso e tamanho estáveis. Não adicionar outra skin sobre [`style.css`](../../public/style.css); consolidar tokens e remover sobreposições durante a implementação.

**Home:** tornar inequívoca a sequência *mapa → modo/opções → jogar*. A prévia mantém valor emocional, mas recebe um estado de carregamento visível e informação resumida maior. Agrupar modo, armas, bots e rounds num bloco de configuração com rótulos legíveis. O cartão do personagem mostra claramente quem está escolhido e liga a ação **TROCAR PERSONAGEM** ao retrato/modelo. No 16:9, preservar essa ordem sem comprimir textos.

**Mapas:** no modal, marcar **selecionado** com um sinal persistente que difere de hover; mostrar quantidade de mapas e pista de rolagem. Padronizar crop, luminosidade e posição do nome nas miniaturas. Cada cartão deve dizer o suficiente para escolher sem abrir outra tela: nome, categoria e modo disponível.

**Personagens:** usar o mesmo identificador visual em retrato, modelo, nome e arte de fundo. Se o modelo 3D estiver carregando, manter a arte aprovada do personagem como fallback visível e trocar apenas quando estiver pronto. O fundo deve apoiar a facção ou o personagem selecionado, sem sugerir outra identidade. A ficha concentra uma ação principal e distingue claramente atributos de apresentação de atributos que afetem a partida.

**HUD:** elevar a leitura do placar/objetivo em fundos claros e escuros, sem aumentar a ocupação do centro. Definir zonas para estado persistente (HP, munição, placar), evento transitório (abate/dano) e ação contextual (pegar arma, recarregar, travar mira). Uma mensagem transitória por zona de cada vez, com prioridade explícita. Rever o tamanho do texto de round, os atalhos no rodapé e o espaço entre dica de pickup e vida.

**Configurações e resultado:** manter o padrão atual. Aplicar os tokens de texto/estado e verificar teclado, foco e persistência. No resultado, preservar o CTA de replay e a continuidade do personagem escolhido.

## 4. Roadmap proposto

Estimativas abaixo são de planejamento, a revisar após protótipo e medição. Cada fase termina com captura 3:2 e 16:9 e revisão humana do visual; o bot de CI é um filtro, não a aprovação artística.

| Fase | Entrega | Aceite observável | Estimativa |
|---|---|---|---:|
| 0 · Base e guarda | Capturas deste relatório e bot de classificação de regressão na CI. | Captura base/PR no mesmo runner; mudança visual vira **REVISAR**, falha nova vira **REGRESSAO**; mutação conhecida reprova. | Nesta rodada |
| 1 · Contrato visual | Tokens de cor, tipografia, densidade, estados e fallback de mídia. | Home não exibe área vazia quando a arte demora; personagem selecionado é reconhecível em card, preview e resultado. | 3–5 dias |
| 2 · Entrada em partida | Home e modal de mapas com hierarquia e seleção inequívoca. | Em 3:2 e 16:9, o jogador identifica mapa, modo/opções e CTA sem procurar; scroll e seleção do modal são distinguíveis. Medir `menu → match_start` antes/depois. | 4–6 dias |
| 3 · Seleção | Alinhamento de retrato, modelo, facção e fundo; estados de loading/fallback. | Todos os personagens amostrados em browser real, inclusive caminho leve; sem identidade trocada, preview vazio ou nova falha de asset. | 4–6 dias |
| 4 · Combate | Hierarquia do HUD, feedback de objetivo, avisos e pistas contextuais. | Capturas em mapa claro/escuro, CTF e mata-mata, vida baixa, reload e fim de round; mira e ameaça permanecem legíveis. Partida humana 3:2 revisada. | 5–8 dias |
| 5 · Fechamento | Configurações, resultado, teclado, 4:3 e telas menores. | Foco/ESC, persistência e textos não cortam; `JOGAR NOVAMENTE` mantém caminho rápido; métricas de entrada e retorno comparadas. | 3–5 dias |

As fases 2–4 devem ser feitas uma por vez porque home, seleção, arma/viewmodel e HUD compartilham estados da partida. O trabalho visual entra em branch isolada e só avança após aprovação de capturas reais, sobretudo em 3:2.

## 5. Bot de CI entregue nesta branch

[`capture.mjs`](../../tools/ui-regression/capture.mjs) abre home 3:2/16:9, modal de mapas, configurações, personagem, vitória e HUD no jogo servido pelo Astro. Salva a captura completa para revisão e uma versão estável que oculta as áreas animadas para comparação de interface. [`classify.mjs`](../../tools/ui-regression/classify.mjs) compara a base do PR com o head no mesmo runner e produz JSON, resumo e imagens de diferença. O [workflow](../../.github/workflows/ui-regression.yml) publica esses artefatos no Actions.

| Classe | Gatilho | Efeito na CI |
|---|---|---|
| `REGRESSAO` | Novo erro de página/404 de asset versionável, tela que não abre, mídia antes pronta que falhou, controle que sumiu ou saiu da viewport. | Falha o job. |
| `REVISAR` | Mudança de geometria ou mais de 1% de pixels estáveis alterados. | Job passa com resumo pedindo revisão visual. |
| `INCONCLUSIVO` | Base não abriu ou a comparação ficou indisponível. | Falha o job; não inventa aprovação. |
| `SEM_REGRESSAO` | Nenhuma diferença acima desses critérios. | Job passa. |

O bot compara **regressão relativa à base**. Assets ignorados pelo Git (áudio, decals privados e viewmodels pagos deste checkout) podem chegar em momentos diferentes em duas capturas idênticas; seus 404 ficam registrados no manifest, mas não viram regressão. Um novo 404 de caminho versionável reprova. Essa fronteira deixa falhas de assets privados para os portões próprios do projeto e para a revisão das capturas completas. O critério de pixel não dá nota estética; imagens 3D, mapa e efeitos animados continuam exigindo inspeção humana. Esta branch ainda não passou por um runner do GitHub; o teste local e seus resultados estão no [ledger](UI-ROADMAP-CONTINUATION.md).
