# Contribuindo com o CORO SOLTO: Treta Suprema

Valeu por querer contribuir. Este é um projeto de fãs, open source, feito pra
celebrar a **cultura brasileira** com humor — a zoeira é universal e distribuída
igualmente para todos os lados.

**Se você tem 20 minutos e quer só começar:** pegue uma tarefa de
[`docs/issues/`](docs/issues/). Cada uma diz quais arquivos tocar e qual é o
critério de aceite.

---

## Nossa posição (leia antes de contribuir)

- **O jogo NÃO tem lado político.** As facções têm a mesma mecânica, os mesmos
  personagens exagerados e a mesma zoeira. Duas das cinco (Tribos Urbanas e
  Funkeiros) não têm nada de política.
- **O jogo NÃO incita ódio** contra nenhuma pessoa ou grupo. É sátira leve,
  cartunesca e fictícia — sem gore, sem violência realista.
- **Sem pessoas reais.** Nada de políticos, celebridades ou pessoas privadas
  identificáveis (nome, rosto, voz imitada). Só arquétipos originais.
- Contribuições que violem esses princípios serão recusadas.

## Regras de PR (valem para todo mundo, CI cobra)

1. **`package.json` e `public/js/version.js` têm que concordar** — o `?v=` do import map
   (`src/pages/index.astro`) sai da versão no build; se os dois arquivos divergem o
   navegador serve módulo velho do cache e "a correção não chega" — já custou dias
   (ver `public/js/version.js`). O workflow `pr-gates.yml` reprova a divergência. O
   BUMP da versão NÃO é mais tarefa do PR: desde 08/08 o `release.yml` bumpa, taga e
   publica o GitHub Release sozinho a cada push na `main`.
2. **Produção publica no MERGE** (auto-deploy da Vercel na `main`, decisão do dono em
   08/08); o Release/tag/bump saem juntos, automáticos, via `release.yml`. O caminho
   manual por tag (`deploy-prod.yml` via dispatch) continua de pé como fallback.
3. **Preview de fork exige revisão humana**: o `cs-brasil-ai-bot` (`preview-bot.yml`)
   classifica o diff sem executá-lo. Um mantenedor revisa o SHA atual e aplica
   `preview-autorizado`; qualquer push revoga a aprovação.
4. **Quality gates locais antes de abrir**: `npm run check:fast` (segundos) e, se mexeu em
   jogo, `npm run check`. Vermelho novo no quality gate = PR volta.
5. **Nada de travessão `—` no texto do site (`src/`)**. Use hífen com espaços (` - `). O
   em-dash é a marca de texto gerado por IA e, num jogo que se vende como original, entrega
   a origem em título, meta, OG e nas descrições de arma/personagem. O `travessao:check`
   reprova `—` e `–` em `src/`; escreva ` - ` e siga a vida. Vale para texto escrito por
   gente e por IA - a régua não distingue, e é essa a intenção.

## Rodando localmente

```bash
git clone https://github.com/rubenmarcus/csbrasil.git
cd csbrasil
npm install
cp .env.example .env      # opcional — sem envs, o ranking responde 503 e o resto roda
npm run fetch-audio       # opcional — sem o pacote, o jogo usa sons sintetizados
npm run dev               # http://localhost:4321 · o JOGO está na rota /
```

**O jogo é a rota `/`, e o HTML dele é `src/pages/index.astro`.** Não existe
`public/index.html` — servir `public/` com um servidor estático te dá os assets,
não o jogo. (A versão anterior deste arquivo mandava justamente pro lugar
errado.)

## As duas zonas

| | `public/` — o JOGO | `src/` — o SITE |
|---|---|---|
| Stack | vanilla JS, ES modules, Three.js vendorizado | Astro + SSR na Vercel |
| Build | **nenhum** | `astro build` |
| Framework | **proibido** (decisão de projeto) | bem-vindo |
| Dependência nova | abra issue antes | ok, se justificada |
| Antes de editar | leia `tools/eval/ARCH.md` | leia `docs/seguranca.md` se for `/api/*` |

## Como fazer as coisas

### Adicionar uma arma

1. Coloque o GLB em `public/models/weapons/<id>.glb` (normalizado, ~1 unidade
   no maior eixo).
2. `public/js/weapons.js`: adicione o `id` em `WEAPON_IDS` e uma entrada no
   `CFG` com `len` (comprimento real em metros), `rot` (graus pra apontar o cano
   em +Z) e `gripZ` (fração do comprimento, da boca até a empunhadura).
3. **Não chute o `rot`.** Rode `npm run eval:vm` (`vm-mint-audit.mjs`): ele mede
   a seção transversal perto de cada ponta em Z — o cano é fino, a coronha é
   grossa. Se a ponta +Z não for a mais fina, a arma está de ré e leva +180 no
   yaw. A leitura a olho já errou nas bullpups; a medição não erra.
4. `public/js/game.js`: entrada no objeto `WEAPONS` (`name`, `short`, `dmg`,
   `mag`, `reserve`, `rate`, `reload`, `spreadHip`, `recoil`).
5. `src/data/jogo.ts`: espelhe em `ARMAS` pra arma aparecer em `/armas`.
6. Rode `npm run check`. **`eval:vm` e `eval:kick` são bloqueantes.**

### Adicionar um personagem

O pipeline tem 6 passos e nenhum deles é opcional:

```
tools/rig-from-donor.mjs    esqueleto de um doador + auto-skin (GLBs da Mint vêm sem rig)
tools/finger-curl.mjs       curvatura dos dedos pra empunhadura
tools/optimize-tribos.mjs   redução de malha e textura
tools/retarget-glb.mjs      11 clipes de animação em models/anims/<id>/
tools/check-clip.mjs        valida: 0 ossos faltando, durações e root motion iguais ao pack
registry em 3 arquivos      public/js/characters.js · manifest de áudio · src/data/jogo.ts
```

Rode `check-clip.mjs` **antes** de commitar: personagem sem clipe validado
entra no jogo em T-pose.

### Adicionar um mapa

`public/js/map_<nome>.js` exportando um `build*`, registrado em
`public/js/maps.js` (`MAPS`). Colisores são AABBs declarados junto de cada mesh.
Espelhe em `src/data/jogo.ts` (`MAPAS`) pro mapa aparecer em `/mapas`.

> **Este espelho já foi esquecido, e nos dois sentidos.** A `quebrada` entrou
> no registro do jogo e não apareceu em `/mapas`, no `llms.txt` nem no JSON-LD; a
> `praca_old` saiu do registro e continuou listada nos três. Um a mais e um a
> menos: o **total** continuou 5, então nenhuma contagem acusou. Mapa entrou ou
> saiu → `src/data/jogo.ts` no mesmo PR, e rode `npm run check:seo`.

### Mexer no site

- Nome, host e descrições saem de `src/lib/site.ts`. **Não escreva o nome do
  jogo à mão em página nenhuma** — foi assim que "CS BRASIL" e "CORO SOLTO"
  passaram meses divergindo entre o `<title>` e o JSON-LD.
- Nova página = novo `jsonld` no `<Layout>` e uma entrada em
  `src/pages/sitemap.xml.ts`.
- Nova rota `/api/*` que grava algo: passe pelo `rateLimit()` de
  `src/lib/ratelimit.ts`.
- Qualquer URL vinda do usuário que o servidor for BUSCAR: passe pelo
  `src/lib/safe-url.ts`. Ler `docs/seguranca.md` antes economiza uma revisão.

## Antes de abrir o PR

**O `git push` já roda o `check:deploy` sozinho** — é o hook `.githooks/pre-push`.
Ele existe porque numa única sessão de 12/08/2026 quatro pushes seguidos abriram CI
vermelho em portão que roda em **5 segundos** na máquina: `docs:check` duas vezes,
`arch:check` e `eval:shaderlog`. O portão existia; ninguém rodava.

É o `check:deploy` e não o `check:fast` de propósito: 20 passos determinísticos, sem
browser e sem rede, contra 35. Portão que demora vira portão que se contorna. Quando
você precisar mesmo passar por cima, `PULAR_PORTAO=1 git push` — e o CI continua
sendo a rede de baixo.

Antes de abrir o PR, o resto continua na sua mão:

```bash
npm run check        # quality gate completo
npm run arch         # se você mexeu em public/js, o ARCH.md precisa ser regerado
npm run build        # o site tem que buildar
npm run check:seo    # se você mexeu em src/ ou em public/llms.txt
```

`check:seo` roda `npm run build` e depois mede o **HTML publicado**, não o
`.astro`. É de propósito: foi assim que um `sitemap.xml` estático sombreando a
rota dinâmica apareceu, e é assim que a cláusula AEO1 pega página prometendo
ranking global com `RANKING_ON = false`. **Não afrouxe teto para fechar placar.**

E teste à mão: o jogo abre, o console fica limpo, uma partida completa roda
(round termina, placar abre com Tab).

## Regras de código

- **Português** em nome, comentário, commit e doc.
- **Código não é relatório.** Comentário novo só explica uma invariante, compatibilidade ou
  risco que os nomes não expressem, em no máximo duas linhas. Histórico, causa raiz, números e
  reprodução ficam na issue, em `KNOWN-BUGS.md` ou em `docs/`; o comentário apenas aponta.
- Não narre o óbvio, não deixe diário de investigação e não use comentários para compensar nome
  ruim. Ao tocar num trecho, remova comentários redundantes daquele mesmo trecho.
- `arquivo:linha` em qualquer afirmação sobre código.
- PRs pequenos e focados: uma feature ou um fix por PR.
- **Sistema interconectado** (arma + mão + animação + ADS + mira + HUD) se mexe
  **sequencialmente, por uma pessoa só**. Fan-out paralelo nesse sistema já
  produziu 13 regressões numa única rodada.
- **Segredos nunca no git.** `service_role` key e `.env` só na Vercel.
- Assets grandes não vão pro git. `public/audio/` é ignorado; sons novos entram
  no pacote via `audio/manifest.example.json`.

## Conteúdo

- Nada com copyright: sprites, sons, modelos de jogos comerciais, logos, marcas
  ou fotos. Só material original ou com licença compatível.
- Personagem novo segue o padrão: arquétipo fictício, nome fictício, humor sem
  crueldade, sem mirar grupos protegidos.

## Processo

1. Feature grande? Abra uma **issue** antes (veja [`docs/IDEAS.md`](docs/IDEAS.md)).
2. Fork, branch, PR com descrição clara e screenshots.

   **Nome da branch: `v2/<assunto>`** — `v2/multiplayer`, `v2/audio`, `v2/ui-hud`.
   O prefixo é o ciclo de release (ver o topo do [`CHANGELOG.md`](CHANGELOG.md)): tudo que
   entra na v2 vive em `v2/*` e sai de lá para a `main`. A regra nasceu de um problema
   concreto: em 04/08 a branch de trabalho se chamava `feat/evio-feel` — nome de uma
   feature de julho — e tinha acumulado **143 commits** de assuntos completamente
   diferentes (personagens GLB, funkeiros, viewmodel, mapas), sem upstream, enquanto a
   `main` seguia parada em 18/07. Nome que não diz o que a branch é vira depósito.
3. Ao contribuir, você concorda em licenciar sua contribuição sob a **AGPL-3.0**
   (veja [`LICENSE`](LICENSE)).

   > **Migração aplicada em 07/08/2026.** O projeto era MIT e virou **AGPL-3.0**.
   > Contribuições anteriores à troca entraram sob MIT — licença permissiva e
   > compatível: elas seguem MIT dentro do conjunto, que é distribuído sob
   > AGPL-3.0. Se isso for decisivo pra você, pergunte antes de abrir o PR.

### As superfícies da licença

Estes arquivos **repetem o nome da licença** — uma troca de licença muda todos no
mesmo commit (metade trocada é pior que nenhuma). A tabela é gerada:

<!-- BEGIN:GERADO:licenca_pontos — não edite à mão, rode `npm run docs` -->

| Superfície | Arquivo | Onde diz `AGPL-3.0` |
|---|---|---|
| licença canônica | `LICENSE` | 11×  |
| badge + seção de licenças | `README.md` | 5×  |
| termo que o contribuidor aceita | `CONTRIBUTING.md` | 6×  |
| rodapé do site | `src/layouts/Layout.astro` | 1×  |
| JSON-LD do jogo | `src/pages/index.astro` | 1×  |
| página `/sobre` | `src/pages/sobre.astro` | 3×  |
| `llms.txt` (resposta para LLM) | `public/llms.txt` | 2×  |
| rodapé desta documentação | `docs/docusaurus.config.js` | — (não nomeia a licença)  |

**29 ocorrências** de `AGPL-3.0` em **7** das 8 superfícies declaradas. Trocar a licença é mudar **todas elas no mesmo commit**: metade trocada é pior que nenhuma, porque cada arquivo passa a responder uma coisa diferente para quem pergunta.

**Outros nomes de licença citados nessas superfícies:** `MIT` em `README.md` (4×), `MIT` em `CONTRIBUTING.md` (4×), `MIT` em `src/pages/sobre.astro` (1×), `MIT` em `public/llms.txt` (1×), `MIT` em `docs/docusaurus.config.js` (1×). Citar não é declarar — essas linhas são histórico da migração ou crédito a dependência de terceiro. A regra continua a mesma: **só o `LICENSE` declara**, e hoje ele diz `AGPL-3.0`.

> Bloco gerado por `node tools/gen-docs.mjs`. Fonte: `grep -n dos nomes de licença conhecidos, nas superfícies declaradas em tools/gen-docs.mjs`

<!-- END:GERADO:licenca_pontos -->

O CI valida a presença de `Signed-off-by:` em cada commit do PR. Depois de
`npm install` ou `npm run setup`, o hook versionado em `.githooks/` acrescenta
automaticamente o nome e o email configurados no Git. Ao commitar, você confirma
essa declaração para a contribuição enviada. Se você já usa um `core.hooksPath`
próprio, ele é preservado e o instalador avisa para continuar usando `git commit -s`.

Se ainda não instalou as dependências, assine manualmente:

```bash
git commit -s -m "feat: minha mudança"
```

### Quem escreveu o commit

Este repositório é **AI generated e AI friendly**: boa parte do código é escrita
por agentes de IA, e **todo** commit diz quem o escreveu no trailer `Agent:` —
é o que sustenta o "cada commit diz qual" do README. Humano commitando sozinho
leva `Agent: humano`; o campo nunca fica vazio, porque campo opcional envelhece
para vazio (a convenção nasceu escrita em três arquivos e, 200 commits depois,
não estava em **nenhum** deles).

Você não precisa digitar: o `.githooks/prepare-commit-msg` preenche sozinho,
lendo a assinatura do ambiente (`CLAUDECODE`, `KIMI_*`, `CODEX_*`, `OPENCODE*`,
`CURSOR_TRACE_ID`, `AI_AGENT`). Para dizer o modelo junto — que raramente está no
ambiente — exporte `AGENTE`, que tem precedência sobre a detecção:

```bash
export AGENTE="Claude Code (Opus 5)"
git commit -s -m "fix: minha correção"      # trailer entra sozinho
git commit -s -m "fix: x" --trailer "Agent: Kimi Code"   # ou explícito
```

Agente commitando em nome de humano mantém o `Signed-off-by` de quem assina e
acrescenta o `Agent:` de quem escreveu. O `.githooks/commit-msg` recusa commit
sem o trailer, e o portão `Check trailer Agent` do CI cobre o que o hook não
alcança: clone sem `npm run setup`, `--no-verify` e commit pela interface do
GitHub.

#### Co-autoria de IA não entra

O `Agent:` é a atribuição desta base, e ele diz **qual** agente. O
`Co-Authored-By: Claude` que as ferramentas acrescentam sozinhas não diz nada
que o `Agent:` já não diga, aparece sempre colado nele — **415 dos 1004 commits
da main** carregam o par — e ainda inventa um co-autor sem conta, que entra no
"Contributors" do GitHub misturado com gente de verdade.

Os mesmos três portões do `Agent:` recusam essa linha, lendo a lista de agentes
de `scripts/coautoria-ia.re` (um arquivo só: lista copiada em três lugares
diverge, e aí a mesma mensagem nasce aprovada num portão e reprovada no outro).
**Co-autor humano continua valendo** — a régua só morde nome de ferramenta.

Desligue na origem e você nunca vê o portão: o Claude Code já vem desligado por
`"includeCoAuthoredBy": false` em `.claude/settings.json`; as outras ferramentas
têm opção equivalente. Se já entrou na mensagem, limpe o intervalo com:

```bash
git rebase <base> --exec 'git log -1 --format=%B | sh scripts/checa-coautoria-ia.sh --limpa > /tmp/m && git commit --amend --no-edit -F /tmp/m'
```

### Commit grande pede motivo

Commit pequeno é o que torna revisão, `git bisect` e reversão baratos, e é a
primeira coisa que se perde quando um agente trabalha por horas sem parar. O
`.githooks/commit-msg` recusa commit acima de **15 arquivos ou 800 linhas**,
ignorando arquivo gerado (`public/docs/`, `CHANGELOG.md`, `package-lock.json`,
`STATUS.md`, `tools/eval/ARCH.md`, `docs/i18n/`, `graphify-out/`,
`public/js/version.js`) e commit de release.

O teto não é opinião. Ele é uma **observação datada e ancorada num commit**, e é
por isso que o comando abaixo devolve o mesmo resultado hoje e daqui a um ano:

```bash
git log --no-merges -400 --format='%H%x00%s' --numstat 7b20e46 |
  python3 scripts/medir-historico.py
#   340 commits não-release, sem arquivo gerado
#     p50:  3 arquivos,   89 linhas
#     p75:  8 arquivos,  276 linhas
#     p90: 15 arquivos,  845 linhas   <- é onde o teto fica
#     p95: 21 arquivos, 1736 linhas
```

**Isto não é um bloco gerado, e a decisão é deliberada.** A primeira versão desta
seção foi gerada pelo `gen-docs`, e a medição mudava a cada commit — inclusive o
commit que a regenerava. Percentil de janela móvel não é um fato sobre o estado
do repositório, como "34 arquivos, 27.639 linhas"; é uma **observação histórica**,
e observação se ancora, não se persegue. O que a lei 2 da casa cobra é
reprodutibilidade, e a âncora `7b20e46` dá exatamente isso.

Vale reancorar quando o perfil de trabalho mudar de verdade — não a cada PR. A
lista de arquivo gerado é a mesma do `scripts/medir-commit.awk`, que é quem o
hook usa, exercitada por fixture no `agente_check.py --selftest` (o filtro já
nasceu quebrado uma vez, com um `^` no meio da linha que nunca casava).

Quando o commit grande é o certo (mover uma pasta, regenerar um acervo, aplicar
um rename), diga por quê e siga:

```bash
git commit -s --trailer "Commit-grande: git mv da pasta fpvm, sem mudança de conteúdo"
```

Rebase, merge, cherry-pick e revert não são medidos de novo: o commit já passou
pelo teto uma vez, e cobrar duas transforma conflito resolvido em commit
reprovado.

## Reportando bugs

Abra uma issue com: o que aconteceu, o que você esperava, passos pra reproduzir,
navegador/SO e, se der, print do console (F12). O jogo tem um overlay de crash
que persiste a exceção na tela justamente pra esse print.

**Descreva com as suas palavras, não com o diagnóstico que você imagina.** Nesta
base o sintoma quase nunca é o defeito: *"o jogo reiniciou sozinho"* era um botão
do menu de pausa debaixo da mira, e *"a música não toca"* era um `%2520` numa URL
codificada duas vezes. A frase literal é o dado; a interpretação a gente mede.

**Vulnerabilidade de segurança não vai em issue pública** — veja
[`SECURITY.md`](SECURITY.md).

### Vai consertar um bug?

Existe uma skill pra isso, e ela serve pra agente e pra gente:
[`.claude/skills/bug-hunt/SKILL.md`](.claude/skills/bug-hunt/SKILL.md). Ela codifica o
método que este repositório pagou caro pra aprender — régua antes do conserto, mutação que prova
que a régua morde, refutar o palpite óbvio antes de agir nele — cada regra com o
caso real que a comprou. Traz também o fluxo: onde registrar
([`KNOWN-BUGS.md`](KNOWN-BUGS.md)), em que ordem rodar o quality gate, e como reportar
o que você **não** verificou.

Defeito com evidência (`arquivo:linha`, saída de régua ou passo de reprodução)
entra no [`KNOWN-BUGS.md`](KNOWN-BUGS.md). Suspeita sem medição vai pro fim do
arquivo, na seção *Relatados, ainda não reproduzidos* — e não sobe de seção sem
número.
