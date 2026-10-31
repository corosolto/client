import {wallpaperJavaporcos} from './javaporcos_apresentacao.js';
const CHAVE = 'cs-javaporcos-cidade-anuncio-v1';
export function anunciarJavaporcos({jogar, multiplayer} = {}) {
  try { if (localStorage.getItem(CHAVE)) return null; } catch {}
  if (document.querySelector('dialog[open]')) return null;
  const anterior = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.id = 'javaporcos-novidade';
  dialog.setAttribute('aria-labelledby','javaporcos-novidade-titulo');
  dialog.innerHTML = `<style>
#javaporcos-novidade{position:fixed;inset:0;margin:auto;padding:0;border:1px solid #a8b17a;background:#121c17;color:#f7f1dc;width:min(920px,92vw);max-height:92dvh;overflow:auto;box-shadow:0 24px 120px #000c}
#javaporcos-novidade::backdrop{background:#030b09dc}
#javaporcos-novidade .jn-art{width:100%;aspect-ratio:16/7;object-fit:cover;display:block}
#javaporcos-novidade .jn-copy{padding:clamp(20px,4vw,36px)}
#javaporcos-novidade .jn-kicker{color:#d5de84;font:700 12px Arial;letter-spacing:.2em}
#javaporcos-novidade h2{font:italic 900 clamp(30px,5vw,52px)/1 Arial;margin:12px 0}
#javaporcos-novidade p{font:16px/1.5 Arial;max-width:660px}
#javaporcos-novidade .jn-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
#javaporcos-novidade button{padding:13px 18px;font:700 14px Arial;cursor:pointer;border:1px solid #ccd97b;background:#ccd97b;color:#132018}
#javaporcos-novidade button[data-close],#javaporcos-novidade button[data-mp]{background:transparent;color:#f7f1dc}
#javaporcos-novidade button:focus-visible{outline:3px solid white;outline-offset:3px}
@media(max-height:550px){#javaporcos-novidade .jn-art{aspect-ratio:5/1}#javaporcos-novidade .jn-copy{padding:16px}}
</style><img class="jn-art" alt="Javaporcos invadem uma cidade cercada pela mata">
<div class="jn-copy"><span class="jn-kicker">NOVO MODO · CIDADE INVADIDA</span>
<h2 id="javaporcos-novidade-titulo">CAÇA AO JAVAPORCO</h2>
<p>Os bandos saem da mata, invadem as lojas e tomam o bairro. Defenda a cidade, explore as casas e suba na torre para cobrir seus aliados.</p>
<p>Solo: você e bots, de 4 a 8 defensores. Consulte as salas para saber onde o cooperativo de 4 a 8 jogadores está disponível.</p>
<div class="jn-actions"><button type="button" data-play autofocus>JOGAR SOLO</button><button type="button" data-mp>VER SALAS COOPERATIVAS</button><button type="button" data-close>AGORA NÃO</button></div></div>`;
  dialog.querySelector('img').src = wallpaperJavaporcos(0);
  const fechar = () => { dialog.close(); dialog.remove(); if (anterior?.isConnected) anterior.focus(); };
  dialog.querySelector('[data-play]').onclick = () => { fechar(); jogar?.(); };
  dialog.querySelector('[data-mp]').onclick = () => { fechar(); multiplayer?.(); };
  dialog.querySelector('[data-close]').onclick = fechar;
  dialog.addEventListener('cancel',e=>{e.preventDefault();fechar();});
  document.body.append(dialog);
  dialog.showModal();
  try { localStorage.setItem(CHAVE,'1'); } catch {}
  return dialog;
}
