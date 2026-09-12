/* Limiares de mapa compartilhados entre réguas que medem O MESMO conceito.

   Existe pela lição 2 de docs/LICOES.md: duas réguas com limiar próprio para a mesma coisa
   são o instrumento discordando de si. O caso que criou este arquivo é recente e foi pego na
   revisão antes do push: a LV4 do lajes-vertical nasceu com `const COVER_ESPAC = 7.0` e um
   comentário dizendo "o mesmo teto da QUAD_ESPAC do map-check" — o comentário prometia
   compartilhamento e o código copiava o número. Comentário não é mecanismo. */

/* Espaçamento médio máximo entre peças de cobertura de um quadrante, em metros.
   DE ONDE VEM: com densidade d peças por 100 m², o espaçamento médio é √(100/d). 7,0 m são
   DUAS ARESTAS do grafo de navegação do jogo (STEP = 3,4 m) — acima disso um bot atravessa o
   quadrante inteiro percorrendo duas arestas sem ter uma peça de cobertura ao alcance, que é
   em número o "o mapa fica vazio" do dono. Consumidores: MAP5 (map-check.mjs, todos os mapas)
   e LV4 (lajes-vertical-check.mjs, cover da praça). */
export const QUAD_ESPAC = 7.0;
