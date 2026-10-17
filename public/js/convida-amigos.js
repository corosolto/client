// CONVIDAR AMIGOS (lane glm/amigos): rede nenhuma libera lista de amigos para a
// web; o fluxo é mensagem copiada + caixa de entrada aberta (Web Share no celular).
import { compartilhar, linkCompartilhavel } from './compartilhar.js';

const ASSUNTO = 'Bora jogar CORO SOLTO';

export const PLATAFORMAS = Object.freeze([
  // wa.me aceita o texto pronto: é a única que abre com a mensagem já na caixa.
  { id: 'whatsapp', nome: 'WhatsApp', url: (texto) => `https://wa.me/?text=${encodeURIComponent(texto)}`, copia: false },
  { id: 'instagram', nome: 'Instagram', url: () => 'https://www.instagram.com/direct/inbox/', copia: true },
  { id: 'x', nome: 'X (Twitter)', url: () => 'https://x.com/messages', copia: true },
  { id: 'linkedin', nome: 'LinkedIn', url: () => 'https://www.linkedin.com/messaging/', copia: true },
  { id: 'tiktok', nome: 'TikTok', url: () => 'https://www.tiktok.com/inbox', copia: true },
  { id: 'email', nome: 'E-mail', url: (texto) => `mailto:?subject=${encodeURIComponent(ASSUNTO)}&body=${encodeURIComponent(texto)}`, copia: false },
]);

export function textoConvite(nick = '') {
  const link = linkCompartilhavel('/', 'convidar-amigos');
  return `${nick ? `Sou ${nick} no CORO SOLTO. ` : ''}Bora pegar uma treta comigo? ${link}`;
}

const FEEDBACK = {
  copiado: 'Mensagem copiada. Escolha o amigo e cole no chat.',
  compartilhado: 'Convite enviado.',
  manual: 'Não consegui copiar. Copie o convite acima na mão.',
};

/** Monta o diálogo (testável em node). `doc`, `nav` e `abre` entram por parâmetro
    para a régua stubar; no jogo vêm do global. */
export function montaConvite({ nick = '', doc = globalThis.document, nav = globalThis.navigator, abre = (u) => globalThis.open(u, '_blank', 'noopener') } = {}) {
  const convite = textoConvite(nick);
  const dialog = doc.createElement('dialog');
  dialog.className = 'social-invite-dialog';
  dialog.innerHTML = '';
  const fechar = doc.createElement('button');
  fechar.type = 'button';
  fechar.className = 'social-invite-fechar';
  fechar.textContent = 'FECHAR';
  const titulo = doc.createElement('h2');
  titulo.textContent = 'CHAMAR A TURMA';
  const intro = doc.createElement('p');
  intro.className = 'social-muted';
  intro.textContent = 'O convite já vai escrito. Escolha a rede, escolha o amigo e mande.';
  const area = doc.createElement('p');
  area.className = 'social-invite-texto';
  area.textContent = convite;
  const grade = doc.createElement('div');
  grade.className = 'social-invite-grade';
  const aviso = doc.createElement('p');
  aviso.className = 'social-invite-aviso';
  aviso.setAttribute('role', 'status');

  for (const plataforma of PLATAFORMAS) {
    const botao = doc.createElement('button');
    botao.type = 'button';
    botao.dataset.plataforma = plataforma.id;
    botao.textContent = plataforma.nome;
    botao.onclick = async () => {
      if (plataforma.copia) {
        try { await nav.clipboard.writeText(convite); aviso.textContent = FEEDBACK.copiado; }
        catch { aviso.textContent = FEEDBACK.manual; }
      }
      abre(plataforma.url(convite));
    };
    grade.append(botao);
  }

  if (typeof nav?.share === 'function') {
    const nativo = doc.createElement('button');
    nativo.type = 'button';
    nativo.dataset.plataforma = 'nativo';
    nativo.textContent = 'MAIS APPS';
    nativo.onclick = async () => {
      aviso.textContent = resultado === 'cancelado' ? '' : (FEEDBACK[resultado] || '');
    };
    grade.append(nativo);
  }

  dialog.append(fechar, titulo, intro, area, grade, aviso);
  fechar.onclick = () => dialog.close();
  return dialog;
}

export function abrirConviteAmigos(nick) {
  const dialog = montaConvite({ nick });
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  document.body.append(dialog);
  dialog.showModal();
  return dialog;
}
