# Controles de toque: os números por trás das constantes

O dono reprovou os controles web em 21/10/2026 ("ícones muito feios de armas, não tem o ícone
de arma mesmo" e "a jogabilidade ainda tá ruim"). Antes de mexer, o estado foi medido numa
partida viva no recorte deitado do Galaxy A25 (780×360, Pixel 5 emulado):

| Medida | Antes | Depois | Onde mora |
|---|---|---|---|
| Slots com render real da arma | 0 de 3 | 3 de 3 | `game.js` `_syncTouchWeps()` |
| Giro por arrasto de 300 px | 41° | 134° | `game.js` `TOUCH_LOOK_RAD_PX` |
| Passada para meia-volta | 1309 px (3,4 telas) | 403 px | idem |
| Giro arrastando a partir do ATIRA | 0,0003 rad | 1,17 rad | `game.js`, botão `.touch-fire` |

## Por que cada decisão

**Render em vez de glifo.** Os cinco slots eram SVG desenhado à mão, e o de "rifle" era o mesmo
para AWP, SVD e M4 — o jogador não sabia o que ia sacar. As imagens de `/img/weapons/*.webp` já
existiam e já eram usadas pelo painel de munição, pelo killfeed e pelo seletor de modo de armas,
onde o glifo havia sido reprovado antes. Granada continua em glifo porque não há render dela;
quando houver, entra pelo mesmo caminho. A barra é reconciliada em `_switchWeapon`, então pegar
arma do chão troca a figura.

**`TOUCH_LOOK_RAD_PX = 0.0078`.** O valor anterior (0,0024 rad/px) obrigava três passadas e meia
para virar 180°, o que na prática significa não virar para quem atira pelas costas. 0,0078 fecha
a meia-volta em ~403 px, dentro da área útil de arrasto de uma tela de 780 px com os botões por
cima. Não é gosto: o piso (100° em 300 px) e o teto (480 px para meia-volta) são cláusulas da
régua `tools/eval/toque-controles-check.mjs`.

**`sensToque` separado de `sens`.** Um polegar arrastando 300 px não é um mouse andando 300 px;
misturar as duas escalas estraga uma das duas. A linha de Configurações só aparece em
`pointer: coarse` e o `_touchLook` lê `sensToque` com queda para `sens` em save antigo.

**ATIRA também mira.** O gatilho é o dedo que já está apoiado durante a rajada. Sem encaminhar o
arrasto dele para `_touchLook`, qualquer correção de mira custava soltar o tiro. Os dois caminhos
(camada de mira e gatilho) entram na mesma função, então inversão de eixo, teto de pitch e o
fator de luneta valem igual nos dois.

## Régua

`npm run eval:toquecontroles` roda a base e os mutantes de arte, sensibilidade, arrasto,
joystick que atira, foco preso, dedo alheio, câmera morta e entrada presa em morte/respawn
online, acendendo exatamente as cláusulas afetadas. Ela sobe o próprio servidor quando
`BASE` não é passado e mede toque de verdade, não a leitura do fonte.

Relato de 31/10/2026: o centro do joystick gastava uma bala sem ATIRA (pistola12→11,
produção, Ego/Android844×390). Movimento e mira agora não escrevem o gatilho. ATIRA é um
botão do Game, decorado pelo Treta Pop, com um único dono por identificador; arrastar
continua mirando. Soltar, cancelar, perder foco, ocultar a página, pausar, abrir chat,
morrer ou sair da partida limpa a entrada. PING no toque foi substituído pelo ícone de
câmera, que chama a mesma alternância primeira→terceira→ombro da tecla B.
A morte e o respawn online vêm dos snapshots, sem passar por `_kill` local: os dois
ganchos do netcode limpam também os identificadores dos dedos. A cláusula TQ7 aplica
snapshots reais com ATIRA e joystick pressionados, exige inatividade dos dedos antigos
e funcionamento de um novo toque, incluindo toques iniciados enquanto morto.
TQ8 cobre o respawn local com clique de mouse e toque iniciados na tela de morte;
`respawn-sp-preso` remove a limpeza local e precisa reprovar a mesma cláusula.

O perfil móvel mantém DPR, textura, efeitos e sombras reduzidos, mas usa os mesmos
viewmodels autorados com mãos do desktop. `eval:vm-maos-mobile-desktop` percorre o catálogo
real nos dois recortes e verifica mãos dentro do quadro e traçante no pixel do cano.
A posição esperada vem do socket ou dos vértices deformados do modelo, independente
da função que origina o traçante. O mutante `cano-lateral` desloca só essa origem e
precisa reprovar a régua.
No CI, os assets publicados são conferidos por tamanho e SHA256 contra o manifesto;
não há cópia de modelos privados no Git. Esses dois testes rodam no portão de navegador.

TQ9 cobre a troca de rodada local e online com o jogador ainda vivo: comandos da
rodada encerrada são cancelados antes de começar a próxima. Os mutantes `round-sp-preso`
e `round-mp-preso` removem cada limpeza separadamente.

No mobile o boot espera só a arma inicialmente equipada e os recursos compartilhados,
incluindo a granada; os demais viewmodels entram no primeiro uso. No próximo mapa,
o anúncio ainda não informa sua arma: só compartilhados/granada são antecipados.
A régua de catálogo registra chaves e requisições antes
de trocar de arma: só aceita a entrada equipada, utilitários e bytes previstos no
manifesto. `boot-catalogo` restaura a carga do elenco inteiro e precisa reprovar esse
orçamento, mantendo a montagem e as mãos corretas. A varredura seguinte das armas
continua exigindo mãos e cano corretos quando cada modelo chega sob demanda.
O cenário `--mp` atravessa o boot real com roster e snapshots v4 simulados: personagem
de pistola herda AWP, sem pedir a pistola temporariamente. `boot-mp-local` restaura a
escolha local errada e precisa ultrapassar o orçamento. A pré-carga do próximo mapa
é invocada nesse cenário e só pode anunciar a chave compartilhada `grenade`.
