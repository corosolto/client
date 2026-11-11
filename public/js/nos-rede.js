/* NÓS, LOBBY E PARIDADE DE REDE. O NetClient fica em net.js; aqui ficam a descoberta
   de servidores, as salas e a compatibilidade de simulação. Ver docs/MULTIPLAYER.md. */

/* NÓS OFICIAIS. Cada um é um processo do servidor numa região. Acrescentar região é
   acrescentar uma linha em nos.js e subir a VM com o mesmo script de deploy. */
import { NOS } from './nos.js';
import * as versao from './version.js';
const { VERSION } = versao;
// ausente em árvore anterior ao fingerprint: degrada para comparar VERSION
const SIM_HASH = versao.SIM_HASH || null;

/* PARIDADE DE SIMULAÇÃO (incidente da frota, KNOWN-BUGS): protocolo igual não é jogo
   igual. O nó diz no `welcome` que versão simula; `?mpversao=0` libera no local.

   Quando os DOIS lados trazem `SIM_HASH` (scripts/sim-hash.mjs), compara-se o código que o
   nó simula, não o rótulo: release de menu ou chat muda VERSION e não muda a física, e não
   pode deixar todo mundo fora do multiplayer até o nó ser reimplantado. Sem hash de um dos
   lados, vale a regra antiga de versão idêntica. */
export const versaoCompativel = (doNo, nossa = VERSION, simNo = null, nossoSim = SIM_HASH) => {
  if (simNo && nossoSim) return simNo === nossoSim;
  return !doNo || doNo === nossa;
};

// URLs de lobby e jogo a partir do menu/URL: '1' = local, 'host:porta', ou 'wss://...'
export function mpUrls(v) {
  const host = (typeof location !== 'undefined' && location.hostname) || 'localhost';
  if (/^wss?:\/\//.test(v)) {
    const wsBase = v.replace(/\/ws.*$/, '');
    return { http: wsBase.replace(/^ws/, 'http'), ws: wsBase + '/ws' };
  }
  const hp = v === '1' ? `${host}:8787` : v;
  return { http: `http://${hp}`, ws: `ws://${hp}/ws` };
}

const j = async (url, opt) => {
  const r = await fetch(url, { cache: 'no-store', ...opt });
  if (!r.ok) throw new Error(`http_${r.status}`);
  return r.json();
};
export const listRooms = (httpBase) => j(`${httpBase}/rooms`).then((x) => x.rooms || []);
// Uma sala pelo código do convite. 404 vira null: sala que acabou não é erro, é sala que acabou.
export const salaPorConvite = (httpBase, codigo) =>
  j(`${httpBase}/sala/${encodeURIComponent(codigo)}`).then((x) => x.sala).catch(() => null);
export const listMaps = (httpBase) => j(`${httpBase}/maps`).then((x) => x.maps || []);
export const health = (httpBase) => j(`${httpBase}/health`);
export const createRoom = (httpBase, cfg, ticket = '') => j(`${httpBase}/rooms`, {
  method: 'POST', headers: { 'content-type': 'application/json', ...(ticket ? { authorization: `Bearer ${ticket}` } : {}) }, body: JSON.stringify(cfg),
});

/* Sonda TODOS os nós em paralelo e devolve cada um com ping e lotação. É a coluna de ping do
   server browser — sem ela o jogador não tem como saber que o nó da Europa é o dele. Nó que
   não responde volta com ping null e NÃO some da lista: sumir esconde a queda do servidor. */
// Prazo que só anda quando o navegador dá a vez: thread travada não pode consumi-lo.
// `setTimeout` mede relógio de parede e derrubava a sonda inteira no boot — BUG-169.
const PASSO_MS = 100;
export function prazoAcordado(ms, aoEstourar) {
  let resta = ms, antes = performance.now();
  const id = setInterval(() => {
    const agora = performance.now(), dt = agora - antes;
    antes = agora;
    // tique muito mais longo que o passo é tempo CONGELADO: cobra-se o passo, não o relógio
    resta -= Math.min(dt, PASSO_MS * 2);
    if (resta <= 0) { clearInterval(id); aoEstourar(); }
  }, PASSO_MS);
  return () => clearInterval(id);
}

// Ping de REDE via PerformanceObserver: o relógio do JS soma a thread ocupada no boot e o
// buffer da Resource Timing já está cheio (250) quando o menu sonda (Madri 20 ms → 212 ms, 13/10).
function observaRede(url) {
  let duracao = null, obs = null;
  try {
    obs = new PerformanceObserver((lista) => {
      for (const e of lista.getEntries()) if (e.name === url && e.duration > 0) duracao = e.duration;
    });
    obs.observe({ type: 'resource' });
  } catch { obs = null; }
  return async (t0) => {
    const fim = performance.now();
    for (let i = 0; obs && duracao == null && i < 2; i++) await new Promise((r) => setTimeout(r, 20));
    obs?.disconnect();
    return duracao ?? fim - t0;
  };
}

export async function sondarNos(nos = NOS, timeoutMs = 2500, amostras = 2) {
  return Promise.all(nos.map(async (no) => {
    const { http } = mpUrls(no.url);
    const ctrl = new AbortController();
    const cancelaPrazo = prazoAcordado(timeoutMs, () => ctrl.abort());
    // Amostra que chegou não se apaga: a 1ª paga DNS+TLS e, se estourava o prazo da 2ª, o nó
    // que RESPONDEU aparecia fora do ar — os três juntos, em rede lenta (BUG-166).
    let h = null, ping = 0;
    try {
      const n = Math.max(1, Math.min(3, amostras | 0));
      for (let i = 0; i < n; i++) {
        const fecha = observaRede(`${http}/health`);
        const t0 = performance.now();
        const r = await j(`${http}/health`, { signal: ctrl.signal });
        h = r; ping = await fecha(t0);   // a última que chegou é a mais quente
      }
    } catch { /* a amostra que faltou não apaga a que veio */ }
    finally { cancelaPrazo(); }
    if (!h) return { ...no, http, ping: null, online: false, jogadores: 0, salas: 0 };
    /* `salaConvite`: o nó guarda sala privada SEM senha só para quem tem o código (backend#62).
       Nó sem o campo listaria essa sala aberta, então o JOGAR COM AMIGOS não a cria nele. */
    return { ...no, http, ticketNode: h.regiao || no.id, ping: Math.round(ping), online: true, jogadores: h.players | 0, salas: h.rooms | 0, salaConvite: h.salaConvite === true, soloVerified: h.soloVerified === true, horde: h.horde || null, nodeMode: h.nodeMode, roomCreation: h.roomCreation };
  }));
}
