# Roteiro de teste — 5 minutos, 8 perguntas

Rode `npm run dev` e jogue. **Responda só sim/não** e me mande a lista. Cada "não" que
você marcar vira uma invariante permanente em `tools/eval/invariants.mjs` — é assim que
o bug não volta na rodada seguinte.

Não precisa procurar problema. Se você não notar nada, a resposta é "sim".

---

**1. A arma que aparece na tela é reconhecível como aquela arma?**
Troque entre AK, AWP, UZI, Deagle, revólver .38, MD97. Em 1 segundo, sem olhar o nome no
canto, dá pra dizer qual é?
`sim / não — quais falharam:`

**2. O cano aponta pra onde a mira aponta?**
Mire no meio do mapa e atire. O clarão e o rastro saem da boca do cano, e o tiro acerta
onde a mira estava?
`sim / não`

**3. Ao mirar (botão direito) você vê a arma E a mira?**
Teste com um rifle e com uma sniper. A sniper tem luneta de verdade?
`sim / não — o que faltou:`

**4. As animações leem?**
Recarregue, troque de arma, dispare em rajada. Alguma hora aparece um frame vazio, duas
armas ao mesmo tempo, ou a arma "pula"?
`sim, leem / não — qual momento:`

**5. Quando você morre, você entende de onde veio o tiro?**
Tem um arco na borda apontando o atirador, e o painel de morte diz quem/arma/distância/lado?
`sim / não`

**6. Dá pra distinguir aliado de inimigo num olhar?**
Repare no halo no chão (contínuo = aliado, tracejado = inimigo) e no chevron acima da
cabeça (cheio = aliado, vazado = inimigo). Teste também um confronto de time igual.
`sim / não`

**7. Os bots parecem gente?**
Ainda ficam andando de lado, travando, ou girando em torno de si mesmos? Ainda matam
"do nada" sem você ter tempo de reagir?
`parecem gente / ainda não — o que viu:`

**8. O chão está limpo?**
As armas do arsenal agora ficam **em cima de mesas, atrás do spawn**. Sobrou alguma
espalhada no meio do mapa, na linha de tiro?
`limpo / não — onde:`

---

## Bônus, se sobrar tempo

- **Modo:** no card do mapa, o badge "ROUNDS / CAPTURE THE FLAG" agora é **clicável**.
  A Loja H e o Ferro Velho abrem em CTF mas dá pra trocar. Funciona?
- **Piscina:** o mapa `fy_pool_day` voltou a ser o salão fechado do CS 1.6 ("Piscina da
  Treta"). Ficou melhor que o Piscinão?
- **Loja H:** o letreiro da fachada lê "LOJA H"?

## Se quiser me dar mais material

Grave 30-60 s de gameplay e jogue o vídeo em `issues/`. Eu extraio os frames, monto a
tira e leio o movimento — pra defeito de feel isso vale mais que qualquer captura que eu
faça sozinho de bot.
