// Charset permitido no nick. Espelho EXATO do check `players_nick_charset` no
// banco (a fonte da verdade) - ver docs/seguranca.md §8. Existe aqui pra
// devolver erro legível em vez de deixar o Postgres responder um 409 genérico
// de constraint violada.
//
// A lista é um ALLOWLIST de ASCII de propósito, não um blocklist. Blocklist de
// caractere hostil não fecha: são milhares de codepoints e cada versão do
// Unicode acrescenta mais. O que isso barra, e por quê:
//
//   homoglifo   `Аdmin` com "А" cirílico (U+0410) é pixel-a-pixel igual a
//               `Admin` e passa no unique do Postgres. Nick squatting invisível.
//   RTL override U+202E inverte a ordem visual do texto e embaralha a exibição
//               do ranking e da badge.
//   zero-width  U+200B cria nicks visualmente idênticos e distintos pro banco.
//   controle    U+0000-001F quebra render de SVG na badge.
//   `<` `>` `"` sobra de XSS: hoje o mapa escapa à mão (docs/seguranca.md §6)
//               justamente porque isso passava.
//
// CUSTO CONHECIDO: rejeita acento. `José` não registra, `Jose` sim. Para um
// público brasileiro isso é decisão de produto, não de segurança - a issue #40
// propôs este charset e é o que está implementado. Aceitar `À-ÿ` é trocar a
// classe aqui e no check do banco, juntos, sempre.
export const NICK_RE = /^[A-Za-z0-9_.\-]{2,14}$/;

export function isValidNick(nick: string): boolean {
  return NICK_RE.test(nick);
}

// Mensagem pro jogador. Curta: aparece no menu do jogo, não num formulário.
export const NICK_HINT = 'nick aceita só letras sem acento, números, ponto, hífen e _ (2 a 14)';
