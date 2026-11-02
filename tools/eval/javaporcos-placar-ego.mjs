// Executar no TaskSpace da rodada: ego-browser nodejs < tools/eval/javaporcos-placar-ego.mjs
const assert = (await import('node:assert/strict')).default;
const task = await taskSpace('Codex root · Javaporcos feedback rodada2');
const page = task.page('p1');
const result = await page.evaluate(() => {
  const g = window.__game, objective = g.objective, h = objective.state;
  const before = { kills: h.kills, clock: h.clock, scores: h.scores, phase: h.phase, wave: h.wave, prepLeft: h.prepLeft };
  try {
    h.kills = 3; h.clock = 62; h.phase = 'combat'; h.wave = 2;
    h.scores = { [objective.idDo(g.player)]: { points: 500, kills: 3, assists: 1, bestCombo: 2, damagePrevented: 130 } };
    g._updateHud(); objective.atualizaHud(true); g._showScoreboard(true);
    const normal = {
      count: g.el.scorePNum.textContent, clock: g.el.roundTime.textContent,
      header: document.querySelector('#scoreboard h3').textContent,
      points: g.el.sbCols.textContent.includes('500'), generic: g.el.sbCols.querySelectorAll('.sb-col').length,
      enemy: getComputedStyle(g.el.scoreB).display,
    };
    h.phase = 'prep'; h.wave = 3; h.prepLeft = 12; g._updateHud();
    normal.clockAfterWave = g.el.roundTime.textContent;
    g.objective = null; g._showScoreboard(true);
    const mutant = { generic: g.el.sbCols.querySelectorAll('.sb-col').length, points: g.el.sbCols.textContent.includes('500') };
    return { normal, mutant };
  } finally {
    g.objective = objective; Object.assign(h, before);
    g._showScoreboard(false); g._updateHud(); objective.atualizaHud(true);
  }
});
assert.equal(result.normal.count, '3');
assert.equal(result.normal.clock, '1:02');
assert.equal(result.normal.clockAfterWave, '1:02');
assert.equal(result.normal.points, true);
assert.equal(result.normal.generic, 0);
assert.equal(result.normal.enemy, 'none');
assert.equal(result.mutant.generic, 2);
assert.equal(result.mutant.points, false);
console.log('PLACAR: abates/pontos reais, time único, relógio contínuo e mutante genérico conferidos.', result);
