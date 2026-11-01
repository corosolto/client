# Arma e luva no corpo TP

R276 reproduziu no Game real o bot de pistola/MP5 trocando de lado com modelo AWP;
R280 reproduziu o nascimento do corpo GLB antes da luva. A correção encaminha os
campos existentes ao builder e inclui o preload próprio na barreira existente.
Não muda rig, pose, cache, geometria ou cosméticos de outros atores.

`npm run eval:tp-identity` mede objetos reais com GLTFLoader e os GLBs publicados.
Texturas são substituídas por DataTexture CPU1×1. Não é uma régua de raster,
persistência, compra/equipagem da loja, multiplayer ou aceite artístico.
A seleção da luva no início é o contrato; troca dinâmica no mesmo Game fica fora.

Cada fixture roda em processo fresco. W mede arma solicitada, porte de uma/duas
mãos, ownership, cena, cache e ausência de rebuild numa única sincronização.
O mede luva própria vinculada aos ossos do corpo por identidade; cache estável;
nenhuma luva sem seleção mesmo com pacote quente; bot Barbudo compatível distinto
sem herdar luva, no swap e rebuild. Um pacote deliberadamente incompatível é
recusado pelo helper existente, preservando o corpo GLB.

C executa o recorte real de preload e nascimento de main, usando o construtor
real e aguardarPreloads. Um latch segura a conclusão do parse da luva antes do
cache. As outras cargas terminam antes da observação; tempo não é prova da
barreira. O primeiro corpo é registrado no nascimento, antes de liberar o latch.
Outra carga rejeitada não pode antecipar esse nascimento. Sem seleção e navOnly
não pedem luva; navOnly não é prova de corpo GLB carregado.

| Mutante na fonte real | Cláusulas vermelhas exigidas |
|---|---|
| swap-weapon: remove a arma do bot no swap | W1, W2, W3 |
| own-glove: remove a luva no builder próprio | O1, C4 |
| glove-preload: remove a entrada na barreira | C1, C2, C3, C4, C6 |
| boot-await: remove o await da barreira | C2, C3, C4, C6 |

Nominal verde vem antes de cada mutante. A cópia mutada vive em diretório único
gitignored, removido no finally; produto no disco não é alterado. Falha de âncora,
asset, processo, recibo ou fonte divergente é infra3, sem crédito de detecção.
O pai exige versão, fixture, mutante, hashes, IDs únicos na ordem, booleanos e
coerência entre exit e cláusulas. RED de filho não pode sumir no agregador.
Ambiente herdado de worker sem marcador interno explícito é recusado; opções
públicas não podem virar execução parcial de fixture. CLI inválida sai2; falha semântica sai1; nominal verde/mutante detectado sai0.
`--json=/caminho/absoluto` conserva o recibo completo; stdout traz só o resumo.

Ego é a aceitação separada de imagem/interação, registrada no handoff da frente.
O resultado CPU não aprova dedos, acabamento do personagem, animação ou mapa.
