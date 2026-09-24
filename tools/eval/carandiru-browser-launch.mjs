export async function launchCarandiruMatch(page, { base, mode }) {
  await page.goto(`${base}/?debug=1&map=penitenciaria&perfilauto=0`, {
    waitUntil: 'domcontentloaded', timeout: 120000,
  });
  await page.waitForSelector('#btn-jogar', { state: 'attached', timeout: 120000 });
  await page.waitForTimeout(1200);
  await page.evaluate((requestedMode) => {
    document.querySelector(`[data-act="${requestedMode === 'ctf' ? 'ctf' : 'sp'}"]`)?.click();
    const nick = document.getElementById('nick-input');
    if (nick && !nick.value) {
      nick.value = 'QA Carandiru';
      nick.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.getElementById('btn-jogar')?.click();
  }, mode);
  await page.waitForFunction(() => !document.getElementById('team-select')?.classList.contains('hidden'), null, { timeout: 120000 });
  await page.evaluate(() => document.getElementById('btn-team-e')?.click());
  await page.waitForFunction(() => !document.getElementById('char-select')?.classList.contains('hidden'), null, { timeout: 180000 });
  await page.evaluate(() => document.getElementById('char-confirm')?.click());
  await page.waitForFunction(() => document.getElementById('team-select')?.dataset.step === 'enemy'
    && !document.getElementById('team-select')?.classList.contains('hidden'), null, { timeout: 120000 });
  await page.evaluate(() => document.getElementById('btn-team-b')?.click());
  await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
}
