/* Anúncio antes do lobby: onDone libera a entrada uma vez, no fechamento ou na ausência
   de campanha elegível. O catálogo só anuncia modos disponíveis com captura real. */

const VISTOS_KEY = 'csbr-mode-ann-seen';

const CATALOGO = [{
  id: 'operacao_flavio',
  kicker: 'NOVO MODO · ESCOLTA',
  titulo: 'OPERAÇÃO FLÁVIO',
  texto: 'Escolte o VIP do terminal até o avião enquanto a equipe adversária tenta interceptar a rota.',
  fatos: [
    'Duas equipes: escolta contra interceptação',
    'Rota por checkpoints do terminal à pista',
    'O embarque do VIP decide a rodada',
  ],
  imagem: '/img/mode-announcements/flavio-apron.webp',   // captura real 1920x1080 (pátio/avião)
  miniatura: '/img/mode-announcements/flavio-hangar.webp', // secundária 960x540 (hangar)
}];

const CSS = `
.cs-modes-dialog{--cs-modes-a:#f6c445;width:100vw;height:100vh;height:100dvh;max-width:100vw;max-height:100vh;max-height:100dvh;border:0;padding:0;margin:0;background:#0a0c10;color:#f2efe6;overflow:hidden;font-family:'Arial Narrow','Franklin Gothic Medium','Roboto Condensed',Arial,sans-serif}
.cs-modes-dialog::backdrop{background:#05070a}
.cs-modes-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}
.cs-modes-veil{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,7,11,.94),rgba(5,7,11,.8) 34%,rgba(5,7,11,.3) 66%,rgba(5,7,11,.08))}
.cs-modes-painel{position:relative;height:100%;max-width:660px;box-sizing:border-box;padding:clamp(20px,5vw,64px);display:flex;flex-direction:column;gap:12px;overflow-y:auto;overscroll-behavior:contain}
.cs-modes-painel>*{flex:0 0 auto}
.cs-modes-painel>:first-child{margin-top:auto}
.cs-modes-painel>:last-child{margin-bottom:auto}
.cs-modes-logo{height:clamp(54px,6vw,72px);width:auto;align-self:flex-start;object-fit:contain}
.cs-modes-kicker{margin:0;font-size:clamp(12px,1.5vw,16px);letter-spacing:.34em;color:var(--cs-modes-a);text-transform:uppercase}
.cs-modes-titulo{margin:0;font-family:Impact,Haettenschweiler,'Franklin Gothic Medium','Arial Narrow Bold',sans-serif;font-size:clamp(42px,7vw,88px);line-height:.94;letter-spacing:.01em;color:#fff;text-transform:uppercase;text-shadow:0 4px 28px rgba(0,0,0,.6)}
.cs-modes-texto{margin:0;max-width:34em;font-size:clamp(15px,1.9vw,19px);line-height:1.45;color:#e7e2d4}
.cs-modes-fatos{list-style:none;margin:2px 0 0;padding:0;display:grid;gap:8px;max-width:34em}
.cs-modes-fatos li{position:relative;padding-left:16px;font-size:clamp(14px,1.7vw,17px);color:#efeadd}
.cs-modes-fatos li::before{content:'';position:absolute;left:0;top:.45em;width:8px;height:8px;background:var(--cs-modes-a)}
.cs-modes-mini{width:min(190px,42vw);border:2px solid rgba(246,196,69,.55);border-radius:6px}
.cs-modes-acoes{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px}
.cs-modes-acoes button{min-height:44px;min-width:44px;padding:0 22px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:.08em;cursor:pointer}
.cs-modes-primario{background:var(--cs-modes-a);border:0;color:#191203}
.cs-modes-primario:hover,.cs-modes-primario:focus-visible{filter:brightness(1.07)}
.cs-modes-secundario{background:rgba(8,10,14,.55);border:1px solid rgba(242,239,230,.45);color:#f2efe6}
.cs-modes-acoes button:focus-visible{outline:3px solid #fff;outline-offset:2px}
@media (max-width:640px){.cs-modes-veil{background:linear-gradient(180deg,rgba(5,7,11,.88),rgba(5,7,11,.45) 45%,rgba(5,7,11,.94))}.cs-modes-painel{padding-bottom:clamp(20px,6vh,44px)}.cs-modes-painel>:last-child{margin-bottom:0}}
@media (orientation:landscape) and (max-height:420px){.cs-modes-painel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 16px;padding:clamp(10px,2.5vh,16px) clamp(16px,4vw,28px);overflow-y:auto}.cs-modes-painel>*{margin:0}.cs-modes-painel>:first-child{margin-top:0}.cs-modes-painel>:last-child{margin-bottom:0}.cs-modes-logo{height:clamp(28px,9vh,40px)}.cs-modes-kicker{font-size:clamp(10px,2.2vh,13px);letter-spacing:.26em}.cs-modes-titulo{font-size:clamp(28px,12vh,46px);line-height:.95}.cs-modes-texto{font-size:13px;line-height:1.35}.cs-modes-fatos{grid-column:1;gap:4px;margin:0;font-size:12px}.cs-modes-fatos li{font-size:12px;padding-left:13px}.cs-modes-fatos li::before{width:6px;height:6px;top:.4em}.cs-modes-logo,.cs-modes-kicker,.cs-modes-titulo,.cs-modes-texto,.cs-modes-acoes{grid-column:1/-1}.cs-modes-mini{grid-column:2;width:clamp(84px,24vh,132px);height:auto;align-self:start}.cs-modes-acoes{gap:8px;margin-top:4px}.cs-modes-acoes button{min-height:44px;padding:0 16px;font-size:14px}.cs-modes-acoes button:focus-visible{outline-width:2px;outline-offset:1px}}
@media (prefers-reduced-motion:no-preference){.cs-modes-painel{animation:cs-modes-in .26s ease-out both}@keyframes cs-modes-in{from{opacity:0;transform:translateY(10px)}}}
`;

let aberto = null;

function el(tag, classe, texto) {
  const n = document.createElement(tag);
  if (classe) n.className = classe;
  if (texto != null) n.textContent = texto;
  return n;
}
function lidos() {
  try { return new Set(JSON.parse(localStorage.getItem(VISTOS_KEY) || '[]')); }
  catch { return new Set(); }
}
function marcarVisto(id) {
  try { const s = lidos(); s.add(id); localStorage.setItem(VISTOS_KEY, JSON.stringify([...s])); }
  catch { /* storage bloqueado: só repete na próxima sessão */ }
}

function abrir(c, onDone) {
  if (!document.getElementById('cs-modes-style')) {
    const st = el('style'); st.id = 'cs-modes-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }
  const dlg = el('dialog', 'cs-modes-dialog');
  dlg.setAttribute('aria-labelledby', 'cs-modes-titulo');
  const bg = el('img', 'cs-modes-bg'); bg.src = c.imagem; bg.alt = ''; bg.setAttribute('aria-hidden', 'true');
  const veil = el('div', 'cs-modes-veil'); veil.setAttribute('aria-hidden', 'true');
  const painel = el('div', 'cs-modes-painel');
  const logo = el('img', 'cs-modes-logo'); logo.src = '/logo.png'; logo.alt = 'CORO SOLTO';
  const kicker = el('p', 'cs-modes-kicker', c.kicker);
  const titulo = el('h1', 'cs-modes-titulo', c.titulo); titulo.id = 'cs-modes-titulo';
  const texto = el('p', 'cs-modes-texto', c.texto);
  const fatos = el('ul', 'cs-modes-fatos');
  for (const f of c.fatos) fatos.appendChild(el('li', null, f));
  painel.append(logo, kicker, titulo, texto, fatos);
  if (c.miniatura) {
    const mini = el('img', 'cs-modes-mini'); mini.src = c.miniatura; mini.alt = 'Hangar do aeroporto do novo modo';
    painel.appendChild(mini);
  }
  const acoes = el('div', 'cs-modes-acoes');
  const entrar = el('button', 'cs-modes-primario', 'ENTRAR NO LOBBY');
  const fecharBtn = el('button', 'cs-modes-secundario', 'FECHAR');
  fecharBtn.setAttribute('aria-keyshortcuts', 'Escape');
  acoes.append(entrar, fecharBtn);
  painel.appendChild(acoes);
  dlg.append(bg, veil, painel);
  let fechado = false;
  const fechar = () => {
    if (fechado) return; fechado = true; aberto = null;
    marcarVisto(c.id);            // flag só após fechamento explícito (botão ou Escape)
    dlg.close(); dlg.remove();
    onDone?.();
  };
  entrar.addEventListener('click', fechar);
  fecharBtn.addEventListener('click', fechar);
  dlg.addEventListener('cancel', fechar);   // Escape (dialog nativo, foco preso)
  document.body.appendChild(dlg);
  dlg.showModal();
  entrar.focus();
  aberto = dlg;
  return true;
}

export function mostrarNovidadesModos({ mapIds = [], onDone = null, force = false } = {}) {
  if (aberto) { onDone?.(); return false; }              // já há campanha na tela
  const ids = Array.isArray(mapIds) ? mapIds : [];
  const c = CATALOGO[0];
  // Replay ignora o histórico, nunca a disponibilidade do modo.
  if (!ids.includes(c.id) || (!force && lidos().has(c.id))) { onDone?.(); return false; }
  try { return abrir(c, onDone); }
  catch { document.querySelector('dialog.cs-modes-dialog')?.remove(); aberto = null; onDone?.(); return false; }
}
