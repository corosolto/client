# ROTEIRO — Time Mítico: rádio, fim de round e Caipora (lote 2, 09/11/2026)

Complementa `ROTEIRO-VOZES-MITICOS.md` (kills + seleção, 30/08). Preenche o que o jogo
já roteia e hoje reaproveitava o bordão de kill:

- `radio` — o personagem **avista** um inimigo e avisa o time (`_botCall` / `NetGame.voice`).
  Curto (≤ 2 s), informativo, com a cara do personagem. Toca a até 55 m do jogador.
- `round` — o time do personagem **levou o round** (`_roundWinnerVoice`). Um pouco mais
  largo (≤ 3 s), comemoração.
- Caipora: todo o conjunto (select, kill, radio, round) — era o único Mítico sem voz.

Regras da casa (iguais ao lote 1): arquétipo, nunca pessoa real; PT-BR; PEGI 12; Zumbi
com dignidade, sem caricatura. Tags `[assim]` só no ElevenLabs (eleven_v3); o Fish recebe o
texto limpo. Vozes: as **mesmas** do lote 1 (`PROVENANCE-v8.md`), para a identidade não
mudar entre kill e rádio.

Gerador: `tools/gerar-vozes-miticos-radio.mjs` (embute esta tabela). 2 tomadas por fala.
Saída: `public/audio/ia/miticos-radio/<id>/<evento>-<slug>-tN-<voz>.mp3` (gitignorado).

---

## Caipora (`caipora`) — Fish Audio, voz nova
> Blurb: "Guardiã da mata, cabelo de fogo e pintura de guerra. Quem caça demais vira caça."

**Direção de voz:** mulher jovem, voz firme e ágil, sotaque interiorano leve (Centro-Oeste /
Norte), autoridade de quem manda na mata — séria onde o Curupira é moleque. Energia de
caçadora, não de bruxa.

| evento | slug | fala |
|---|---|---|
| select | guardia | "A mata tem dona. E hoje ela tá armada." |
| kill | virou-caca | "Virou caça." |
| kill | mata-cobra | "A mata cobra." |
| kill | sem-licenca | "Caçou sem licença." |
| kill | devolvido | "Devolvido pro chão." |
| kill | pisou-errado | "Pisou onde não devia." |
| kill | minha-mata | "Minha mata, minhas regras." |
| radio | farejei | "Farejei um! Ali na frente." |
| radio | rastro | "Rastro fresco. Tem bicho perto." |
| radio | cerca | "Cerca ele comigo!" |
| round | mata-venceu | "A mata venceu. Como sempre." |

## Lampião (`lampiao`) — Fish `fish-nordestino`
| evento | slug | fala |
|---|---|---|
| radio | avistei | "Avistei um, cabra! Na frente!" |
| radio | cerca | "Cerca ele, meu bando!" |
| radio | lascou | "Tem um ali. Lascou-se pra ele." |
| round | sertao | "O sertão é nosso, visse?" |

## Maria Bonita (`mariabonita`) — Fish `fish-nordestina`
| evento | slug | fala |
|---|---|---|
| radio | vi-um | "Vi um. Deixa comigo." |
| radio | ali | "Ali, ó. Mira nele." |
| radio | cobre | "Cobre eu, que eu acerto." |
| round | assina | "Assina embaixo: Maria levou." |

## Saci-Pererê (`saci`) — Eleven `acougueirao`
| evento | slug | fala |
|---|---|---|
| radio | achei | "Achei um! [laughs]" |
| radio | ali-ali | "Ali, ali! Tá vendo?" |
| radio | redemoinho | "Vou de redemoinho nele!" |
| round | ganhamo | "Ganhamo! [laughs] Uma perna só!" |

## Curupira (`curupira`) — Eleven `curupira-vd`
| evento | slug | fala |
|---|---|---|
| radio | pegada | "Pegada nova! Vem cá!" |
| radio | tem-um | "Tem um perdido ali." |
| radio | assobio | "[whistles] Achei ele." |
| round | mata-ganhou | "A mata ganhou de novo." |

## Cuca (`cuca`) — Eleven `cuca-vd`
| evento | slug | fala |
|---|---|---|
| radio | acordado | "Tem um acordado ali." |
| radio | vem-dormir | "[whispers] Vem dormir..." |
| radio | ninar | "Deixa que eu nino esse." |
| round | todos-dormiram | "Todos dormiram. [laughs] Boa noite." |

## Boto Cor de Rosa (`boto`) — Eleven `boto-vd`
| evento | slug | fala |
|---|---|---|
| radio | convidado | "Temos um convidado, meu bem." |
| radio | ali | "Ali. Deixa que eu encanto." |
| radio | rio | "Saiu do rio um. Pra mim." |
| round | rosa-levou | "Rosa levou. Como sempre." |

## Bandeirante (`bandeirante`) — Eleven `artur`
| evento | slug | fala |
|---|---|---|
| radio | rastreado | "Rastreado. À frente." |
| radio | sinal | "Sinal fresco. Um." |
| radio | marco | "Marco a posição. Avança." |
| round | mapeado | "Território mapeado. Nosso." |

## Zumbi dos Palmares (`zumbi`) — Eleven `carlos`
| evento | slug | fala |
|---|---|---|
| radio | inimigo | "Inimigo à frente. Juntos!" |
| radio | avanca | "Avança comigo!" |
| radio | firme | "Firme. Eu cubro." |
| round | palmares | "Palmares vive. Vencemos." |

## Lobisomem (`lobisomem`)
Não fala. `radio`/`round` reaproveitam o set de SFX já integrado (rosnado = avistou,
uivo = round). Nada a gerar.

---

Orçamento: Fish ≈ US$ 0,02 (Caipora 11 + Lampião 4 + Maria 4, ×2 tomadas). Eleven: 6
personagens × 4 falas × 2 tomadas ≈ 1.400 caracteres dos 9.439 disponíveis.
