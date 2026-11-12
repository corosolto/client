<!-- spec:time -->
# Fora do Ar

Fonte de conteúdo: `operations/passe-sessao-da-treta-spec.md` §2 e §6 no workspace do programa. O registro importável é `public/js/factions.js`; elenco e níveis são os de `public/js/characters.js`, não uma segunda lista neste documento.

Identidade: TV analógica brasileira, assombração de bairro e lendas de madrugada. Os personagens do passe não recebem vantagem competitiva: usam armas, vida, movimento, colisão e hitboxes existentes. Esta frente não cria habilidades nem altera a economia do passe.

## 1. Capitão Caveira — fatia vertical

- **Visual:** boina escura, uniforme tático preto, joelheiras, botas e emblema de caveira original. Corpo e animações do pack Studio fixado em `public/js/data/content-releases.js`; não há modelo procedural substituto.
- **Papel:** combatente de fuzil, jogável nos dois lados da partida sem virar um terceiro time de gameplay.
- **Arma:** AK do acervo existente no preview, selecionada por `charWeapon`. A partida preserva o equipamento inicial e a economia já existentes.
- **Mecânica:** rajada controlada e recarga do fuzil já implementado; a liberação é o resgate verificado pelo servidor, não XP/localStorage informado pelo navegador. Sem bônus de dano, tamanho de hitbox ou mobilidade por ser personagem de passe.
- **Procedência:** Studio Assets, `creepypasta-season-20261108/characters/capitao-caveira/PROVENANCE.md` e `ficha.json`. Rosto e uniforme originais; sem farda/insígnia real, sem personagem de filme/TV, sem gore ou sangue.

## Arte e verificação

- Brasão/capa: `public/img/faccoes/FONTE.md`, referências originais do jogo e geração offline Codex CLI.
- Avatares, recortes, heros, resultados e seleção WebM: frames do mesmo `buildCharacterModel` e clipes verificados do jogo, via `public/charvideo.html` e ferramentas de captura.
- Gate anterior à integração: `tools/eval/fora-do-ar-check.mjs`; remove-faccao, lista-fixa e sem-avatar precisam reprovar a cláusula correta. `tools/eval/passe-debug-check.mjs` impede bypass sem debug explícito ou fora de loopback.
- Voz não gerada: o pipeline existente só oferece OpenRouter/ElevenLabs pagos. O pedido autoriza registrar esta pendência, não clonar voz nem criar fallback falso.
- Distribuição dos packs em produção depende de R2 configurado pelo dono; `STUDIO_PACK_ROOT` serve somente a instalação local, sem copiar modelos para o legado.
- Bots: personagem do passe não entra no sorteio de bot (`_sorteavel` em `public/js/game.js`). O corpo é pack Studio (`/packs/`) e fica travado até o servidor destravar para quem joga; sorteá-lo punha ~1/3 dos bots baixando pack, e sem pack o bot caía em caixa (ARM2). Escalação explícita (pin no seletor) continua valendo.
