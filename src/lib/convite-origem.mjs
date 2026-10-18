// As mesmas chaves que `_sendAcquisition` lê em public/js/main.js; régua: convite-origem-check.
export const CHAVES_ORIGEM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'];

export function hrefEntrarNaSala(convite, origem) {
  const destino = new URLSearchParams({ sala: convite });
  for (const chave of CHAVES_ORIGEM) {
    const valor = origem?.get(chave);
    if (valor && valor.length <= 60) destino.set(chave, valor);
  }
  return `/?${destino}`;
}
