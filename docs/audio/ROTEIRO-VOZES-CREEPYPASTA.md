# ROTEIRO — Creepypasta Season (lote 3, batch 1, 10/11/2026)

Primeiro lote de vozes do elenco novo (`client/worktrees/concepts-lote30-20261105`,
fichas ainda fora do roster; vozes ficam prontas em `characterVoice.<id>` para quando o
elenco entrar). Batch 1 = 14 leads.

Casting:
- **Capitão Caveira** = modelo comunitário Fish "Capitão Nascimento"
  (`102bccca7dc64b6b8f8494c199c5d153`). **EXCEÇÃO À REGRA DA CASA autorizada
  verbalmente pelo dono (Ruben, 10/11)**: a regra "nenhuma voz imita pessoa real"
  (PROVENANCE-v8) vale para todo o resto; o dono escolheu este modelo para este
  personagem. A exceção é só dele e revogável.
- Demais 13 = ElevenLabs Voice Design, uma voz POR personagem (arquétipo descrito,
  nada de pessoa real). Mesma voz nos 4 eventos — identidade não muda entre kill e
  rádio (lição do pool M).

Eventos: `select` (frase longa da tela), `kill` (curto, ≤ 1,5 s), `radio` (aviso de
contato, informativo), `round` (comemoração). PT-BR, PEGI 12: terror cômico, sem gore
verbal. Gerador: `tools/gerar-vozes-creepypasta.mjs`. Saída:
`public/audio/ia/creepypasta/<id>/<evento>-<slug>.mp3` (gitignorado).

---

## capitao-caveira (Fish/Nascimento) — comando seco, raiva contida
| select | "Aqui é o Caveira. Pediram peso, trouxe o pelotão." |
| kill | "Abatido." | "Um a menos." |
| radio | "Contato à frente. Segura." | "Ali. Não deixa fugir." |
| round | "Missão cumprida. Próxima." |

## barbudo-creepy — velho meigo com sussurro errado por baixo
| select | "Cheguei pra ficar... para sempre, aliás." |
| kill | "Já cuidamos disso, né?" | "Não foi nada. Nada mesmo." |
| radio | "Tem alguém aí... e não sou eu." | "Escuta. Tem coisa andando." |
| round | "Viu? No fim, todo mundo junto." |

## bicheiro-barracao — chefe de jogo do bicho, velho Rio, calma ameaçadora
| select | "Senta aí. O barracão hoje é meu." |
| kill | "Apostou errado, campeão." | "Preço de não pagar, ô." |
| radio | "Tem infeliz na área. Cercem." | "Tô vendo o movimento, ô." |
| round | "Deu bicho pra gente. Deu tudo." |

## chapeleiro-maluco — excitação vitoriana, frase quebrada, relógio na voz
| select | "Que horas são? Que dia é? Que IMPORTA — chá?" |
| kill | "Sem chapéu, sem vez!" | "Tarde! Tarde demais!" |
| radio | "Ali! Não, ali! Não, ALI!" | "Um convidado! Que hora o chá?" |
| round | "Ganhamos! Ou perdemos? Ganhamos!" |

## corisco — cangaceiro seco de 1936, vingança na voz
| select | "Corisco não morre. Tá provado." |
| kill | "Morreu de sorte, cabra." | "Riscado do bando." |
| radio | "Tem macaco na trilha." | "Visto um. Perto." |
| round | "O bando comeu. Como sempre." |

## coronel-arrego — coronel de gabinete, gorducho satisfeito, tudo é propina
| select | "Aqui quem arrega sou eu. Sempre fui." |
| kill | "Resolvido. Sem papelada." | "Já era. Próximo assunto." |
| radio | "Tem encreca lá fora. Resolvam." | "Relatório: um na área." |
| round | "Arrego pra cá, arrego pra lá." |

## dama-creepy — doçura de avó com faca por baixo
| select | "Pode chegar, meu filho. A dama cuida de você." |
| kill | "Dorme, querido. Pra sempre." | "A dama não gosta de repetir." |
| radio | "Tem visita, meu bem." | "Anda algo no quintal." |
| round | "A mandioca deu pão pra todos." |

## dom-pedro-i — imperador teatral, pompa fora de época
| select | "Independência ou... ah, esquece. Grito ou morte." |
| kill | "Independência... da sua vida!" | "Cortado pelo Império!" |
| radio | "Um rebelde à frente! Às armas!" | "Vistes? Eu vi. Avante!" |
| round | "O Império prevaleceu!" |

## dracula — conde eslavo lento, sedoso, fome civilizada
| select | "Entrem. O jantar... éramos nós? Não. Entrai." |
| kill | "Agradável. Agradecido." | "O vinho era teu, eu sei." |
| radio | "Sinto o cheiro... à frente." | "Hospede se aproxima." |
| round | "A noite é nossa. De novo." |

## padre-parapsicologo — velho cético de TV, ciência e terço
| select | "Padre, parapsicólogo, e cético. Explica aí." |
| kill | "Reza, porque eu já medi." | "Energia dispersa. Amen." |
| radio | "Anomalia à frente. Anoto." | "Presença detectada. Que chatice." |
| round | "Explicado. Como sempre." |

## pm-arrego — PM gordo de óculos escuros, tudo se resolve com troco
| select | "Aqui o arrego tem desconto. Volte sempre." |
| kill | "Autuado. Bem autuado." | "Multa paga, meu amigo." |
| radio | "Tem um ali. Sem recibo." | "Movimento suspeito. Meu." |
| round | "Fechou o mês. Fechou." |

## ministro-creepy — toga, gravidade sinistra de tribunal
| select | "A sessão está instalada. Para sempre." |
| kill | "Julgado. Sem recurso." | "Cumpriu a sentença." |
| radio | "Há um réu à frente." | "Determino: cerque." |
| round | "Decisão unânime. Nossa." |

## vlad-creepy — voivoda antigo, guerra e estaca na mesma frase
| select | "Vlad recebe. O império do medo é pontual." |
| kill | "Empalado. Tradução: abatido." | "Um poste a mais na estrada." |
| radio | "Inimigo à frente. Que bênção." | "Sangue novo na área." |
| round | "Wallachia vence. Eu venço." |

## tiradentes-creepy — mártir que voltou, dente a dente
| select | "Esquartejaram-me uma vez. Voltei inteiro. Quase." |
| kill | "Liberdade custa. Paguei por você." | "Enforcado? Você. Não eu." |
| radio | "Tirania à frente. Avante!" | "Vejo um opressor." |
| round | "A Inconfidência venceu!" |
