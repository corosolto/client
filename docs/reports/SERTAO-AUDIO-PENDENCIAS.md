# Sertão — auditoria de áudio e recuperação

Snapshot de 06/09/2026. Worktree exclusiva `/Users/ruben/csbrasil/worktrees/sertao-astra`, branch `codex/sertao-astra`, HEAD inspecionado `d1ff3d60716d0fbf9887caa0eda400b6307f6274`. Esta frente documental pesquisou fontes e metadados, leu arquivos/ZIP e escreveu somente este relatório. O agente responsável recuperou depois os sete MP3 de natureza; esta revisão conferiu seus bytes e hashes contra [audio-restored.json](../../artifacts/sertao-astra/audio-restored.json). O auditor não baixou binários, não executou browser/GPU, não mudou runtime, manifesto ou falas e não publicou nada. Continuidade geral no [ledger](SERTAO-CONTINUACAO.md).

Objetivo: explicar o vermelho herdado sem apagar áudio válido, identificar cada dependência sonora do Sertão e oferecer recuperação com licença verificável. Pronto exige arquivos decodificáveis e disponíveis pela rota real, procedência e hashes, som audível coerente com o cenário, atenuação/distância/pausa/ducking e ausência de interferência na informação de combate. Metadados e HEAD HTTP não provam a escuta.

## Causa do `audio:check`

O [log herdado](../../artifacts/sertao-astra/logs/audio-recheck.log) registra `manifest.json DEFASADO`, pools `voice` e `round` zerados e órfãos sob `a/`. A causa é a diferença entre o layout fonte e o layout distribuído:

- [gen-audio-manifest.mjs](../../tools/gen-audio-manifest.mjs) descobre falas em `<facção>/ingame`, rounds em `<facção>/round`, capturas em `capture/`, trilha em `soundtrack/` e vozes de personagem em `characters/`. Preserva somente `cs`, `weapons`, `general` e `weaponSamples` como curadoria.
- [build-audio-pack.mjs](../../scripts/build-audio-pack.mjs) renomeia os arquivos referenciados para `audio/a/<sha1-16>.<ext>` e reescreve os caminhos no manifesto. O ZIP oficial entregue usa esse layout. Os arquivos estão presentes; o gerador fonte não os reencontra nos diretórios de autoria.
- O manifesto local é idêntico byte a byte ao membro `manifest.json` do ZIP. Snapshot medido: 13.144 bytes, SHA-256 `a27ddbb889dd78435aa1549f73bef63ceb52a14ec51ec0f394e7dcb781381afc`; 312 folhas string, 292 caminhos distintos, nenhum caminho ausente. Pools existentes: 120 falas, 91 rounds, 6 capturas e 30 trilhas. Esses números vêm da inspeção JSON, não de escuta.
- O diagnóstico de órfãos do gerador se refere ao manifesto **proposto por ele**, não prova que o manifesto distribuído deixou esses sons sem uso. Rodar `npm run audio` neste layout apagaria associações válidas e não recuperaria a ambiência. Não fazê-lo para fabricar verde.
- [assets-check.mjs](../../tools/eval/assets-check.mjs) examina as folhas do manifesto; não exige os caminhos independentes de `soundscape.js`. Assim, o `assert:assets` verde informado pelo responsável é compatível com ambiência incompleta; a recuperação local dos sete MP3 não corrige a sanfona ausente nem amplia a cobertura desse gate.

Baseline versus escopo: `git show HEAD:public/js/map_velho_oeste.js` já declara vento, pássaros, sanfona e `bioma:'campo'`. Gerador, empacotador e `soundscape.js` não tinham diff nesta inspeção. A ausência e a incompatibilidade são herdadas do pacote; o trabalho visual atual reduz o alcance/volume da sanfona, mas não criou a dependência.

## Identidade do pacote oficial

[Release audio-pack-v6](https://github.com/corosolto/client/releases/tag/audio-pack-v6), [URL do ZIP](https://github.com/corosolto/client/releases/download/audio-pack-v6/audio-pack.zip), [API oficial consultada](https://api.github.com/repos/corosolto/client/releases/tags/audio-pack-v6). API e arquivo local concordam:

- Arquivo: `artifacts/sertao-astra/packs/audio-pack.zip`.
- Tamanho: 190.779.702 bytes.
- SHA-256: `2c5746bf90f48cc5ec22ea901f987c380623cf16c8fc5133c42d9425e3f50713`.
- Inventário local do ZIP: 321 entradas; nenhuma entrada `ambiente/`.

Baixar novamente o mesmo ZIP não resolve. O empacotador atual copia as referências do manifesto e os arquivos de menu; os caminhos de ambiência ficam em `soundscape.js` e não entram automaticamente. Recuperação local e correção da distribuição são dois passos diferentes. Também há early-exit em `fetch-audio.sh` quando `manifest.json` existe.

## Natureza e bioma campo: recuperação verificável

No início da auditoria `public/audio/ambiente/` continha somente `FONTE.md`. **Agora os sete MP3 abaixo foram recuperados**, sem conversão, pelo agente responsável. Além de vento, pássaros, galo e dois pássaros curtos, o bioma `campo` exige **latido-1 e latido-2**. Tamanho e SHA-256 dos sete arquivos foram conferidos nesta revisão contra `audio-restored.json`, todos coincidentes. A sanfona continua ausente e é tratada separadamente abaixo.

Todas as sete páginas oficiais foram lidas por `curl -fLsS --max-time 20` em 06/09/2026, sem sessão ou chave. Cada HTML liga explicitamente a [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). As URLs de preview foram confirmadas com `curl -fILsS`: HTTP 200, `audio/mpeg`. O primeiro acesso via ferramenta web retornara 403 em algumas páginas; o acesso HTTPS padrão por curl resolveu sem desativar TLS. CC0 permite copiar, adaptar e distribuir inclusive comercialmente. Não se deduz espécie regional do título do arquivo.

| Destino em `public/audio/ambiente/` | Autor / página oficial | Preview confirmado | Bytes locais conferidos |
|---|---|---|---:|
| vento.mp3 | [florianreichelt — Soft Wind](https://freesound.org/people/florianreichelt/sounds/459977/) | [MP3](https://cdn.freesound.org/previews/459/459977_6253486-lq.mp3) | 267120 |
| passaros.mp3 | [Khanyisile56 — Windy nature ambience](https://freesound.org/people/Khanyisile56/sounds/707499/) | [MP3](https://cdn.freesound.org/previews/707/707499_14710583-lq.mp3) | 826368 |
| galo.mp3 | [BenjaminNelan — Rooster Crow 1](https://freesound.org/people/BenjaminNelan/sounds/435508/) | [MP3](https://cdn.freesound.org/previews/435/435508_1196020-lq.mp3) | 20232 |
| passaro-1.mp3 | [qubodup — Bird Chatting Smack](https://freesound.org/people/qubodup/sounds/812025/) | [MP3](https://cdn.freesound.org/previews/812/812025_71257-lq.mp3) | 17184 |
| passaro-2.mp3 | [qubodup — Bird Freaking Out](https://freesound.org/people/qubodup/sounds/812026/) | [MP3](https://cdn.freesound.org/previews/812/812026_71257-lq.mp3) | 15528 |
| latido-1.mp3 | [WakabaClamp — Barking Dog](https://freesound.org/people/WakabaClamp/sounds/591459/) | [MP3](https://cdn.freesound.org/previews/591/591459_9300632-lq.mp3) | 39936 |
| latido-2.mp3 | [Weak_Hero — Dog.wav](https://freesound.org/people/Weak_Hero/sounds/612858/) | [MP3](https://cdn.freesound.org/previews/612/612858_13194336-lq.mp3) | 27552 |

**Hashes e metadados agora registrados:** a seção “Recuperação verificável do Sertão — 06/09/2026” do [FONTE](../../public/audio/ambiente/FONTE.md) contém os SHA-256, bytes e durações dos arquivos recuperados. [audio-restored.json](../../artifacts/sertao-astra/audio-restored.json) conserva URL e saída de probe: os sete são MP3, 24 kHz, estéreo. A tabela histórica de durações no início do FONTE não substitui esse registro. A conferência atual prova identidade dos arquivos locais; não equivale a escuta ou teste no jogo.

## Sanfona: original ausente e candidatos gratuitos

O FONTE registra `sanfona-forro.mp3` como geração Google Lyria via OpenRouter em 25/08, com prompt e duração, porém sem URL de download, identificador recuperável do resultado ou hash. A página genérica do modelo não identifica o binário nem demonstra por si uma licença aplicável àquela geração. Nenhuma busca por esse nome no acervo desta worktree encontrou o MP3. Não regenerar música paga nesta frente.

Alternativas abaixo foram pesquisadas a pedido do responsável. São **candidatas**, sem download/escuta nem aprovação cultural. Licença declarada pelo autor é separada de conteúdo efetivamente adequado.

| Candidato | Licença e formato de origem | Duração / tamanho | URL de preview e decisão |
|---|---|---|---|
| [Accordion-music-clean.wav — eyenorth](https://freesound.org/people/eyenorth/sounds/482213/) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); WAV, 48 kHz, 16-bit, estéreo | Página: 107.224 s, 19.6 MB; preview HEAD: 920136 bytes | [MP3](https://cdn.freesound.org/previews/482/482213_1764667-lq.mp3). Melhor candidato de sanfona discreta para **escuta**: autor descreve peça melancólica de acordeão. Não é identificado como forró; não anunciar como tal. Crédito obrigatório e registro das alterações. |
| [accordion melody 8 — PhonosUPF](https://freesound.org/people/PhonosUPF/sounds/484869/) | CC0 1.0; WAV, 44.1 kHz, 16-bit, mono | Página: 21.367 s, 1.8 MB; preview HEAD: 174299 bytes | [MP3](https://cdn.freesound.org/previews/484/484869_10350281-lq.mp3). Reserva: autor descreve acordeão filtrado/remix com extração de frequências altas. Fonte anterior do remix não identificada nesta leitura e timbre não escutado; não priorizar como forró. |
| [Sao_Paulo_Liberdade_Forro_2014_10_12.wav — reinsamba](https://freesound.org/people/reinsamba/sounds/257732/) | CC0 1.0 declarada; WAV, 44.1 kHz, 16-bit, estéreo | Página: 124.950 s, 21.0 MB; preview HEAD: 1069944 bytes | [MP3](https://cdn.freesound.org/previews/257/257732_18799-lq.mp3). **Rejeitado para integração direta:** descrição informa canto de canção popular, tráfego e conversas, não instrumental limpo. Composição não identificada; a etiqueta da gravação não resolve essa lacuna. |
| [Triangulo_Forro.WAV — fmiramar_](https://freesound.org/people/fmiramar_/sounds/405415/) | CC0 1.0; WAV, 96 kHz, 16-bit, estéreo | Página: 22.169 s, 8.1 MB; preview HEAD: 202680 bytes | [MP3](https://cdn.freesound.org/previews/405/405415_7576250-lq.mp3). Fonte cultural explícita, mas somente percussão; não substitui sanfona nem valida forró completo. Não montar composição artificial para fechar requisito. |

As quatro URLs de preview acima responderam HTTP 200 `audio/mpeg`; hashes não medidos. A CC BY 4.0 permite uso e adaptação comerciais com crédito, link da licença e indicação de alterações. Se eyenorth for aceito após escuta, crédito concreto sugerido: “Accordion-music-clean.wav — eyenorth, Freesound, CC BY 4.0”, com links da tabela e descrição exata de qualquer corte, loop ou filtragem realizados. Disponibilizar o crédito com a distribuição, além do registro técnico no FONTE.

Também apareceu [Forro.theora.ogv, Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Forro.theora.ogv): 23.873 s, 20.327.594 bytes, CC BY-SA 3.0, vídeo de performance real do Global Lives Project. Não selecionado: não é loop instrumental curado, envolve performance documentada e distribuição de adaptação sob a licença aplicável. Efeitos de fole, jingles de bandoneon e acordeão descrito como desafinado/horror foram descartados por inadequação; licença livre não resolve identidade sonora.

## Próximo passo concreto e limites

1. **Concluído:** sete MP3 de natureza recuperados, com URL, bytes, SHA-256, codec e duração no FONTE e no JSON de recuperação. Esta revisão confirmou bytes/hashes de todos. O manifesto de falas não foi reescrito; seu SHA-256 segue igual ao membro original do ZIP.
2. Baixar **para avaliação**, se desejado, o candidato eyenorth. Ouvir e verificar se há trecho que funciona como sanfona distante; decidir explicitamente se satisfaz o requisito cultural. Ausência de forró aprovado permanece pendência, sem renomear acordeão genérico para criar essa evidência.
3. Servir no jogo real e validar os oito caminhos do Sertão, inclusive os dois latidos, depois testar distância/atenuação, pausa, ducking e informação de combate. O responsável executa browser único; esta auditoria não executou nem deu aprovação sonora.
4. **Pendente, não corrigido:** tratar a divergência de manifesto do `audio:check` global em correção própria de empacotamento/validação: reconhecer e validar o layout distribuído preservando todos os pools, ou recuperar layout fonte rastreável. Não apagar falas nem diminuir o gate. A correção precisa reprovar manifesto/caminho quebrado de propósito e provar que mantém as associações existentes.
5. **Pendente:** o pacote oficial `audio-pack-v6` continua sem distribuir `ambiente/`. Garantir que o próximo pacote/distribuição inclui as dependências de ambiência fora do manifesto de falas. Um download local ou build verde não resolve o clone limpo. Publicação não foi realizada nem autorizada por esta auditoria.

Estado entregue: sete MP3 CC0 recuperados e conferidos; sanfona ainda ausente; candidatos gratuitos documentados sem aprovação sonora/cultural; `audio-pack-v6` continua sem ambiência; divergência de manifesto do `audio:check` não corrigida. Nenhum resultado foi aceito por ausência de erro no console.

## Validação posterior no navegador pelo responsável

O probe real `artifacts/sertao-astra/game-evidence/report.json` confirmou HTTP200 e `decodeAudioData` dos sete MP3 recuperados. A sanfona respondeu404. Não houve aprovação de escuta, substituição musical ou publicação do pacote; continuam válidas as pendências de distribuição e manifesto acima.
