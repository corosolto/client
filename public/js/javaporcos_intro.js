import { wallpaperJavaporcos } from './javaporcos_apresentacao.js';
import { startVisibleRotation } from './media-rotation.js';
let pending = null;
export function apresentarJavaporcos(signal) {
  if (signal?.aborted) return Promise.resolve();
  if (pending) return pending;
  const dialog = document.createElement('dialog');
  dialog.id = 'javaporcos-intro';
  dialog.setAttribute('aria-labelledby', 'javaporcos-intro-title');
  dialog.innerHTML = `<style>
#javaporcos-intro{position:fixed;inset:0;margin:auto;height:fit-content;box-sizing:border-box;width:min(1040px,94vw);max-height:94dvh;overflow:auto;padding:0;border:1px solid #b8a371;background:#161b12;color:#f6f1df;font-family:Arial,sans-serif;box-shadow:0 24px 100px #000c}
#javaporcos-intro::backdrop{background:#000d}
#javaporcos-intro .ji-art{height:clamp(150px,32vh,340px);background:center/cover}
#javaporcos-intro .ji-copy{padding:clamp(20px,4vw,40px)}
#javaporcos-intro h1{font-size:clamp(28px,5vw,48px);line-height:1;margin:8px 0 24px;font-style:italic;text-transform:uppercase}
#javaporcos-intro p{font-size:clamp(16px,2vw,20px);line-height:1.45;max-width:760px}
#javaporcos-intro .ji-scroll{height:clamp(160px,27vh,260px);overflow:auto;mask-image:linear-gradient(transparent,#000 8%,#000 90%,transparent)}
#javaporcos-intro .ji-text{animation:ji-rolar 28s linear 3s infinite;padding:4px 0 20px}
#javaporcos-intro .ji-scroll:hover .ji-text,#javaporcos-intro .ji-scroll:focus-within .ji-text{animation-play-state:paused}
@keyframes ji-rolar{0%,12%{transform:translateY(0)}85%,100%{transform:translateY(-30%)}}
@media(prefers-reduced-motion:reduce){#javaporcos-intro .ji-text{animation:none}}
#javaporcos-intro .ji-kicker{letter-spacing:.18em;color:#d4bd7c;font-size:12px;font-weight:bold}
#javaporcos-intro .ji-objective{border-left:3px solid #d4bd7c;padding-left:16px;font-weight:bold}
#javaporcos-intro .ji-actions{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:26px}
#javaporcos-intro button{cursor:pointer;font:700 16px Arial;padding:14px 20px;border:1px solid #d4bd7c;background:#d4bd7c;color:#181c13}
#javaporcos-intro button[data-pular]{background:transparent;color:#f6f1df;border-color:#8f927f}
#javaporcos-intro button:focus-visible{outline:3px solid white;outline-offset:4px}
</style><div class="ji-art" role="img" aria-label="Javaporcos avançam da mata para a cidade"></div>
<div class="ji-copy"><span class="ji-kicker">INVASÃO DOS JAVAPORCOS</span>
<h1 id="javaporcos-intro-title">A praga chegou ao bairro.</h1>
<div class="ji-scroll" tabindex="0" aria-label="Apresentação da praga; passe o mouse ou dê foco para pausar"><div class="ji-text"><p>O javaporco é o cruzamento do javali europeu com o porco doméstico. Invasor no Brasil, revira o solo, destrói lavouras e se multiplica rápido. Pode atacar.</p>
<p class="ji-objective">Mantenha seu time vivo. Mesmo com a cidade toda ocupada, um sobrevivente mantém a resistência. Proteja as lojas e retome os setores invadidos. Limpe os setores para reduzir a ocupação.</p><p>Explore a mata, procure os bandos e impeça que cheguem às lojas. O relógio da partida continua; a contagem de cada onda aparece separada.</p></div></div>
<div class="ji-actions"><button type="button" data-defender autofocus>Defender a cidade</button><button type="button" data-pular>Pular</button></div></div>`;
  let wall = 0;
  const art = dialog.querySelector('.ji-art');
  art.style.backgroundImage = `url('${wallpaperJavaporcos(wall)}')`;
  document.body.append(dialog);
  dialog.showModal();
  pending = new Promise(resolve => {
    const stop = startVisibleRotation(async () => {
      const image = new Image(); image.src = wallpaperJavaporcos(++wall);
      await image.decode();
      if (dialog.open) art.style.backgroundImage = `url('${image.src}')`;
    }, () => dialog.open);
    const finish = () => { stop(); signal?.removeEventListener('abort', finish); dialog.close(); dialog.remove(); pending = null; resolve(); };
    signal?.addEventListener('abort', finish, { once: true });
    dialog.addEventListener('cancel', e => { e.preventDefault(); finish(); }, { once: true });
    dialog.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); } });
    dialog.querySelector('[data-pular]')?.addEventListener('click', finish, { once: true });
    dialog.querySelector('[data-defender]').addEventListener('click', finish, { once: true });
  });
  return pending;
}
