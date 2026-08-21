# LIÇÕES

> Memória entre sessões. Cada item aqui **custou** — foi pago com defeito em
> produção, com o dono reprovando o mesmo trabalho duas vezes, ou com horas gastas
> num raciocínio bonito que não mordeu. Sem este arquivo, todo agente novo
> redescobre os mesmos buracos e paga de novo.
>
> **Regra de entrada:** só entra lição com PROCEDÊNCIA — o caso real, o número
> medido, e o commit. Lição sem caso é opinião, e opinião envelhece sem avisar.
>
> **Regra de saída:** quando uma lição vira mecanismo (régua, portão, tipo que não
> compila), ela FICA aqui e ganha o ponteiro para o mecanismo. O mecanismo é que
> impede a repetição; o texto explica por que ele existe.

---

## 1. Régua que mede numa direção é cega na outra

A `graffiti-census` responde *"quanto da parede tem tinta"*. Levou a Quebrada de
12,7% a 87% de cobertura. E era **estruturalmente incapaz** de ver o defeito
oposto — tinta sem parede: uma peça flutuando não derruba a cobertura, ela a
**melhora**, porque cobre a placa que está atrás dela.

O dono viu o que a régua não via: *"tem grafites no ar entre o muro e a parte de
vidro"*. Foram **698 peças no ar** em 5 mapas, com o portão verde.

**Ao escrever uma régua, pergunte qual defeito ela PREMIA.** Se existir um estado
ruim que aumenta o número, escreva a régua irmã antes de comemorar.

→ mecanismo: `tools/eval/graffiti-audit.mjs` · commit `48169bd`

## 2. Duas réguas com limiar diferente = o instrumento discordando de si

Dois consertos seguidos que deveriam derrubar o "no ar" mal moveram o número
(451 → 445 → 445). A causa não estava em nenhum dos dois: a passada aceitava **1
amostra vazia de 5** (20% de buraco) e a auditoria reprovava **acima de 2 de 15**
(13%). Peça nascia aprovada num lado e reprovada no outro.

Alinhar os dois limiares — e só isso — levou o número de **688 para 272**.

**Duas coisas que medem o mesmo conceito têm que compartilhar o limiar, de
preferência a função.** Quando não dá, o número de cada uma precisa dizer contra
qual limiar foi medido.

→ commit `b944bdb`

## 3. A régua e o jogo têm que rodar no MESMO mundo

`decal-probe` roda em node, onde **nenhum GLB carrega**. Ela jurava 334 decalques
na Quebrada; no navegador havia **96**. As 238 restantes morriam num `return null`
silencioso porque a fachada ainda não existia — os barracos são `InstancedMesh`
criados na penúltima linha do build, e os decalques eram colados antes.

O dono contou "10-15% de arte urbana". A régua nova, rodando no navegador, mediu
**12,7%**. Ele estava certo por três dias enquanto o portão dizia verde.

**Se o jogo carrega assets, a régua que mede assets precisa de navegador.**
Régua em node é mais rápida e mede outro jogo.

→ mecanismo: `npm run eval:grafite` · commit `5da7fc0`

## 4. Foto ganha de raciocínio

Duas hipóteses minhas sobre o "grafite no ar" eram coerentes, bem argumentadas, e
**erradas** — a primeira custou um conserto que moveu o número em 6 peças (451 →
445). A causa real apareceu na primeira captura olhada: o pixo **atravessa a viga e
continua sobre o vão da porta**, com parede só numa ponta.

**Quando o número não move depois de um conserto que deveria movê-lo, pare de
raciocinar e olhe.** Toda régua visual deveria ter um `--fotos N`.

→ `node tools/eval/graffiti-audit.mjs quebrada --fotos 8`

## 5. Falha silenciosa é a classe de defeito mais cara desta base

Cinco casos, todos reais, todos com o portão verde:

| onde | o que engolia |
|---|---|
| `decal()` dos 5 mapas | `return null` quando não achava parede — 238 peças sumiam |
| `map_decals` / `harness` | `try {} catch {}` mudo escondendo `EEXIST` de symlink |
| `/api/online` | `catch` devolvia o MESMO `null` de "não configurado" e de "query explodiu" |
| textura 404 | three não erra: desenha **branco chapado** |
| `gen-docs` | régua não reconheceu o LICENSE novo, devolveu `null` e **seguiu em frente** |

**Não saber tem que custar o mesmo que estar errado.** `null` com cara de fato é
pior que exceção.

→ mecanismos: `esconderSeFaltar` (graffiti_pass) · `assert:assets` · o bloco
`LICENCAS_CONHECIDAS` em `gen-docs.mjs`

## 6. `if (CONSTANTE_DE_TEXTO)` é sempre verdadeiro

`/api/online` tinha `if (NOT_CONFIGURED)`. `NOT_CONFIGURED` é o **corpo** da
resposta 503 — `JSON.stringify({...})`, string não vazia, sempre truthy. A rota
devolvia `{"online": null}` **sem nunca consultar o banco**, e o `try/catch` abaixo
nunca rodou uma vez. Todas as outras rotas testam `!supabaseAdmin` e usam
`NOT_CONFIGURED` como corpo; só essa trocou as duas coisas.

Nenhum teste de tipo pega: `if (string)` é JavaScript válido.

**Constante exportada que é DADO não pode ter nome de PREDICADO.** E ao ver uma
guarda que nunca falha, teste-a.

→ commit `e5c576d`

## 7. Bloco gerado com gêmeo não-gerado mente na tradução

`gen-docs` regenera `docs/docs/*.md`. As traduções em
`docs/i18n/en/.../current/` carregam **os mesmos marcadores** `BEGIN:GERADO:` e
nunca são regeradas. Depois da migração para AGPL, `/docs/licenca` dizia
"GNU AFFERO" e `/docs/license` continuava dizendo **"the code is under the MIT
License"**. Uma página pública de licença declarando a licença errada. O `/about`
em inglês idem.

**Todo conteúdo gerado que tem cópia precisa de uma régua que compare as cópias**
— mesmo quando gerar a cópia automaticamente não é possível.

→ mecanismo: guarda de tradução em `gen-docs --check` · commit `07006c4`

## 8. Mutação que não aplica parece mutação que passou

Plantei `**MIT License**` num arquivo para provar que o guarda mordia. O `replace`
**não casou** (o texto já tinha sido reescrito), o `--check` deu verde, e por um
instante isso pareceu "o guarda funciona".

**Toda mutação tem que falhar se não aplicou.** `assert texto_novo != texto_velho`
antes de rodar a régua. Sem isso, o teste do teste é decorativo.

## 9. Rosto de pessoa real não se gera de memória

Gerei um mural de homenagem ao Marcelo Yuka com um homem **negro de dreadlocks**.
Ele era de pele clara, barba escura cheia e cabelo ondulado — duas fontes
independentes (Wikimedia Commons e a foto oficial do TSE de quando foi candidato a
vice do Rio) concordam. Num mural de homenagem, isso é pintar o rosto de outra
pessoa.

Pior: das três imagens que baixei como referência, **duas não serviam** (uma era
uma roda de conversa numa sala). Só descobri porque **abri cada uma**.

**Sem foto conferida a olho, o resultado é confiante e errado.** E prefira acervo
de licença livre (Commons) a foto de agência — `references/` é gitignored, então a
referência entra como insumo e não é redistribuída.

→ commit `61d7cf1`

## 10. Prefiltro espacial antes de raycast em massa

Duas vezes na mesma semana: a passada de grafite levou **8,9 s** e a auditoria
**mais de 10 min**, as duas por atirar dezenas de milhares de raios contra a lista
inteira de malhas do mapa. Os raios têm menos de 1 m; só malha vizinha pode ser
acertada.

Com uma grade espacial de 3-4 m, a passada caiu para **~2 s com resultado idêntico**
— prefiltro geométrico não é aproximação.

**Raycast em massa contra cena inteira é sempre erro.** E a grade tem que ser
compartilhada, não copiada: `gradeEspacial` é exportada de `graffiti_pass.js` e a
auditoria a reusa.

## 11. Custo de build tem orçamento, e é de milissegundos

A passada de grafite media 8,9 s no build do mapa. O build **inteiro** do Piscina
custa 88 ms. Não há micro-otimização que feche 100×.

A saída foi ASSAR: a colocação é função pura de (geometria, semente), então roda
uma vez offline e é versionada (`graffiti_layout.js`). No jogo, 6 ms.

**Quando o cálculo é caro e determinístico, pergunte se ele precisa rodar no
cliente.** E o risco novo que assar cria — resultado velho — vira item de régua,
não de confiança.

## 12. Produção builda de clone puro, e sua máquina mente

Os dois `fetch-*.sh` começam com early-exit ("já configurado"). **Na máquina de
quem desenvolve o caminho de download nunca roda.** Só roda na Vercel.

Consequências reais: o `fetch-audio.sh` copiava `manifest.example.json` (62
caminhos) por cima quando o zip não trazia o real (308) e o build passava **verde**
com o jogo mudo. E o pacote de decalques publicado tinha 174 arquivos enquanto o
jogo pedia 196 — **513 peças de grafite sumiam em produção, 30% da Quebrada**.

O build limpo em clone descartável achou os dois, mais um terceiro: o atalho do
`three` que o arnês plantava FORA do projeto e que deixava qualquer checkout novo
com as ~150 réguas quebradas.

**Teste o caminho que só produção percorre, num clone descartável.**

→ mecanismos: `npm run assert:assets` · `npm run setup` · commits `d0c47b4`,
`5f92989`

## 13. A ordem entre passadas é decisão de arte, não detalhe

`pendurarMurais` rodava **depois** de `pintarParedes` e não sabia o que já estava
pintado: três sobreposições com o quad menor **inteiro** dentro do maior (223%,
212%, 211%). O mural de homenagem — a peça grande, escolhida a dedo — nascia por
baixo de tag sorteada.

Inverter a ordem e passar as vagas ocupadas levou as sobreposições de **1.152 para
55** na Quebrada.

**Quem escolhe a dedo entra primeiro; o preenchimento desvia.**

## 14. Índice desliza calado; nome não

Pools de decalque nasceram como índices no `DECAL_FILES`. Remover 3 recortes
deslocou **80 índices** e os 5 mapas passaram a apontar para arte errada **sem
erro nenhum** — o índice continua válido.

**Referência a conteúdo gerado usa NOME.** Vale para `decalIds`, para o layout
assado do grafite e para qualquer lista que um gerador reescreva.

---

## 15. Preload carrega o que a cena usa, e quem corta a espera responde pela cena

`main.js` chamava `preloadCharacterAssets([...GLB_CHARS])` antes de construir o
Game: **62 personagens, bloqueando**, para pôr 8 bonecos em campo. Medido pela
`eval:preload-roster`: 63 GLBs baixados antes de o jogador ver qualquer coisa.

Três coisas que o conserto ensinou, e que valem para qualquer preload desta base:

- **Quem preloada tem que saber o que a cena vai usar.** O elenco é sorteado por
  `pickMatchRoster` (game.js) e passado pronto ao Game em `matchRoster`. Sortear
  DUAS vezes daria elencos diferentes e o preload erraria o alvo **em silêncio**
  — a classe de defeito da lição 5.
- **Carga tardia espera a cena ficar de pé.** Soltar o resto junto da contagem
  regressiva rouba banda e decode do primeiro segundo jogável, e a régua continuou
  vermelha em 62 igual a antes do conserto. Hoje espera o `live`.
- **Quem corta a espera responde pelo que aparece.** `_switchTeam` (tecla M)
  sorteava qualquer personagem da facção; com preload enxuto isso poria um boneco
  de caixa procedural em campo. Trocar espera por feiura é pior que a espera —
  hoje o sorteio prefere quem tem GLB em memória. É a cláusula PL2.

Resultado: 63 → 9 GLBs no preload bloqueante. Régua, cláusulas e mutantes
(`?preloadall=1`, `?preloadlazy=0`) em `SCRIPTS.md`, `eval:preload-roster`.

### Equilíbrio de times (o que já morava no `game.js`)

`cycle` devolve `[]` quando o pool é VAZIO — `pool[i % 0]` é NaN → undefined e o
`.filter(Boolean)` limpa tudo. Uma facção sem personagens suficientes produzia um
time MENOR **sem nenhum aviso** (jogador sozinho contra 8). Hoje as facções têm
8-9 personagens e a conta fecha — medido, enumerando as 16 combinações
facção×inimigo × teamSize 1..8: todas dão N vs N. O bug é LATENTE: basta uma
facção entrar com 1 personagem para ele voltar, de novo em silêncio. `roster`
fecha isso: SEMPRE devolve `want` combatentes (repetir personagem é aceitável;
time menor não é) e AVISA no console quando repetiu ou recorreu ao elenco geral.

---

## Como usar este arquivo

- **Antes de escrever régua:** leia 1, 2, 3, 4.
- **Antes de mexer em asset ou build:** leia 5, 11, 12, 14.
- **Antes de mexer em preload ou em quem entra na cena:** leia 15.
- **Antes de gerar arte com pessoa real:** leia 9.
- **Quando o portão estiver verde e o dono disser que está errado:** leia 1 e 3.
  Esse caso é o mais importante desta base, e o mais mal resolvido.
