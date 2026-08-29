<!-- spec:time -->
# 09 — Time Mítico (Brasil lendário, histórico e cultural)

Time de 9 personagens jogáveis: heróis históricos, folclore e literatura brasileira.
Complementa os arquétipos modernos já existentes no jogo — nenhum personagem da
atualidade entra aqui. Sem pessoas reais contemporâneas, sem personagens com
copyright: todos são figuras históricas, folclóricas ou de domínio público.

Regra editorial: cada personagem tem **uma mecânica própria** — ninguém é só skin.

---

## 1. Zumbi dos Palmares — o capitão

- **Visual:** guerreiro quilombola, físico imponente, lança curta e faca de guerra,
  pintura corporal, tecido vermelho na cintura.
- **Papel:** líder/assalto. O personagem de entrada do time.
- **Arma:** rifle de assalto; lança como melee com alcance maior que o padrão.
- **Mecânica:** "Grito de Palmares" — buff curto de velocidade de recarga pra ele e
  aliados próximos (aura de capitão).
- **Nota:** figura histórica reverenciada — tratamento heroico, nunca cômico.

## 2. Maria Bonita — a precisão

- **Visual:** cangaceira com chapéu de estrelas (versão feminina, distinta do
  Lampião), vestido de chita adaptado pra combate, bandoleira cruzada.
- **Papel:** rifle de precisão / média distância.
- **Arma:** rifle de ferrolho.
- **Mecânica:** "Olhar de Rainha" — primeiro tiro depois de parada tem precisão
  aumentada (recompensa posicionamento, pune spray).
- **Nota:** dupla do Lampião, mas personagem própria — não skin feminina dele.

## 3. Saci-Pererê — a mobilidade

- **Visual:** moleque de uma perna só, gorro vermelho, cachimbo, redemoinho de
  poeira nos pés.
- **Papel:** flanqueador/lurker.
- **Arma:** SMG.
- **Mecânica:** "Redemoinho" — em vez de andar, salta numa perna só; apertar a
  habilidade some num redemoinho e reaparece alguns metros à frente (dash com
  breve invisibilidade de fumaça).
- **Nota:** o gorro vermelho é hitbox visível — risco deliberado. Animação de
  pulo é a assinatura cômica dele.

## 4. Lampião — o fuzileiro

- **Visual:** chapéu de couro com estrelas e moedas, bandoleiras cruzadas, óculos
  de couro, roupa do cangaço.
- **Papel:** assalto pesado / supressão.
- **Arma:** rifle automático histórico (visual de mosquete/Winchester adaptado).
- **Mecânica:** "Virgem Maria!" — rajada longa com mais recuo mas dano crescente
  (quanto mais segura o gatilho, mais dano por bala).
- **Nota:** vilão na história real, anti-herói no imaginário — tom de respeito
  ao mito, não apologia.

## 5. Lobisomem — a transformação

- **Visual:** duas formas. Humano: roqueiro do interior, camisa aberta, olheiras.
  Lobo: versão brasileira — magro, crina alta, andar estranho (próximo do
  lobo-guará monstruoso, não do lobisomem de Hollywood).
- **Papel:** assassino de curto alcance.
- **Arma:** pistola (forma humana) / garras (forma lobo).
- **Mecânica:** "Sétima Lua" — medidor de fúria enche com dano causado/sofrido;
  cheio, transforma em lobo por tempo limitado: mais velocidade, salto alto,
  melee devastador, **sem arma**.
- **Nota:** o único personagem de duas formas. Balanceamento mora no tempo de
  transformação.

## 6. Bandeirante — o vilão assumido

- **Visual:** chapéu de abas largas, botas de couro até a coxa, casaco pesado,
  mosquete e espada. O visual mais "conquistador sombrio" do elenco.
- **Papel:** scout/controlador de área.
- **Arma:** mosquete de tiro único (dano alto, recarga lenta) + espada melee.
- **Mecânica:** "Monção" — enxerga pegadas recentes dos inimigos (rastreador;
  contrapartida histórica do Curupira, que engana rastros).
- **Nota:** personagem vilão por definição histórica — entra como o cara que o
  time tolera porque é útil, não como herói. Tom deliberado do dono.

## 7. Boto Cor de Rosa — o pistoleiro do rio

- **Visual:** o golfinho amazônico rosa, sem forma humana, com silhueta aquática
  imediatamente legível e adaptação de suporte para a arma.
- **Papel:** duelista de curta e média distância.
- **Arma:** Deagle.
- **Mecânica:** "Encanto do Rio" — o primeiro disparo depois de sair de cobertura
  reduz por um instante a precisão do inimigo atingido.
- **Nota:** o modelo precisa continuar sendo um boto. Terno branco e homem de
  chapéu descaracterizam a silhueta pedida para o jogo.

## 8. Cuca — a bruxa

- **Visual:** versão do folclore/Lobato (domínio público, †1948): bruxa velha
  com traços de jacaré, vestido esfarrapado, **não** a fantasia da série de TV
  (essa tem copyright).
- **Papel:** controle/zona.
- **Arma:** espingarda (a "vassoura" dela atira).
- **Mecânica:** "Cuco vem pegar" — lança uma poção que cria zona de lentidão e
  visão embaralhada; inimigos na zona ouvem a cantiga distorcida.
- **Nota:** a vilã de infância de todo brasileiro — medo nostálgico, não terror.

## 9. Curupira — o trapaceiro

- **Visual:** menino de cabelo de fogo, pés virados pra trás, corpo pequeno e
  ágil, dentes pontudos.
- **Papel:** reconhecimento/enganação.
- **Arma:** SMG ou pistola silenciada.
- **Mecânica:** "Pés Virados" — as pegadas dele apontam pro lado oposto ao que
  ele foi (contra o rastreador do Bandeirante e contra qualquer sistema de
  rastro futuro); assobio que gera marcador falso no minimapa inimigo.
- **Nota:** protetor da floresta — frases e barks contra quem "derruba o
  cenário" (tiros em árvores/vegetação).

---

## Sinergias pensadas (counter-picks internos)

- **Bandeirante vs. Curupira:** rastreador vs. falsificador de rastro.
- **Lobisomem vs. Cuca:** o lobo fareja através da zona da poção.
- **Zumbi vs. Bandeirante:** o confronto histórico real — barks especiais quando
  um elimina o outro.
- **Boto vs. Saci:** deslocamento imprevisível do rio contra deslocamento por
  redemoinho.

## Próximos passos

1. Aprovar as fichas (este arquivo).
2. Escrever os prompts de geração de modelo (estilo `prompts/`) por personagem.
3. Gerar e integrar os 9 modelos (seleção de personagem já tem spec em
   `prompts/UI-selecao-personagem.md`).

## Fora do time (banco de reservas)

Iara · Zé Pilintra · Passista de Frevo · Caboclo de Lança (Maracatu) ·
Homem da Meia-Noite · Boitatá · Mula-sem-cabeça (candidata a boss/evento) ·
Tiradentes · Anita Garibaldi · Dandara · Tereza de Benguela · Santos Dumont ·
Boi-bumbá (genérico — Garantido/Caprichoso são marca registrada)
