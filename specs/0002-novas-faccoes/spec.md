# Spec: quatro novas facções e vozes por personagem

Status: proposta pronta para implementação faseada

Data: 2026-08-09

Base técnica auditada: `origin/main` em `3fff568` (`2.0.0-alpha.48`)

Escopo: TV, Nerdolas, Profissionais do Corre e Noias

## 1. Resultado pretendido

Adicionar quatro facções com oito personagens cada, seleção de facção que comporte dez
cards e voz própria por personagem no menu e durante a partida.

A contagem é esta:

- publicadas hoje: Time E, Time B, Tribos Urbanas, Palhaços e Funkeiros;
- planejada/em produção: Míticos;
- novas desta spec: TV, Nerdolas, Profissionais do Corre e Noias;
- total final: dez facções;
- roster atual: 44 personagens;
- Míticos: nove personagens na spec anterior;
- quatro facções novas: 32 personagens;
- total projetado sem normalizar os rosters antigos: 85 personagens.

Esta frente não deve reduzir nem reorganizar os elencos existentes. Os novos times têm oito
personagens porque esse é o roster decidido para eles; normalizar todas as facções é outro
projeto.

## 2. Decisões de produto

- As facções continuam sendo elencos, não lados físicos. Uma partida ainda tem dois lados
  físicos; qualquer facção pode ocupar qualquer lado e enfrentar qualquer outra, inclusive em
  partida espelho.
- IDs sugeridos: `T` para TV, `N` para Nerdolas, `R` para Profissionais do Corre e `O` para Noias.
  Não usar `P` para Profissionais: a API ainda trata `P` como alias legado do Time E.
- Slugs do site: `tv`, `nerdolas`, `profissionais`, `noias`.
- Decisão mais recente do dono: as dez facções devem aparecer simultaneamente numa grade 5×2,
  sem paginação nem rolagem em 1536×1024. Os cards preservam arte vertical, brasão, nome e
  lema; a altura é elástica para as duas linhas caberem inteiras.
- Ao escolher adversário, a posição da grade permanece estável e o card da facção do jogador
  apenas fica indisponível, sem deslocar os demais.
- Cada personagem terá pelo menos uma fala ao ser selecionado e falas próprias no jogo.
- Áudio é asset estático gerado no pipeline. Não haverá chamada de TTS em runtime.

## 3. Decisão editorial para a facção TV

A facção satiriza a linguagem da televisão brasileira, mas seu elenco é inteiramente original.
O veto vigente de `AGENTS.md` impede copiar personagens, silhuetas, trajes, bordões, vozes ou
marcas de programas existentes. Robô-câmera, claquete, microfone, controle remoto e equipe de
estúdio são arquétipos genéricos; a combinação visual e os nomes abaixo pertencem ao jogo.

As vozes são novas e geradas para o jogo. Não copiar gravações, músicas ou áudio de programas
e não clonar atores ou dubladores.

## 4. Facção TV

- ID: `T`
- slug: `tv`
- nome: `TV`
- lema: `Depois do intervalo, tem revanche!`
- cor-base sugerida: ciano de CRT com acentos magenta/amarelo
- brasão: televisão de tubo com antena e estrela
- cover: elenco no terço inferior, névoa/scanlines no topo, sem texto embutido

| ID | Nome no jogo | Alvo visual pretendido | Elemento de leitura | Voz original proposta |
|---|---|---|---|---|
| `camera-roxa` | Câmera Roxa | robô alto com lente única e rig de estúdio | lente-cabeça e shoulder rig | grave, técnico, poucas palavras |
| `claquete-verde` | Claquete Verde | dublê compacto com armadura de claquete | placa articulada no ombro | médio-grave, confiante |
| `microfonildo` | Microfonildo | criatura felpuda amarela com boom de áudio | pelo de windscreen e fones | voz clara, acelerada |
| `controlino` | Controlino | robô vermelho de botões táteis | painel frontal e utility belt | aguda, direta |
| `capivara-reporter` | Capivara Repórter | capivara bípede de campo com jaqueta teal | microfone e crachá sem marca | calma, jornalística |
| `chroma-rex` | Chroma Rex | criatura ciano angular de chroma key | crista geométrica e cauda curta | barítono alegre |
| `fantoche-ibope` | Fantoche do Ibope | boneco original de auditório com medidor analógico | ponteiro expressivo no peito | rouca e teatral |
| `nuvem-tempo` | Nuvem do Tempo | apresentadora-nuvem bípede com capa translúcida | relâmpago luminoso e mapa dobrado | enérgica, meteorológica |

Falas-semente:

| Personagem | Seleção | Jogo |
|---|---|---|
| Câmera Roxa | `A transmissão começou.` | `Quadro limpo!` |
| Claquete Verde | `Cena um, confronto um.` | `Corta bonito!` |
| Microfonildo | `Som na caixa e olho no retorno.` | `Captou tudo!` |
| Controlino | `Eu escolho o canal.` | `Troca a cena!` |
| Capivara Repórter | `Ao vivo direto da arena.` | `Notícia confirmada!` |
| Chroma Rex | `No fundo verde eu desapareço.` | `Efeito prático!` |
| Fantoche do Ibope | `A audiência decidiu.` | `Ponteiro no máximo!` |
| Nuvem do Tempo | `Previsão de confronto.` | `Frente fria chegando!` |

### Referência visual da TV

A capa aprovada e seu prompt original ficam documentados em `public/img/FONTE.md`. Turnarounds
de cada personagem devem nascer a partir dessa direção original e entrar em
`references/tv/<id>/` com sua própria procedência antes da geração Mint.

## 5. Facção Nerdolas

- ID: `N`
- slug: `nerdolas`
- nome: `NERDOLAS`
- lema: `A treta será compilada!`
- cor-base: azul elétrico com roxo RGB
- brasão: D20 atravessado por cursor de mouse

| ID | Nome | Silhueta e acessórios | Direção de voz | Seleção / jogo |
|---|---|---|---|---|
| `programador-virado` | Programador Virado | moletom, olheiras, caneca e teclado preso à mochila | cansado, técnico | `Só mais um commit.` / `Passou no meu teste!` |
| `designer-ux` | Designer de UX | roupa preta, óculos, tablet e leque de cores | calma, crítica | `Esse fluxo precisa de combate.` / `Faltou contraste!` |
| `streamer-tiltado` | Streamer Tiltado | headset RGB, webcam no ombro, luz circular nas costas | performático | `Chat, presta atenção.` / `Clipa isso agora!` |
| `otaku-bairro` | Otaku do Bairro | jaqueta inspirada em uniforme escolar, mochila de pins originais | dramático | `Meu arco começa aqui.` / `Golpe do episódio final!` |
| `mestre-rpg` | Mestre do RPG | capa improvisada, bolsa de dados, escudo de papelão | narrador solene | `Rolem iniciativa.` / `Acerto crítico!` |
| `lenda-lanhouse` | Lenda da Lan House | boné para trás, headset antigo, fichas e mouse de bolinha | competitivo 2000s | `Reserva a máquina oito.` / `Sem lag dessa vez!` |
| `hacker-wifi` | Hacker do Wi-Fi | antenas, roteador genérico e cabos, sem logos | conspiratório | `A senha ainda é oito números.` / `Acesso liberado!` |
| `formata-vinte` | Técnico que Formata por 20 | bolsa de CDs, pendrives e gabinete pequeno | vendedor confiante | `Com backup é mais caro.` / `Resolvi reiniciando!` |

Referência visual central: [lan houses brasileiras dos anos 2000](https://www.techtudo.com.br/noticias/2025/06/lan-house-fez-historia-no-brasil-veja-o-que-quase-ninguem-lembra-edsoftwares.ghtml),
com CRTs, baias apertadas, headsets antigos e cabos aparentes. Para o Otaku, usar moda de rua
da Liberdade como contexto, sem copiar personagem de anime: [referência PUC-SP](https://agemt.pucsp.br/noticias/moda-cotidiana-no-bairro-da-liberdade-0).

## 6. Facção Profissionais do Corre

- ID: `R`
- slug: `profissionais`
- nome: `PROFISSIONAIS DO CORRE`
- lema: `O expediente virou confronto!`
- cor-base: laranja de sinalização com azul de uniforme
- brasão: relógio de ponto com duas ferramentas cruzadas

| ID | Nome | Silhueta e acessórios | Direção de voz | Seleção / jogo |
|---|---|---|---|---|
| `motoca-cachorro-loko` | Motoca Cachorro Loko | capacete, jaqueta refletiva e bag térmica genérica | rápido, sem pausa | `Endereço confirmado.` / `Entrega concluída!` |
| `tia-pastel` | Tia do Pastel | avental, touca, escumadeira e caixa de feira | acolhedora e firme | `Vai com caldo de cana?` / `Saiu quentinho!` |
| `motorista-app` | Motorista de Aplicativo | camisa polo, suporte de celular e garrafa d'água | cordial, irônico | `Confirma o nome?` / `Cinco estrelas pra mim!` |
| `motorista-onibus` | Motorista de Ônibus | uniforme, bolsa de cobrador e volante como emblema | voz de terminal | `Segura que vai sair.` / `Passou direto!` |
| `pedreiro-grau` | Pedreiro do Grau | capacete, colher, trena e nível | expansivo | `No prumo e no esquadro.` / `Essa parede caiu!` |
| `camelo-ambulante` | Camelô Ambulante | mochila expositor com cabos, óculos e guarda-chuvas | pregão veloz | `Olha a oportunidade!` / `É o último, chefe!` |
| `feirante-grito` | Feirante do Grito | avental, caixote e balança pequena | projeção de feira | `Chega mais que tá bonito!` / `É hoje, freguesia!` |
| `frentista-posto` | Frentista do Posto | uniforme refletivo, boné, flanela e rodo | prestativo | `Completa ou só vinte?` / `Pode conferir o nível!` |

Referências de rua devem mostrar equipamentos reais sem logos de aplicativos ou redes. Pontos de
partida: [motoboy brasileiro](https://avozdaserra.com.br/noticias/o-motoboy-nosso-de-cada-dia-profissao-se-destaca-durante-pandemia)
e [camelô em Copacabana](https://tabajaramarques.blogspot.com/2015/02/rio-de-janeirocopacabana-vendedor.html).

## 7. Facção Noias

- ID: `O`
- slug: `noias`
- nome: `NOIAS`
- lema: `Aqui tudo vira item!`
- cor-base: verde ácido com cobre oxidado
- brasão: roda de carrinho envolvida por fio de cobre

O humor é sobre caos, gambiarra e figuras excêntricas da vizinhança. Não usar doença mental,
dependência química, miséria ou pessoa em situação de rua como punchline. Sem seringas, crack,
feridas ou degradação realista. `Fumador de Pen Drive` é a piada visual do vape.

| ID | Nome | Silhueta e acessórios | Direção de voz | Seleção / jogo |
|---|---|---|---|---|
| `doidinho-bairro` | Doidinho do Bairro | camadas incompatíveis, boné torto, gestos largos | inventivo, alegre | `Hoje eu tô calibrado!` / `A fita isolante segurou!` |
| `noia-esquina` | Nóia da Esquina | bermuda, chinelo, pochete e rádio pequeno | atento, ligeiro | `Eu vi tudo daqui.` / `Mosqueou, perdeu!` |
| `fumador-pendrive` | Fumador de Pen Drive | vape enorme no cordão e nuvem estilizada | relaxado | `Carregou a bateria?` / `Soltei a atualização!` |
| `mago-cobre` | Mago do Cobre | rolos de fio, alicate e armadura de sucata | místico da gambiarra | `O cobre conduz meu destino.` / `Deu curto!` |
| `dj-bluetooth` | DJ do Bluetooth | caixa estourada no ombro e LEDs desencontrados | grave e alto | `Conectou no meu som.` / `Estourou a caixa!` |
| `profeta-calcada` | Profeta da Calçada | placas de papelão com previsões absurdas | solene | `Já aconteceu semana que vem.` / `A profecia bateu!` |
| `ciclista-sem-freio` | Ciclista Sem Freio | bicicleta remontada nas costas, capacete improvisado | ofegante | `Freio é perda de impulso.` / `Só vai!` |
| `homem-carrinho` | Homem do Carrinho | carrinho cheio de objetos amarrados, sinos e sacolas | colecionador orgulhoso | `Tenho uma peça pra isso.` / `Mais um pro carrinho!` |

## 8. Contrato visual e técnico dos modelos

- Usar o pipeline de personagens do repositório e as skills locais indicadas por `AGENTS.md`.
- Começar cada facção com um único personagem vertical-slice. Só produzir os outros sete depois
  de modelo, rig, animação, arma, thumbnail e hitbox passarem juntos.
- Todo modelo deve aceitar as animações atuais e expor o mesmo contrato de arma/pegada.
- Mascotes continuam bípedes e compatíveis com o esqueleto humanoide do jogo.
- O hitbox competitivo é padronizado e independente da barriga, cabelo, cauda, mochila ou
  antena. Partes decorativas não alteram alcance de tiro nem colisão do corpo.
- Preservar diferenças relativas de altura apenas visualmente e dentro do enquadramento atual.
- Acessórios não podem atravessar a câmera em primeira pessoa nem esconder a arma.
- Medir o orçamento nos GLBs atuais antes de fixar teto de triângulos, materiais e bytes. Não
  inventar número: usar mediana/pior caso publicado pelo script de inspeção do projeto.
- Cada personagem precisa de vista frontal, traseira e lateral, captura segurando arma e captura
  in-game em distância curta e média.
- Covers de facção seguem o contrato atual da arte 2:5: personagens no trecho inferior, topo
  livre para HTML, nenhum texto pintado, WebP otimizado.

## 9. Generalização necessária no código

A versão auditada ainda enumera cinco facções manualmente em vários pontos. Antes de adicionar
cards, criar um registro de facções consumido pelo jogo:

```js
export const FACTIONS = [
  { id: 'E', slug: 'time-e', name: 'TIME E', tag: 'TME', color: '#ff6b6b', ... },
  // ... existentes, Mítico e as quatro novas
];
export const factionById = id => FACTIONS.find(f => f.id === id);
```

O registro deve fornecer nome, tag, cor, cor clara de HUD, classe/card, arte, brasão, lema e pasta
de áudio. Não duplicar arrays `['e','b','u','c','f']` em handlers.

Pontos já identificados que precisam deixar de ser hardcoded:

- cards e handlers em `src/pages/index.astro` e `public/js/main.js`;
- `FACTION_NAME`, contagem, preview e seleção de adversário em `main.js`;
- `_teamInk`, `_teamName`, `_teamTag` e cores em `game.js`;
- rim, luva, braçadeira e cores em `characters.js`/arquivos relacionados;
- `FACTIONS` de `tools/gen-audio-manifest.mjs`;
- brasões, site, sitemap, cards sociais e `src/data/jogo.ts`;
- testes/evals que afirmam cinco ou seis facções.

O lado físico deve continuar separado da facção. Não transformar `playerTeam` em facção nem
gravar `R/N/T/O` na coluna legada que aceita apenas P/B. Telemetria de escolha usa o ID de facção;
resultado competitivo continua usando o lado físico.

## 10. Voz por personagem

### Escolha do provedor

Recomendação principal: **ElevenLabs Voice Design + Eleven v3 ou Multilingual v2**, gerando os
arquivos uma vez. A documentação atual oferece Voice Design, português e entrega expressiva; uso
comercial requer plano pago e direitos sobre o conteúdo de entrada:
[ElevenLabs TTS](https://elevenlabs.io/docs/overview/capabilities/text-to-speech).

Fallback: **OpenAI TTS-1 HD** para falas estáticas quando variedade dramática não for crítica.
A [documentação oficial da OpenAI](https://developers.openai.com/api/docs/models/tts-1) confirma o
endpoint de speech e o custo por caracteres. Confirmar modelo/preço novamente antes de gerar,
pois isso é informação temporal.

Não clonar atores, dubladores, celebridades ou gravações dos programas. ElevenLabs exige direito
e consentimento para clonagem; usar Voice Design ou vozes licenciadas:
[documentação de voice cloning](https://elevenlabs.io/docs/eleven-api/concepts/voice-cloning).

### Escopo de falas

MVP por personagem:

- `select`: duas falas de 2-4 segundos;
- `kill`: três falas de até 3 segundos;
- `radio`: três falas curtas correspondentes a contato, avanço e cobertura;
- total: oito arquivos por personagem, 256 arquivos para as quatro novas facções;
- `round`: duas vinhetas compartilhadas por facção, fora do pacote individual.

Isso substitui a necessidade de achar um meme para cada personagem. As falas são memes novos,
escritos para o arquétipo. Depois do MVP podem entrar `spawn`, `death`, `lowHp` e variantes, mas
nenhuma delas bloqueia o lançamento.

### Estrutura de arquivos

```text
public/audio/characters/<character-id>/
  select/
  kill/
  radio/

public/audio/<faction-folder>/round/
content/voice-lines.json
```

`public/audio` continua fora do git e distribuído pelo pacote de áudio. O arquivo
`content/voice-lines.json` é a fonte versionada: texto, evento, direção de interpretação,
provedor, modelo, voice ID/licença, data e hash do output aprovado. Chaves de API ficam somente em
`ELEVENLABS_API_KEY` ou `OPENAI_API_KEY`; nunca no browser, manifest ou git.

Manifest esperado:

```json
{
  "characterVoice": {
    "programador-virado": {
      "select": ["audio/characters/programador-virado/select/01.mp3"],
      "kill": ["audio/characters/programador-virado/kill/01.mp3"],
      "radio": ["audio/characters/programador-virado/radio/contato.mp3"]
    }
  }
}
```

Adicionar ao gerador existente a varredura por pasta. A pasta continua sendo a verdade e arquivos
órfãos continuam sendo reportados.

### API interna de reprodução

```js
sfx.characterVoice(characterId, event, { fallbackFaction, interrupt = false })
```

Comportamento:

- menu `select`: interrompe a fala anterior, abaixa a música e mostra a legenda da mesma linha;
- kill: usa `attacker.def.id`; se faltar áudio, cai para `voice.<faction>` atual;
- rádio do jogador: usa `playerCharId`;
- rádio do bot: usa `bot.def.id`;
- round/captura: continua por facção;
- manter cooldown global para não sobrepor oito bots falando;
- falha de arquivo nunca quebra seleção nem partida.

O hook do menu entra em `selectChar`. O hook de kill já existe em `_kill`; trocar a chamada por
personagem com fallback. `_botCall` também conhece `b.def.id`.

### Ferramenta de geração

Criar um script Node sem dependência de runtime no jogo:

```text
node tools/gen-character-voices.mjs \
  --provider elevenlabs \
  --faction nerdolas \
  --dry-run
```

Requisitos:

- `--dry-run` mostra textos, custo estimado quando a API fornecer e arquivos-alvo;
- `--character` e `--faction` permitem retomada;
- não sobrescrever output aprovado sem `--force`;
- normalizar volume e duração com `ffmpeg` se disponível;
- falas `kill/radio` respeitam o teto curto e a régua deve ter mutação que injete uma fala longa;
- uma voz sintética distinta pode servir dois personagens apenas se a direção, pitch e entrega
  não os fizerem soar iguais no teste cego.

## 11. Ordem de implementação

### Fase 0 - referências e trava visual

- registrar o veto a personagem protegido na ficha da facção TV;
- reunir vistas frontal, traseira e lateral de cada personagem original;
- escrever os atributos visuais que não podem se perder na conversão para GLB;
- reconstruir os modelos do zero; não extrair assets de jogos, programas ou marketplaces.

### Fase 1 - registro e seleção de dez facções

- centralizar o registro;
- adicionar cards/brasões/covers placeholder;
- implementar grade única 5×2, sem paginação ou rolagem em 1536×1024;
- garantir escolha de adversário, espelho, teclado e 3:2.

### Fase 2 - áudio por personagem

- ampliar manifest e `Sfx`;
- adicionar legenda de seleção;
- integrar select/kill/radio com fallback;
- criar `voice-lines.json`, gerador e gates.

### Fase 3 - quatro vertical slices

Produzir e integrar um personagem de cada facção: Programador Virado, Motoca Cachorro Loko,
Doidinho do Bairro e Câmera Roxa. Câmera Roxa deve seguir o design original aprovado na capa
da TV. Validar o pipeline inteiro antes do restante.

### Fase 4 - completar as três facções originais

Nerdolas, Profissionais do Corre e Noias, uma facção por vez. Cada lote passa por crítica visual externa
antes do próximo.

### Fase 5 - TV

- produzir os oito modelos originais do zero com fidelidade aos concept sheets aprovados;
- comparar lado a lado silhueta, rosto, cores, material, proporções e acessórios;
- manter nomes e falas originais do jogo;
- nunca copiar personagem, silhueta, asset, voz, música ou bordão de programa existente.

### Fase 6 - conteúdo público e release

- atualizar páginas de facção/personagens, SEO, sitemap, capas e descrições;
- gerar manifest de áudio;
- bump de versão/cache conforme `AGENTS.md`;
- rodar gates, capturas e partida completa.

## 12. Critérios de aceite

- dez facções simultaneamente visíveis na seleção, em duas linhas e sem card cortado ou
  rolagem em 1536×1024;
- navegação completa por mouse e teclado;
- qualquer facção enfrenta qualquer outra e partida espelho permanece legível;
- oito personagens em cada nova facção;
- cada novo personagem possui modelo, animação, arma, thumbnail e fallback seguro;
- selecionar personagem toca e legenda sua fala sem sobrepor a anterior;
- kill e rádio usam o personagem que realmente falou, não apenas a facção;
- ausência de áudio usa o pool antigo e não lança erro;
- nenhuma chave de provedor ou chamada TTS chega ao cliente;
- nenhum asset é extraído diretamente de jogo, programa ou pacote de terceiros;
- `npm run check:fast` e gates relevantes passam;
- capturas reais em 3:2 são avaliadas por crítico que não construiu o asset;
- a mutação de cada gate novo fica vermelha.

## 13. Fora de escopo

- converter todos os rosters antigos para oito personagens;
- gerar TTS durante a partida;
- usar gravações de memes, programas ou dubladores como dataset;
- redesenhar combate, mapas ou armas;
- produzir 32 GLBs em lote antes de validar os quatro vertical slices.
