---
id: arquitetura
title: 'Arquitetura: N agentes no mesmo arquivo'
sidebar_label: Arquitetura
sidebar_position: 5
description: A arquitetura de verdade, gerada por tools/gen-arch.mjs — e o mecanismo de faixas de linha disjuntas que permite agentes em paralelo sem colisão.
---

# Arquitetura: N agentes no mesmo arquivo

## Por que este documento é gerado por script

O `tools/eval/ARCH.md` não é escrito à mão. Ele é gerado por `node tools/gen-arch.mjs`,
e a razão está no cabeçalho do script (`tools/gen-arch.mjs:5-8`):

> O `ARCH.md` escrito à mão dizia "game.js (3234 linhas)" quando o arquivo tinha 5361.
> Todos os ponteiros `arquivo:linha` da tabela de conflito estavam deslocados — e essa
> tabela é justamente o que impede dois agentes (ou dois contribuidores) de editarem a
> mesma região. Um índice por número de linha escrito à mão desatualiza no primeiro
> commit; a única correção é gerar.

E a separação que faz isso funcionar (`tools/gen-arch.mjs:11-13`):

```
frente -> SÍMBOLO   = conhecimento humano, estável, vive nas FRENTES do script
símbolo -> LINHA    = volátil, é o que este script resolve toda vez
```

O `ARCH.md` antigo cravava **frente → linha**, misturando os dois prazos de validade. É
uma ideia pequena com consequência grande: a partição de trabalho é declarada em termos
que não mudam (nomes de método), e a resolução para coordenadas voláteis (números de
linha) é recalculada a cada execução.

:::note O `arch:check` está VERMELHO agora — e isso é a melhor demonstração da página
`npm run arch` e `npm run arch:check` existem hoje no `package.json` da raiz, e o cheque
não está passando:

```
$ npm run arch:check
✗ ARCH1  ARCH.md está DESATUALIZADO em relação ao código.
         game.js tem 6428 linhas; o índice do ARCH.md não bate.
         Rode: npm run arch
```

A mensagem induz ao erro de propósito: ela **fala de linhas porque é o resumo que sabe
imprimir**, mas o que o `--check` compara é o bloco gerado inteiro, byte a byte — e esse
bloco carrega também o número de versão do jogo. Índice de símbolo certo e versão velha dá
a mesma vermelha. Um comando resolve.

Cuidado que continua valendo: no CI o passo está com `continue-on-error: true`, então o
cheque roda mas **não bloqueia** — foi exatamente por isso que ele conseguiu ficar
vermelho sem que ninguém percebesse. Tirar essa linha é o que o transforma em quality gate de
verdade.
:::

## Os arquivos indexados

Tamanho dos arquivos que o `gen-arch.mjs` indexa — bloco gerado, regenerado por
`npm run docs` e conferido por `npm run docs:check`:

{/* BEGIN:GERADO:arquivos — não edite à mão, rode `npm run docs` */}

| Arquivo | Linhas |
|---|---:|
| `public/js/game.js` | 7.389 |
| `public/js/main.js` | 3.395 |
| `public/js/characters.js` | 1.068 |
| `public/js/glbchars.js` | 844 |
| `public/js/vmattach.js` | 628 |
| `public/js/weapons.js` | 353 |
| `public/js/springs.js` | 260 |

Total de `public/js/`: **42.732 linhas em 78 arquivos**. O índice símbolo→linha, com a tabela de conflito, é outro bloco gerado: `tools/eval/ARCH.md` (`npm run arch`).

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: ``git ls-files public/js/*.js | xargs wc -l``

{/* END:GERADO:arquivos */}

### Os maiores métodos de `game.js` — onde o conflito mora

Esta tabela **não é reproduzida aqui**, e a razão é a própria tese da página: ela é
`linha → método`, o lado volátil da separação, e duplicá-la numa página de prosa cria uma
segunda cópia que envelhece sozinha. Ela vive gerada, num lugar só:

```bash
npm run arch                        # regenera tools/eval/ARCH.md
node tools/gen-arch.mjs --json      # o índice cru, para outra ferramenta
```

O que **não** envelhece, e por isso fica escrito aqui: `_updateBot()` é de longe o maior
método do arquivo e está marcado pelo próprio índice como **candidato a extração**;
`constructor()`, `update()` e `_dom()` são **zona vermelha, append-only**, porque qualquer
frente pode precisar deles. Método grande = PR irrevisável e merge conflitante — extrair
`_updateBot` é trabalho de valor alto e risco médio, e exige coordenar antes, porque a
região é disputada.

## Faixas de linha disjuntas

Este é o mecanismo que permite vários agentes (ou contribuidores) editarem o **mesmo
arquivo** — o maior do repositório, com milhares de linhas — ao mesmo tempo, sem conflito
de merge.

### Como funciona

1. **Cada frente declara SÍMBOLOS, nunca linhas.** Em `tools/gen-arch.mjs:32-73`, a
   constante `FRENTES` lista, por frente, três coisas: `arquivos` exclusivos, `simbolos`
   (métodos) e `consts` (constantes de topo). Exemplo, a frente ARMAS/VIEWMODEL possui
   `_buildViewModels`, `_vmFrame`, `_tryShoot`, `_shotRecoil`… e as constantes `WEAPONS`,
   `VM_FOV_DEFAULT`, `VM_OFF`, `REC_DEG`.
2. **O script indexa o arquivo e resolve símbolo → faixa.** `indexar()`
   (`tools/gen-arch.mjs:80-111`) varre o arquivo linha a linha com três padrões: método
   de classe (exatamente 2 espaços de indentação), **método-arrow atribuído em runtime**
   (`this._vmFrame = (force) => {`) e declaração de topo. O fim de cada símbolo é o
   início do próximo.
3. **Faixas contíguas são fundidas** (gap ≤ 12 linhas) para a tabela ficar legível
   (`tools/gen-arch.mjs:172-178`).
4. **Sobreposição entre frentes é detectada**, porque uma tabela de conflito que se
   contradiz é pior que nenhuma (`tools/gen-arch.mjs:190-200`).

O detalhe do passo 2 vale destacar: a v1 do script só via métodos de classe, e por isso
`_vmFrame` — cerca de 100 linhas que nascem **dentro** de outro método, como arrow que
fecha sobre variáveis locais — ficava **invisível no índice**
(`tools/gen-arch.mjs:95-97`). Um índice que não vê o método mais disputado do arquivo é
pior que nenhum índice, porque dá falsa confiança.

### A tabela de conflito

Do `tools/eval/ARCH.md` (bloco gerado — as faixas abaixo são as da geração anterior; rode
`node tools/gen-arch.mjs` para as de hoje):

| Frente | Arquivos exclusivos |
|---|---|
| **ARMAS / VIEWMODEL** | `vmattach.js` `springs.js` `weapons.js` `fparms.js` `handik.js` |
| **BOTS / JOGABILIDADE** | — (só faixas em `game.js`) |
| **MAPAS / MUNDO** | `maps.js` `mapprops.js` `map_brasilia.js` `map_havan.js` `map_piscina.js` `map_piscinao_ramos.js` `map_ferrovelho.js` |
| **GRÁFICOS / FX** | `bloom.js` `textures.js` `vao.js` `stylize.js` `gpuparticles.js` |
| **UI / HUD / MENU** | `main.js` `public/style.css` `src/pages/index.astro` |
| **ÁUDIO** | `audio.js` |
| **PERSONAGENS** | `characters.js` `glbchars.js` |
| **SITE / BACKEND** | `src/` |

:::caution Dois arquivos de mapa NÃO têm dono declarado
`map_quebrada.js` (1.319 linhas, o mapa mais novo) e `map_decals.js` **não aparecem em
frente nenhuma** de `tools/gen-arch.mjs` — a lista acima é cópia fiel do `FRENTES`, e eles
não estão lá. Quem editar os dois não colide com ninguém *segundo a tabela*, que é
justamente a garantia que a tabela deveria dar e não dá. Acrescentá-los é uma linha em
`tools/gen-arch.mjs` seguida de `npm run arch`.

(O `map.js` já foi listado aqui e **não existe mais**: era a "Praça (clássico)", apagada
junto com o mapa `praca_old`.)
:::

### As zonas vermelhas

Três métodos são **append-only**, porque qualquer frente pode precisar deles
(`tools/gen-arch.mjs:75-77`):

- `update()` — o loop
- `_dom()` — o wiring de HUD
- `constructor()` — um dos maiores métodos do arquivo (o tamanho de hoje está no `ARCH.md`)

Editar o miolo destes é o jeito mais rápido de dois contribuidores se atropelarem.
Acrescente no fim; não reorganize.

### As regras operacionais

- **Declare sua frente antes de editar.** Se for um PR humano, diga na descrição.
- **Em `game.js`, use edição por trecho — nunca sobrescreva o arquivo inteiro.** Uma
  ferramenta que reescreve o arquivo apaga o trabalho de quem está na outra faixa.
- **Duas frentes com faixas disjuntas rodam em paralelo.** O `ARCH.md` gerado registra
  que isso foi medido: *"3 agentes editaram faixas disjuntas simultaneamente com zero
  conflito de conteúdo"* (`tools/gen-arch.mjs:163`).
- **Mexeu num símbolo? Mova o nome na declaração da frente, não o número.** O script
  avisa quando um símbolo declarado some do código.

:::tip Por que isso importa pra você, humano
A mesma partição que evita colisão entre agentes é o que torna um PR seu revisável. Um
PR que toca `_updateBot` + `style.css` + `map_havan.js` é três PRs escondidos num só, e
vai colidir com três frentes diferentes. Um PR por frente entra rápido.
:::

## As três zonas do repositório

```
public/     jogo      vanilla ES modules, zero build, Three.js vendorizado
src/        site      Astro + adapter Vercel, API routes SSR
tools/      arnês     scripts .mjs/.py — a régua, o quality gate e as sondas
```

Versões, contagens e o que cada ferramenta faz estão em
[Stack e ferramentas](./stack.md) — **gerado**, não escrito à mão.

O acoplamento entre elas é deliberadamente fino e vale entender:

- **O site carrega o jogo por import map**, em `src/pages/index.astro:97-123`. É o único
  ponto onde o Astro sabe da existência dos módulos do jogo.
- **O arnês carrega o jogo direto do disco**, sem browser: `tools/eval/harness.mjs` stuba
  DOM/canvas/`fetch` e importa `public/js/game.js` como módulo. Por isso o quality gate mede o
  código de produção, e não uma reimplementação.
- **`tools/eval/serve.mjs:15`** faz a ponte pro caso de teste: serve `public/` e mapeia
  `/` para o fonte do `index.astro`, sem Astro no caminho.

### Consequência prática

O jogo **não pode** ganhar dependência de runtime nem passo de build. Isso não é
conservadorismo: é o que faz `harness.mjs` conseguir subir a classe `Game` em node puro
em segundos, que é o que faz o quality gate existir. Um bundler no meio quebraria a régua junto
com a portabilidade.

## Sistema de dados de conteúdo

Hoje mapas, armas e personagens são **código**: cada `map_*.js` é geometria declarada à
mão, e os maiores deles rivalizam em tamanho com os módulos de sistema. A direção
"conteúdo como dado" do
[`docs/ROADMAP.md`](https://github.com/rubenmarcus/csbrasil/blob/main/docs/ROADMAP.md)
quer migrar isso para JSON com loader único, para que uma contribuição de conteúdo seja
*"abre um JSON e cria conteúdo"* em vez de *"um PR de código hand-coded arriscado"*.

Se você quer o trabalho de maior alavancagem no projeto inteiro, é esse. Ver
[Estado atual](./estado.md).

## O que é gerado, e o que não é

Duas coisas neste repositório são geradas por script, e pela mesma razão:

| Gerado | Script | Quality gate |
|---|---|---|
| `tools/eval/ARCH.md` — índice símbolo→linha e tabela de conflito | `tools/gen-arch.mjs` | `npm run arch:check` |
| Os blocos numéricos de `README.md` e desta documentação | `tools/gen-docs.mjs` | `npm run docs:check` (no `check:fast`) |

A regra que separa o que entra e o que fica:

- **Derivável do código?** Vira bloco gerado, entre marcadores, com `--check` no quality gate.
  Contagem de linhas, de personagens, de armas, de mapas, de scripts, de invariantes,
  versão, lista de scripts do `package.json`, versão de dependência.
- **Não derivável?** Então é decisão ou explicação — e **não deve conter número que
  envelhece**. Escreva sem o número, ou cite o comando que o produz. O placar do quality gate,
  por exemplo, depende de qual insumo existe na máquina: ele mora colado de uma execução
  real no `KNOWN-BUGS.md`, não repetido em cinco páginas.

E o motivo de o `--check` estar no quality gate, não só disponível: **o que não vira régua é
otimizado para fora.** Um gerador que ninguém é obrigado a rodar desatualiza em uma semana,
e aí a documentação volta a mentir com a aparência de rigor — que é pior do que mentir sem
ela.

:::danger Onde você põe o quality gate novo na corrente importa
O `check:fast` é uma corrente de `&&`: o primeiro erro corta o resto. O `arch:check` está
vermelho há dias, então **todo quality gate colocado depois dele nasce morto** — roda zero vezes
e ninguém percebe, porque a saída para antes. Foi exatamente o que aconteceu na primeira
versão do `docs:check`, e é o mesmo modo de falha do BUG-02 (o quality gate medindo o viewmodel
de ontem porque o `&&` cortava antes de o JSON ser regenerado).

Por isso o `docs:check` vem **antes** do `arch:check` no `package.json`, com o motivo
escrito no `SCRIPTS.md` (chave `check:fast`). Quando o `ARCH.md` for regenerado e o `arch:check` voltar
a verde, a ordem deixa de importar; até lá, importa.
:::

Colar um bloco novo é escrever o marcador e rodar `npm run docs`:

```
{/* BEGIN:GERADO:NOME_DO_BLOCO — não edite à mão, rode `npm run docs` */}
{/* END:GERADO:NOME_DO_BLOCO */}
```

(`NOME_DO_BLOCO` é uma das chaves do objeto `BLOCOS` no topo do `gen-docs.mjs`. Bloco
declarado que ninguém consome vira aviso alto na saída — bloco órfão é código morto que
finge ser documentação.)

Em Markdown puro (`README.md`) o marcador é comentário HTML (`<!-- BEGIN:GERADO:… -->`).
Nas páginas desta doc é comentário **MDX** (`{/* … */}`): o Docusaurus 3 compila `.md`
como MDX, e comentário HTML ali é erro de parse que derruba o build. O gerador aceita as
duas sintaxes e preserva a que encontrar.

### O que o gerador NÃO resolve: ponteiros `arquivo:linha` na prosa

Um `game.js:5361` escrito no meio de um parágrafo é a versão barata do mesmo defeito — ele
aponta pro lugar errado no primeiro commit que mexer no arquivo. Não dá pra gerar (o
ponteiro faz parte da frase), mas dá pra **detectar o caso grosseiro**: ponteiro que aponta
para além do fim do arquivo.

{/* BEGIN:GERADO:ponteiros — não edite à mão, rode `npm run docs` */}

Nenhum ponteiro `arquivo:linha` das docs aponta para fora do arquivo que ele cita. ✓

> Isto confere só o **limite** do arquivo: um ponteiro que ainda cabe mas mudou de assunto passa aqui. É a razão de a doutrina da casa ser declarar o SÍMBOLO e deixar a linha para o gerador — ver `tools/gen-arch.mjs`.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `varredura de `arquivo:linha` em README/STATUS/HANDOFF/KNOWN-BUGS/docs/docs/SKILL`

{/* END:GERADO:ponteiros */}

Por isso a doutrina é declarar o **símbolo** e deixar a linha para o gerador. Quando o
`arquivo:linha` for mesmo necessário, cite junto o nome do que está lá — assim quem ler
daqui a um mês acha por `grep` mesmo com o ponteiro deslocado.
