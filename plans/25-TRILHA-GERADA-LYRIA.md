# 25 — TROCA DA TRILHA POR ÁUDIO GERADO (LYRIA/SUNO)

> Prompt de trabalho. Colar inteiro no início da sessão, na worktree `j-audio`.
> Escopo: **só trilha e música de menu.** Não encoste em vozes de personagem nem em `public/models`.

---

## O que precisa acontecer

`public/audio/soundtrack/` (32 faixas, 110 MB) e `public/audio/menu-music/` (26 faixas, 50 MB)
contêm música comercial licenciada de terceiros. Elas serão substituídas por faixas geradas
(Lyria / Suno). São **160 dos 205 MB** de áudio do projeto — a troca resolve exposição e
orçamento de publicação no mesmo movimento.

**Primeiro passo: localizar os arquivos gerados.** Eles ainda não estão no repositório —
nenhuma referência a Lyria ou Suno existe em `public/`, `tools/` ou `scripts/`. Pergunte ao
dono onde estão (pasta de download, Drive, bucket) antes de qualquer outra coisa. Não gere
faixas novas por conta própria; o material já existe.

---

## O contrato de integração — leia antes de mover um arquivo

O projeto tem uma regra explícita, documentada no cabeçalho de `tools/gen-audio-manifest.mjs`:

> **A pasta é a verdade.** Jogou som novo em `public/audio/<facção>/ingame/`, rodou
> `npm run audio`, tocou.

O manifest **não é editado à mão**. `tools/gen-audio-manifest.mjs` o gera a partir do disco.

**Gerado do disco** (pools grandes, onde "todos os arquivos entram" é a intenção):

```
voice.<T>          <facção>/ingame/*.mp3
round.<T>          <facção>/round/*.mp3
capture            capture/*.mp3
captureByTeam.<T>  capture/<facção>/*.mp3
soundtrack         soundtrack/*.mp3      <-- o alvo desta tarefa
```

**Preservado do manifest atual** (curadoria 1-para-1): `cs`, `weapons`, `general`, `weaponSamples`.
Não mexa nesses.

**Codificação de URL:** os nomes atuais têm espaço e parêntese. O caminho vira URL no `fetch`
do `public/js/audio.js`, então cada segmento é codificado. Nomes novos: prefira
`kebab-case-sem-acento.mp3` e o problema desaparece.

---

## Tarefas

### 1. Trilha nova em `soundtrack/`

- Formato **mp3**, para casar com o resto do pool.
- **Loudness normalizado a −16 LUFS** (é o padrão já usado no projeto).
- Nomes em kebab-case sem acento.
- Alvo de peso: as 32 faixas antigas somam 110 MB. Mire **≤ 40 MB** no total —
  bitrate mais baixo é aceitável em faixa de fundo de FPS e o orçamento de publicação é apertado.

### 2. Regenerar `menu-music/` a partir da trilha nova

**Isto não é uma tarefa separada — o menu é derivado da trilha.** A receita exata está em
`public/audio/menu-music/TRACKS.txt`:

```
Trim ~105s, 22% in, fade 1.5s / 5s, loudnorm -16 LUFS
```

Aplique a mesma receita às faixas novas, mantenha o padrão de nome `m##.mp3`, e **reescreva o
`TRACKS.txt`** mapeando cada `m##` à faixa de origem nova.

Se esta etapa for esquecida, o menu continua tocando as faixas antigas — que é a superfície
mais exposta do jogo, tocando por ~99 s no começo de toda sessão.

### 3. Registrar procedência

Crie `public/audio/soundtrack/SOURCES.md` no mesmo espírito de `public/audio/cc0/SOURCES.md`,
registrando por faixa: **gerador, modelo, plano/tier da conta e data**. O plano importa —
em várias plataformas o direito de uso comercial está atrelado ao nível pago, e este projeto
planeja monetizar com anúncios.

### 4. Só então remover as antigas

Depois que a trilha nova estiver no lugar e `npm run audio` rodar limpo:

```bash
git rm public/audio/soundtrack/<faixas-antigas>
npm run audio           # regenera o manifest a partir do disco
npm run audio:check     # tem que passar sem órfão
```

Reporte a lista de órfãos antes de apagar qualquer coisa — órfão é arquivo no disco que o
manifest não referencia, e já houve um caso em 04/08 em que 60 arquivos tocavam com a voz errada
por causa disso.

---

## Verificação

```bash
npm run audio:check
npm run eval:charvoice
npm run eval:character-voice
npm run eval:audio-pack-character-voice
npm run check:fast
```

Atenção ao pacote de produção: `scripts/build-audio-pack.mjs` ofusca os nomes de áudio, e a
legenda precisa viajar para a **mesma chave hasheada** da voz. `eval:audio-pack-character-voice`
é o guarda disso — se ele ficar vermelho, a legenda quebrou só no deploy, não localmente.

Teste no navegador que menu, round e partida tocam, e que nenhuma faixa entra cortada ou
com volume destoante das outras.

## Relatório final

| | antes | depois |
|---|---|---|
| `soundtrack/` | 110 MB · 32 faixas | |
| `menu-music/` | 50 MB · 26 faixas | |
| `public/audio/` total | 205 MB | |

## Fora de escopo — não faça

- Vozes de personagem (`public/audio/characters/`, pools `ingame`/`round` de facção).
- `weapons/`, `cc0/`, `capture/`, `game/`.
- Qualquer coisa em `public/models` — é outra lane, rodando em paralelo.
- Editar `public/audio/manifest.json` à mão.
