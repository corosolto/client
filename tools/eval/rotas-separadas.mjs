/* Limiar e enumerador de ROTAS SEPARADAS, compartilhados entre a CTF2 (map-check.mjs, todos
   os mapas) e a LV1/LV2 (lajes-vertical-check.mjs, só o lajes).

   Existe por causa da lição 2 de docs/LICOES.md: duas réguas que medem o mesmo conceito com
   limiar próprio viram o instrumento discordando de si. A CTF2 conta QUANTAS rotas separadas
   existem; a LV1/LV2 pergunta COMO ELAS CORREM (térreo × laje). Se cada uma apagasse a faixa
   da rota com um raio diferente, elas contariam conjuntos de rotas diferentes e a segunda
   poderia jurar "tem rota térrea" sobre uma rota que a primeira nem enxerga. */

export const SEP_ROTA = 6.0;    // m de afastamento pra duas rotas contarem como rotas diferentes
/* Um passo do grafo de navegação (3,4 m) além da faixa: as últimas dezenas de metros até a
   bandeira e os primeiros saindo do respawn são obrigatoriamente COMPARTILHADOS. Ver o
   comentário longo da CTF2 em map-check.mjs. */
export const RAIO_PONTA = SEP_ROTA + 3.4;
export const MAX_ROTAS = 4;

/* Dijkstra com nós PROIBIDOS (o findPath do mapa não aceita bloqueio). */
export function caminhoBloqueado(nodes, adj, from, to, bloq) {
  const n = nodes.length;
  if (bloq[from] || bloq[to]) return null;
  const dist = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1);
  const vis = new Uint8Array(n);
  dist[from] = 0;
  for (;;) {
    let cur = -1, best = Infinity;
    for (let i = 0; i < n; i++) if (!vis[i] && dist[i] < best) { best = dist[i]; cur = i; }
    if (cur === -1 || cur === to) break;
    vis[cur] = 1;
    for (const m of adj[cur]) {
      if (bloq[m]) continue;
      const d = dist[cur] + Math.hypot(nodes[cur].x - nodes[m].x, nodes[cur].z - nodes[m].z);
      if (d < dist[m]) { dist[m] = d; prev[m] = cur; }
    }
  }
  if (!Number.isFinite(dist[to])) return null;
  const path = [to];
  for (let c = prev[to]; c !== -1; c = prev[c]) path.unshift(c);
  return path;
}

/* Enumera até MAX_ROTAS rotas separadas entre dois nós, apagando a faixa de cada rota achada
   (poupando as vizinhanças das duas pontas). Devolve os caminhos como listas de índices. */
export function rotasSeparadas(nodes, adj, from, to) {
  const bloq = new Uint8Array(nodes.length);
  const achadas = [];
  for (let k = 0; k < MAX_ROTAS; k++) {
    const cam = caminhoBloqueado(nodes, adj, from, to, bloq);
    if (!cam) break;
    achadas.push(cam);
    const pA = nodes[from], pB = nodes[to];
    for (let i = 0; i < nodes.length; i++) {
      if (i === from || i === to || bloq[i]) continue;
      if (Math.hypot(nodes[i].x - pA.x, nodes[i].z - pA.z) <= RAIO_PONTA) continue;
      if (Math.hypot(nodes[i].x - pB.x, nodes[i].z - pB.z) <= RAIO_PONTA) continue;
      for (const c of cam) {
        if (Math.hypot(nodes[i].x - nodes[c].x, nodes[i].z - nodes[c].z) <= SEP_ROTA) { bloq[i] = 1; break; }
      }
    }
  }
  return achadas;
}
