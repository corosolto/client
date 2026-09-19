# Qualidade adaptativa

*Escrito em 12/09/2026, junto com a implementação. Os comentários de `public/js` apontam para cá
porque lá o orçamento é de duas linhas — a regra da casa é que história mora em documento.*

## O problema medido

O painel de admin mede **20% das amostras de FPS abaixo de 30**, e sessões inteiras a 4-8 FPS. O
jogo tinha três qualidades fixas (`low`/`med`/`high`) e uma heurística de máquina fraca que roda
**uma vez, no boot**, e só se o jogador nunca salvou preferência (`main.js`, `detectaHwFraco`).

Depois do boot, nada mais observava o quadro. E o que faz o jogo engasgar acontece justamente
depois: mapa caro (medido em 12/09 — `mansao` custa 2065 draw calls contra 307 da
`praca_poderes`, e `corrego` desenha 8,3 milhões de triângulos), partida cheia, granada de
fumaça, dez bonecos GLB na mesma sala.

## O que a escada faz

Sete degraus, do mais bonito ao mais leve, na ordem de redução declarada no plano — **DPR → pós
(SSAO, AA) → sombra → efeitos opcionais**:

| degrau | DPR | SSAO | AA | sombra | máscara de bloom |
|---|---|---|---|---|---|
| cheio | 1,00 | sim | sim | alta | sim |
| dpr- | 0,85 | sim | sim | alta | sim |
| sem-ao | 0,85 | **não** | sim | alta | sim |
| dpr-- | 0,70 | não | sim | alta | sim |
| sem-aa | 0,70 | não | **não** | alta | sim |
| sombra- | 0,70 | não | não | **baixa** | sim |
| mínimo | 0,60 | não | não | baixa | **não** |

O DPR é multiplicador do DPR **base** — quem já entrou em 0,75 por ser máquina fraca continua
proporcional, e não volta a 1,0 por causa da escada.

**O bloom não entra na escada**, e isso é escolha com motivo: o passe de composite lê o alvo do
bloom (`bloom.js`, `COMPOSITE`), então desligá-lo em runtime mostraria um alvo velho em vez de
economizar. Quem quiser cortá-lo corta por preferência, não por adaptação.

## O veto do dono, que virou cláusula

Nenhum degrau mexe em **jogabilidade**: arma no chão, alcance, legibilidade do inimigo, HUD.
Quem perde quadro não pode perder também a informação de que precisa para jogar. A régua
`tools/eval/qualidade-adaptativa-check.mjs` transforma isso numa lista fechada de campos
(`CAMPOS_PERMITIDOS`) e reprova qualquer degrau que invente outro.

## Por que não vira pisca-pisca

É a parte difícil. Máquina que fica exatamente no limiar sobe, sofre, desce, folga e sobe de
novo — e o jogador vê a imagem trocar de nitidez a cada poucos segundos, **o que é pior que
jogar um degrau abaixo o tempo todo**. Três defesas, e a régua cobra as três:

1. **Faixa morta**: desce acima de 115% do orçamento, sobe abaixo de 75%. Entre as duas, nada.
2. **Tempos assimétricos**: 3 s sofrendo para descer, 12 s folgado para subir, mais 4 s de
   carência depois de cada mudança.
3. **Catraca**: descer duas vezes até o mesmo degrau prova que o de cima não se sustenta nesta
   máquina, e ele vira o piso da sessão.

Medido na régua: alternando exatamente no limiar por 4 minutos, a escada muda **6 vezes e
assenta aos 69 s**. Com limiar único (o mutante `sem-histerese`), 20 vezes.

## O que ela NÃO faz

- **Não vira preferência salva.** A escada mexe no runtime; `awpbr_settings` não é tocado. Quem
  escolheu `high` à mão continua com `high` na próxima partida.
- **Não roda no menu.** Só com `game.state === 'live'`: a tela de carregamento tem outro custo e
  enganaria a medição.
- **Não se aplica a quem já está no fundo.** Renderizador de software começa no degrau mínimo,
  porque medir 8 s para descobrir o que o driver já disse é gastar os únicos quadros que essa
  máquina tem.
- **`?adaptativa=0`** desliga tudo, para depurar sem ela no caminho.

## Onde a conta é feita

`public/js/qualidade-adaptativa.js` é política **pura**: sem three, sem DOM, sem `performance`.
É o que torna a régua possível — ela injeta séries de tempo de quadro e lê as decisões. Quem
aplica o degrau é o `loop()` do `main.js`, em cinco linhas.

O elo que faltava para isso funcionar está no `bloom.js`: o `EffectComposer` respeita
`pass.enabled` a cada frame (nada é reconstruído), e os alvos dele agora acompanham o pixel
ratio — antes nasciam com o do boot, e **trocar de qualidade no meio da partida não mudava a
resolução em que o mundo era desenhado** (BUG-163).
