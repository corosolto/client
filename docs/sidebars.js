// Sidebar MANUAL, na ordem em que a doc deve ser lida.
// Autogerado ficaria em ordem de arquivo e a leitura perderia o fio: aqui a ordem é
//
//   o que é o jogo -> com o que é feito -> como o trabalho é feito -> qual é a régua
//   -> como não colidir com quem já está editando -> como entrar
//   -> o que está verde e o que está vermelho HOJE
//
// Duas trocas de 05/08/2026, e o motivo de cada uma:
//   · `arquitetura` subiu para ANTES de `colaborar`, porque a página de colaborar manda
//     consultar a tabela de conflito e antes mandava para uma página que vinha depois.
//   · `estado` fica por último de propósito: é a única página que envelhece por si, e é a
//     que menos ajuda quem ainda não entendeu a régua.
//
// A página de licença saiu em 12/08/2026. Ela era publicada em dois idiomas com sincronia
// À MÃO, e foi assim que `/docs/en/license` passou dias afirmando "the code is under the
// MIT License" depois da migração para AGPL — tradução atrasada de página de licença é
// pior que página nenhuma. O que é normativo já é gerado em outro lugar: o `LICENSE`
// declara, o `README.md` publica o nome vigente, e a tabela de superfícies mora no
// `CONTRIBUTING.md`. As decisões e o porquê ficaram em `docs/LICENCA.md`, fora do site.

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  dev: [
    'comecando',
    'stack',
    'instrumentacao-ai',
    'quality-gates',
    'botbrain',
    'arquitetura',
    'colaborar',
    'estado',
  ],
};

module.exports = sidebars;
