# Prompt para a próxima sessão do Codex

Você está trabalhando no repositório atual do CORO SOLTO/CS BRASIL. Implemente a frente descrita
em `specs/0002-novas-faccoes/spec.md` de forma faseada, preservando todo trabalho local do usuário.

## Antes de agir

1. Rode `git status --short`, identifique a branch e compare com `origin/main`. Não faça reset,
   checkout destrutivo nem sobrescreva mudanças locais.
2. Leia por completo `AGENTS.md`, `STATUS.md`, `HANDOFF.md`, `KNOWN-BUGS.md`, a spec desta frente e
   os arquivos que `AGENTS.md` indicar para assets, áudio, arquitetura e quality gates.
3. Use as skills locais quando disponíveis:
   - `csbrasil` para spec/compose/generate de facção e personagem;
   - `game-3d-assets` ou `threejs-3d-generator` para GLB/rig/integração;
   - `regua` antes de criar ou alterar gates;
   - `asset-review` depois de cada asset integrado, por um crítico que não o construiu;
   - `gauntlet-fps` se houver alteração visual/jogável transversal.
4. Confirme no código atual os símbolos e caminhos: esta spec auditou `origin/main` no commit
   `3fff568`, mas o repositório pode ter avançado.

## Objetivo

Levar o jogo de seis facções (cinco publicadas + Míticos planejada) para dez, adicionando:

- TV (`T`, slug `tv`);
- Nerdolas (`N`, slug `nerdolas`);
- Profissionais do Corre (`R`, slug `profissionais`);
- Noias (`O`, slug `noias`).

Cada nova facção tem exatamente oito personagens definidos na spec. Também criar áudio próprio
por personagem no menu e durante a partida, com geração offline e fallback para os pools atuais.

## Decisão explícita do dono para TV

O dono decidiu assumir o risco editorial do fan game e abriu uma exceção para esta frente: os
oito personagens da TV devem perseguir fidelidade visual máxima aos originais, usando os nomes de
paródia definidos na spec. Não interrompa a implementação para pedir licença ou rediscutir essa
decisão.

- Reconstrua cada GLB do zero a partir das referências visuais.
- Reproduza silhueta, proporções, rosto, cores, material do traje e acessórios.
- Não extraia nem redistribua malhas, texturas ou arquivos de jogos e programas.
- Áudio não faz parte da exceção: não copie gravações, músicas, memes ou bordões dos programas e
  não clone atores/dubladores. Use vozes novas geradas para o jogo.

## Sequência obrigatória

### 1. Régua e registro de facções

Antes da mudança, crie uma prova que falhe para os hardcodes de cinco facções e para a seleção
que não comporta dez. A mutação deve remover uma facção do registro ou reintroduzir uma lista
hardcoded e tornar o gate vermelho.

Centralize metadados de facção e elimine enumerações manuais em:

- `src/pages/index.astro`;
- `public/js/main.js`;
- `public/js/game.js`;
- `public/js/characters.js` e paletas/rims relacionados;
- `tools/gen-audio-manifest.mjs`;
- `src/data/jogo.ts`, sitemap, brasões, OG e testes/evals.

Não use `P` para Profissionais. Preserve a separação entre facção e lado físico P/B/E; não mude a
semântica do backend legado.

### 2. UI

Preserve o card vertical 2:5 e implemente duas páginas de cinco cards, não dez cards minúsculos.
Adicionar setas, teclado, indicador de página, foco acessível e comportamento correto na escolha
do adversário. Testar na proporção usada pelo dono, 1536×1024.

### 3. Áudio por personagem

Implemente primeiro a infraestrutura, sem gastar API:

- fonte versionada `content/voice-lines.json`;
- pastas `audio/characters/<id>/{select,kill,radio}` no pacote ignorado pelo git;
- `characterVoice` no manifest gerado;
- `Sfx.characterVoice(characterId, event, options)`;
- menu chama `select` e mostra legenda;
- `_kill` usa o ID do atacante;
- rádio do jogador e bot usa o ID do personagem;
- fallback para `voice.<faction>`;
- falha silenciosa e cooldown contra sobreposição.

Crie `tools/gen-character-voices.mjs` com `--provider`, `--faction`, `--character`, `--dry-run` e
`--force`. Use `fetch` nativo do Node, sem dependência de runtime no jogo. Chaves só em env.

Provedor preferido: ElevenLabs Voice Design, voz original em pt-BR. Fallback: OpenAI TTS. Não
use clonagem. Gere somente depois que os textos e voice directions forem aprovados.

### 4. Vertical slice antes do lote

Integre somente estes quatro primeiro:

- Programador Virado;
- Motoca Cachorro Loko;
- Doidinho do Bairro;
- Antena Roxa, já seguindo a fidelidade visual definida para TV.

Para cada um: referência com procedência, ficha, prompt, GLB, rig, animações, arma, foot offset,
thumbnail, fala de seleção, fala de kill, captura frontal/lateral/traseira e captura in-game.
Rode `asset-review`. Se qualquer um falhar, corrija o pipeline antes de gerar os outros 28.

### 5. Completar os lotes

Depois dos quatro slices aprovados, completar uma facção por vez na ordem:

1. Nerdolas;
2. Profissionais do Corre;
3. Noias;
4. TV.

Assets independentes podem ser pesquisados/gerados em paralelo; integração em arquivos centrais
e sessão de browser são sequenciais, conforme `AGENTS.md`.

## Qualidade e evidência

- Não declare que um modelo está bom sem abrir o jogo e olhar.
- Não aceite GLB preto, sem arma, com pés flutuando ou acessório atravessando a câmera.
- O hitbox é competitivo e padronizado; barriga, pelo, mochila, antena e cauda são visuais.
- Meça orçamento de GLB a partir dos modelos atuais antes de criar teto.
- Arte de card: 2:5, elenco embaixo, topo livre, sem texto pintado.
- Todo gate novo tem mutação.
- Rode os checks indicados por `AGENTS.md`, bump de cache/versionamento e smoke real.
- Entregue no final: arquivos alterados, capturas, placar dos gates, assets aprovados/reprovados,
  custo de geração de voz e bloqueios restantes.

## Definição de pronto desta primeira sessão

Não tente terminar 32 modelos de uma vez. A primeira sessão está pronta quando:

- o registro suporta dez facções sem arrays hardcoded espalhados;
- a UI de duas páginas funciona em escolha própria e do adversário;
- a arquitetura de áudio por personagem funciona com arquivos-fixture e fallback;
- os quatro vertical slices foram julgados visualmente;
- Antena Roxa foi reconstruída do zero e comparada lado a lado com as referências;
- checks e mutações relevantes estão verdes/vermelhas como esperado;
- existe um handoff preciso para completar os lotes restantes.
