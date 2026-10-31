const natural = (value, fallback = 0) => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Number(value) : fallback;
export function regrasDaInvasao(raw = {}, multiplayer = false) {
  const fim = ['infinito', 'abates', 'mortes', 'tempo'].includes(raw.fim) ? raw.fim : 'infinito';
  return {
    times: raw.coop === true ? 2 : multiplayer || raw.times === 3 ? 3 : 2,
    abates: multiplayer ? natural(raw.abates, 1000) || 1000 : fim === 'abates' ? natural(raw.abates, 1000) || 1000 : 0,
    mortes: !multiplayer && fim === 'mortes' ? natural(raw.mortes, 20) || 20 : 0,
    segundos: multiplayer ? (natural(raw.minutos, 30) || 30) * 60 : fim === 'tempo' ? (natural(raw.minutos, 30) || 30) * 60 : 0,
    wipe: raw.wipe === 'partida' ? 'partida' : 'time',
    criterio: raw.criterio === 'abates' ? 'abates' : 'territorio',
  };
}
export function vencedorPorLimite(state, regras) {
  const times = regras.times === 3 ? ['E', 'B', 'J'] : ['E', 'J'];
  const valor = team => regras.criterio === 'abates' ? state.teamKills?.[team] || 0 : state.territorio?.[team] || 0;
  const vivos = times.filter(team => !state.eliminados?.includes(team));
  vivos.sort((a,b) => valor(b)-valor(a) || (state.teamKills?.[b] || 0)-(state.teamKills?.[a] || 0));
  if (vivos.length > 1 && valor(vivos[0]) === valor(vivos[1]) && (state.teamKills?.[vivos[0]] || 0) === (state.teamKills?.[vivos[1]] || 0)) return 'draw';
  return vivos[0] || 'J';
}
export function avaliarFimDaInvasao(state, regras, combatants, timeJogador = 'E') {
  if (state.winner) return state.winner;
  const humanos = combatants.filter(c => !c._objectiveNpc && (c.team === 'E' || c.team === 'B'));
  const times = [...new Set(humanos.map(c=>c.team))];
  state.eliminados ||= [];
  for (const team of times) {
    if (state.eliminados.includes(team) || humanos.some(c=>c.team === team && c.alive)) continue;
    state.eliminados.push(team);
    if (regras.wipe === 'partida') return 'J';
  }
  if (times.length && times.every(team=>state.eliminados.includes(team))) return 'J';
  const mortes = humanos.filter(c=>c.team === timeJogador || state.mutante === 'mortes-todos').reduce((sum,c)=>sum+(c.deaths || 0),0);
  if ((regras.abates && state.kills >= regras.abates) || (regras.segundos && state.clock >= regras.segundos) || (regras.mortes && mortes >= regras.mortes)) return vencedorPorLimite(state,regras);
  return null;
}
export function repartirTerritorio(state, setores, countsE, countsB, bichos, dt, dominio) {
  state.defesaE ||= state.controle.map(()=>0); state.defesaB ||= state.controle.map(()=>0);
  let e=0,b=0,pesos=0;
  for(let i=0;i<state.controle.length;i++) {
    const ce=countsE[i] || 0, cb=countsB[i] || 0, j=bichos[i] || 0;
    if(!j && (!!ce !== !!cb)) {
      const own=ce?state.defesaE:state.defesaB, other=ce?state.defesaB:state.defesaE;
      own[i]=Math.min(1-state.controle[i],own[i]+dominio.desce*dt);
      other[i]=Math.max(0,Math.min(1-state.controle[i]-own[i],other[i]-dominio.desce*dt));
    } else if(j>=dominio.minBichos && !ce && !cb) {
      state.defesaE[i]=Math.max(0,state.defesaE[i]-dominio.sobe*dt);
      state.defesaB[i]=Math.max(0,state.defesaB[i]-dominio.sobe*dt);
    }
    const saldo = Math.max(0, 1 - state.controle[i]), humanos = state.defesaE[i] + state.defesaB[i];
    if (humanos > saldo) { state.defesaE[i] *= saldo / humanos; state.defesaB[i] *= saldo / humanos; }
    const peso=setores[i]?.peso || 1; pesos+=peso;e+=state.defesaE[i]*peso;b+=state.defesaB[i]*peso;
  }
  state.territorio={E:pesos?e/pesos:0,B:pesos?b/pesos:0,J:state.dominio};
}
