// Renderizador único do CHANGELOG.md. /changelog e /whats-new só trocam o cromo;
// o parser mora aqui pra as duas páginas não divergirem (caso MIT/AGPL do /about).
export type Versao = { versao: string; data: string; html: string };

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s: string): string {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
}

function render(linhas: string[]): string {
  const out: string[] = [];
  let emLista = false;
  const fechaLista = () => { if (emLista) { out.push('</ul>'); emLista = false; } };
  for (const l of linhas) {
    const h3 = l.match(/^###\s+(.*)$/);
    if (h3) { fechaLista(); out.push(`<h3>${inline(h3[1])}</h3>`); continue; }
    const li = l.match(/^\s*[-*]\s+(.*)$/);
    if (li) {
      if (!emLista) { out.push('<ul>'); emLista = true; }
      out.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    if (!l.trim()) { fechaLista(); continue; }
    if (emLista) { out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, ' ' + inline(l.trim()) + '</li>'); continue; }
    out.push(`<p>${inline(l.trim())}</p>`);
  }
  fechaLista();
  return out.join('\n');
}

export function parseChangelog(md: string): { versoes: Versao[]; recentes: Versao[]; atualVer: string } {
  const versoes: Versao[] = [];
  let atual: { versao: string; data: string; linhas: string[] } | null = null;
  for (const raw of md.split('\n')) {
    const h2 = raw.match(/^##\s+\[?([^\]\s]+)\]?\s*(?:\u2014|-)?\s*(.*)$/);
    if (h2) {
      if (atual) versoes.push({ versao: atual.versao, data: atual.data, html: render(atual.linhas) });
      atual = { versao: h2[1], data: h2[2].trim(), linhas: [] };
      continue;
    }
    if (atual) atual.linhas.push(raw);
  }
  if (atual) versoes.push({ versao: atual.versao, data: atual.data, html: render(atual.linhas) });
  return { versoes, recentes: versoes.slice(0, 12), atualVer: versoes[0]?.versao ?? '' };
}
