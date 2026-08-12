// Componente raiz do editor: monta a sidebar e o palco, instancia a réplica
// (VmStage) e o painel, e liga o ciclo de vida (start/stop por troca de aba).
// A página (/editor) só chama mountEditor(host); todo o estado mora aqui.
import { Project } from './project.js';
import { VmStage } from './scene/vm.js';
import { mountVmPanel } from './panels/vm-panel.js';
import { MapProject } from './mapproject.js';
import { MapStage } from './scene/map.js';
import { mountMapPanel } from './panels/map-panel.js';
import { AlignStage } from './scene/align.js';
import { mountAlignPanel } from './panels/align-panel.js';

export async function mountEditor(root) {
  const project = new Project();
  const side = root.querySelector('#side-editor');
  const host = root.querySelector('#host-editor');
  const ov = root.querySelector('#ov-editor');
  const sideMap = root.querySelector('#side-map');
  const hostMap = root.querySelector('#host-map');
  const sideAlign = root.querySelector('#side-align');
  const hostAlign = root.querySelector('#host-align');

  await preloadRuntimes();

  const stage = new VmStage(host, ov, project);
  const panel = mountVmPanel(side, project, stage);

  const mapProject = new MapProject('meu_mapa');
  const mapStage = new MapStage(hostMap, mapProject);
  const mapPanel = mountMapPanel(sideMap, mapProject, mapStage);

  // alinhamento: inicializa lazy (só cria quando o tab abre pela 1ª vez)
  let alignStage = null;
  let alignPanel = null;

  let active = 'editor';
  const tabs = root.querySelectorAll('#devtabs button');
  tabs.forEach((b) => (b.onclick = () => activate(b.dataset.tab)));

  function activate(name) {
    if (name === active) return;
    stage.stop();
    mapStage.stop();
    if (alignStage) alignStage.stop();
    tabs.forEach((tb) => tb.classList.toggle('on', tb.dataset.tab === name));
    active = name;

    host.style.display = name === 'editor' ? 'block' : 'none';
    hostMap.style.display = name === 'map' ? 'block' : 'none';
    hostAlign.style.display = name === 'align' ? 'block' : 'none';
    if (ov) ov.style.display = name === 'editor' ? '' : 'none';
    side.hidden = name !== 'editor';
    sideMap.hidden = name !== 'map';
    sideAlign.hidden = name !== 'align';

    if (name === 'editor') {
      stage.start();
    } else if (name === 'map') {
      mapStage.renderAll();
      mapStage.start();
    } else if (name === 'align') {
      if (!alignStage) {
        alignStage = new AlignStage(hostAlign);
        alignPanel = mountAlignPanel(sideAlign, alignStage);
        alignStage.rebuild();
      }
      alignStage.start();
    }
  }

  stage.start();

  addEventListener('resize', () => {
    if (active === 'editor') stage._fit && stage._fit();
    else if (active === 'map') mapStage._fit && mapStage._fit();
    else if (active === 'align' && alignStage) alignStage._fit && alignStage._fit();
  });

  // ?vmlab=1 → abre direto no alinhamento
  const initTab = (new URLSearchParams(location.search).get('vmlab') === '1') ? 'align' : 'editor';
  if (initTab !== 'editor') activate(initTab);

  const api = { project, stage, panel, mapProject, mapStage, mapPanel, alignStage, alignPanel, activate };
  if (typeof window !== 'undefined') window.__editor = api;
  return api;
}

// Pré-carrega as libs do jogo UMA vez (a mesma fronteira do boot do main.js).
let _ready = null;
function preloadRuntimes() {
  if (!_ready) {
    _ready = Promise.all([
      import('../weapons.js').then((m) => m.preloadWeapons()),
      import('../audio.js').then(() => {}),
    ]);
  }
  return _ready;
}