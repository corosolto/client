# Derivados de luvas e fontes atuais

A missão integral inclui mapas, personagens, skins, movimento, mira e a fila de PRs/release. Flávio #1158 fica excluído; fluxos de UI e redes sociais vêm depois. Este checkpoint recuperável trata da procedência dos derivados de luvas na branch `codex/tp-cosmetic-source-r600-20261101`, sobre S1 `f3952dbf6a958b7fa79b5638a8a1d62993951030`. O runtime cosmético permanece em WIP separado neste checkout.

R639 mediu quatro fontes divergentes do catálogo: Caipora, Canarinho, Zumbi e Esquerdomacho. A fábrica original `--check` reproduziu a divergência antes de qualquer escrita em R641. R644 encontrou no Git todos os SHA-256 históricos declarados e comparou fontes antigas/atuais por accessor e cobertura de bytes. Caipora, Zumbi e Esquerdomacho mudaram somente NORMAL; Canarinho mudou POSITION fora das faces das mãos. Seleções, índices, UV, pesos, famílias, hierarquia e matrizes de bind das mãos permaneceram iguais. Nenhum hash foi simplesmente reassinado.

R656 calculou o novo censo e os artefatos em memória antes da escrita. Só as quatro entradas de origem mudam nas seleções; os faceIDs permanecem exatos. Só três GLBs derivados mudam, refletindo as normais atuais; o pacote de Canarinho permanece byte idêntico. Os outros derivados base e o pacote de primeira pessoa permanecem byte idênticos. As métricas de geometria, famílias e pesos são preservadas. O hash global do arquivo de seleções propaga metadados aos registros 3P, comportamento existente da fábrica.

Foram usados os comandos oficiais `build.mjs --write-selections`, `build.mjs --write` e `tools/gen-asset-rev.mjs`. Todos os artefatos escritos coincidiram exatamente com os hashes previstos. O gerador de revisão mudou somente as entradas dos três GLBs alterados.

Validação Node22.23.4: `build.mjs --check` e os quatro testes existentes em `tools/character-kit/gloves/gloves.test.mjs` passaram. O alias completo `eval:tp-cosmetic-source`, no runtime WIP separado, passou nominal e seus sete mutantes após a regeneração. Recibos externos: `SKIN-FACTORY-PLAN-R656.json`, `SKIN-FACTORY-WRITE-R656.json` e `SKIN-FACTORY-CHECKS-R656.json` em `audits/2026-10-31-visual-consistency/` na raiz agregadora; procedência detalhada em `SKIN-BASE-PROVENANCE-R644-*`.

As flags visualApproved/runtimeEnabled da fábrica continuam falsas. Esta medição não aprova encaixe, deformação, anatomia, material, contato, raster, UI, mobile físico ou multiplayer. O TaskSpace56 do Ego desapareceu e a retomada de QA visual depende da recuperação de espaço; não foi usado outro espaço do usuário.

Próximo: revisão independente integral dos derivados e runtime, QA visual corrente, publicação normal da camada e integração das dependências S1/identidade. O ledger externo `CURRENT-STATE-20261031.json` conserva as demais frentes e owners. Nenhuma alteração em corpo fonte, física, animação, viewmodel ou release neste checkpoint.
