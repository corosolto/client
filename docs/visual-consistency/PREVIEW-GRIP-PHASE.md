# Fase da pegada no preview

O preview captura a pegada após a pose funcional de porte assentar, preservando
`TP_FRONT_MAX_CHAR.canarinho=0.20`. O assentamento roda uma vez na construção do
preview dos personagens com esse limite: 60 updates de 1/30 s, além dos dez já
existentes. Isso avança o tempo simulado em dois segundos; não representa custo
de parede medido. O caminho fora do preview mantém seus dez updates.

`node tools/eval/preview-grip-phase-check.mjs --json` carrega GLBs, esqueletos e
clipes reais, usando materiais neutros sem imagens. Mede oito combinações reais
sem skins, em oito amostras por combinação, com giro do menu. Não valida pixels,
fidelidade dos dedos, material, FPS, nem os três casos com skin do gate browser.

A referência é o modelo de jogo funcional. Canarinho/Deagle deve capturar a fase
em até 2 graus, manter a palma em z até 0,23 m e preservar o limite de frente.
LA1–LA5 e deriva continuam medidos sem elevar os limites herdados.

Contraprovas físicas, sempre após nominal verde com inventário completo:

- `--mutante=sem-settle`: Canarinho/Deagle reprova somente FASE e LA1.
- `--mutante=fase-inclinada`: adiciona dez graus à pegada capturada; somente FASE.
- `--mutante=frente-sem-clamp`: desliga a condição física de frente; somente FRENTE-Z.

O verificador exige o conjunto exato de casos e cláusulas. Nominal verde sai 0;
nominal válido vermelho sai 1; uso inválido sai 2; infraestrutura sai 3. Uma
contraprova sai 0 somente quando o nominal passa e sua regressão exata é medida.
O JSON é a saída completa em stdout; temporários são exclusivos por execução e
removidos ao terminar. O gate de lobby no browser mantém os onze casos completos
incluindo skins, e a aprovação visual continua separada.
