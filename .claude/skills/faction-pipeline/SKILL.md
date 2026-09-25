---
name: faction-pipeline
description: "Pipeline completo para criar ou ampliar faccoes do CS BRASIL: registro, roster, brasao, cover, personagem Mint, thumbnail, video de selecao, voz original e integracao nas telas. Use quando o pedido mencionar nova faccao/time, personagem de elenco, tela de faccoes/personagens, brasao, preview, Veo ou voz por personagem. Nao use para um asset isolado sem faccao; nesse caso use csbrasil."
---

# Faction Pipeline

Produz uma faccao como sistema jogavel, nao como uma colecao solta de imagens e GLBs. O
lote so comeca depois que uma fatia vertical prova o pipeline inteiro no jogo real.

## Leitura Obrigatoria

1. Leia `AGENTS.md`, `docs/LICOES.md` (5, 11, 12 e 14) e a spec da frente.
2. Use `csbrasil` para ficha, referencias, prompts e geracao; `regua` antes dos gates;
   `gauntlet-fps` para UI/gameplay; `asset-review` depois de integrar cada asset.
3. Antes de tocar `game.js`, leia `tools/eval/ARCH.md` e respeite a tabela de conflito.
4. Para esta frente, a fonte dos nomes, rosters e falas e
   `specs/0002-novas-faccoes/spec.md`. Nao copie essas listas para esta skill.

## Fluxo

### 1. Trave o contrato

- Defina ID tecnico, slug, nome publico, cor, lema, roster e caminhos de assets.
- Centralize metadados num registro importavel. UI, brasoes, paletas, site e geradores
  devem derivar dele; uma nova faccao nao pode exigir listas manuais espalhadas.
- Escreva a regua antes da integracao. Prove a mutacao que remove uma faccao ou
  reintroduz um hardcode e deixa o gate vermelho.

### 2. Componha a identidade

- Guarde referencias locais em `references/<faccao>/` com `FONTE.md` e direitos claros.
- Gere brasao transparente, cover vertical sem texto e portrait de cada personagem.
- Brasao precisa sobreviver em 32 px; cover precisa manter topo livre para UI e elenco
  legivel no terco inferior. Julgue ambos no tamanho real servido.
- Nada de pessoa real contemporanea, gore, modelo extraido ou voz clonada.

### 3. Prove uma fatia vertical

Antes do lote, conclua um personagem representativo com:

- modelo Mint PBR, UV, normais, rig, clips e encaixe de arma;
- hitbox competitivo independente de cabelo, barriga, mochila, antena ou cauda;
- thumbnail e tres vistas do modelo;
- video de selecao, poster estatico e fala de selecao;
- captura 3:2 no menu e na partida;
- `asset-review` por um critico que nao construiu o asset.

Se qualquer item falhar, corrija o pipeline. Nao multiplique o defeito pelo roster.

### 4. Gere video offline

- Use OpenRouter somente em ferramenta Node/CLI. O browser recebe MP4/WebM e poster;
  nunca chave ou chamada de API.
- Use o portrait aprovado como primeiro frame. O prompt pede movimento curto de idle,
  camera praticamente fixa, silhueta e traje imutaveis, sem texto nem personagem extra.
- Preferir o modelo Veo disponivel mais economico que aceite imagem e 720p. Consultar o
  catalogo da API no momento da geracao; nao fixar um nome presumido sem preflight.
- Video de menu toca mudo, em loop, com `poster` e imagem como fallback para erro,
  `prefers-reduced-motion`, economia de dados e qualidade baixa.

### 5. Gere voz offline

- Use OpenRouter TTS com ElevenLabs quando o catalogo/preflight confirmar o modelo;
  se indisponivel, pare ou use o fallback explicitamente aprovado na spec.
- Voz deve ser original em pt-BR. Nao imite nem clone ator, dublador ou pessoa real.
- Grave texto, evento, direcao, provedor, modelo, voice ID/licenca, data e hash em
  `content/voice-lines.json`. Binarios continuam no pacote ignorado `public/audio/`.
- Selecao interrompe a anterior e abaixa a musica; kill/radio respeitam cooldown e
  caem para a voz da faccao quando o arquivo individual faltar.

### 6. Integre e escale

- Gere primeiro com `--dry-run`; mostre arquivos, duracao e custo estimado.
- Geracao em volume exige decisao deliberada depois do custo. Nao sobrescreva asset
  aprovado sem `--force`.
- Complete uma faccao por vez. Depois de cada lote rode gates, browser, capturas e
  critico externo antes de iniciar a seguinte.
- Se alterar `public/js/*.js`, atualize os dois lados do `?v=` conforme `AGENTS.md`.

## Definicao de Pronto

- Registro, UI propria/adversaria, espelho, brasao, bandeira e paletas cobrem a faccao.
- Todos os personagens tem GLB valido, rig, arma, thumbnail, poster e fallback seguro.
- Video e voz sao estaticos, reproduziveis por manifest e nao expõem segredo no cliente.
- Teclado, mouse e proporcao 1536x1024 foram exercitados no jogo real.
- Gates novos mordem as mutacoes; checks relevantes passam.
- Capturas foram olhadas e descritas; `asset-review` aprovou sem contexto do builder.

Os contratos de arquivos e preflight ficam em [references/contracts.md](references/contracts.md).
