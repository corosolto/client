export function sincronizarOpcoesJavaporcos(host, ativo, settings, salvar) {
  if (!host) return;
  let panel = host.querySelector('[data-javaporcos-opcoes]');
  if (!panel) {
    panel = document.createElement('div');
    panel.dataset.javaporcosOpcoes = '';
    panel.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;flex-basis:100%';
    panel.innerHTML = `<label><span>DEFENSORES (VOCÊ + BOTS)</span><select data-regra="defensores">${[4,5,6,7,8].map(n=>`<option value="${n}">${n} DEFENSORES</option>`).join('')}</select></label>
<label><span>LADOS EM DISPUTA</span><select data-regra="times"><option value="2">SEU TIME × JAVAPORCOS</option><option value="3">E × B × JAVAPORCOS</option></select></label>
<label><span>FIM DA PARTIDA SOLO</span><select data-regra="fim"><option value="infinito">INFINITO</option><option value="abates">LIMITE DE ABATES</option><option value="mortes">LIMITE DE MORTES</option><option value="tempo">LIMITE DE TEMPO</option></select></label>
<label data-limite="abates"><span>ABATES DE JAVAPORCOS</span><input data-regra="abates" type="number" min="1" max="100000" value="1000"></label>
<label data-limite="mortes"><span>MORTES DO SEU TIME</span><input data-regra="mortes" type="number" min="1" max="10000" value="20"></label>
<label data-limite="tempo"><span>MINUTOS</span><input data-regra="minutos" type="number" min="1" max="1440" value="30"></label>
<label><span>TIME INTEIRO ELIMINADO</span><select data-regra="wipe"><option value="time">ELIMINA ESSE TIME</option><option value="partida">VITÓRIA DOS JAVAPORCOS</option></select></label>
<label><span>VENCEDOR AO ATINGIR LIMITE</span><select data-regra="criterio"><option value="territorio">MAIOR ÁREA CONTROLADA</option><option value="abates">MAIS ABATES</option></select></label>`;
    panel.addEventListener('change', event => {
      const key = event.target.dataset.regra;
      if (!key) return;
      const value = event.target.type === 'number' || key === 'times' || key === 'defensores' ? Number(event.target.value) : event.target.value;
      if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 1)) return;
      settings.javaporcos = {...settings.javaporcos, [key]: value};
      salvar(); sincronizarOpcoesJavaporcos(host, !panel.hidden, settings, salvar);
    });
    host.append(panel);
  }
  panel.hidden = !ativo;
  panel.style.display = ativo ? 'flex' : 'none';
  const regras = {times:2,defensores:Math.max(4,Math.min(8,1+(settings.allyBots||0))),fim:'infinito',abates:1000,mortes:20,minutos:30,wipe:'time',criterio:'territorio',...settings.javaporcos};
  const inimigos = host.querySelector('#ms-enemy-bots')?.parentElement;
  if (inimigos) inimigos.hidden = ativo && regras.times !== 3;
  for (const control of panel.querySelectorAll('[data-regra]')) control.value = String(regras[control.dataset.regra]);
  for (const label of panel.querySelectorAll('[data-limite]')) label.hidden = label.dataset.limite !== regras.fim;
}
