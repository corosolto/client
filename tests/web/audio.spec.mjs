import { expect, test } from '@playwright/test';

async function startAndUseRadio(page) {
  await page.goto('/?auto=P,esquerdomacho');
  await expect.poll(
    () => page.evaluate(() => window.__csbrasilPlayerState?.uiState),
    { timeout: 20_000 }
  ).toBe('playing');
  await page.keyboard.press('KeyZ');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.radioOpen)).toBe('z');
  await page.keyboard.press('Digit1');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.lastRadio)).toBe('Bora, bora, bora!');
}

test('plays optional samples for round and radio after user interaction', async ({ page }) => {
  await startAndUseRadio(page);
  await expect.poll(() => page.evaluate(() =>
    window.__csbrasilAudioEvents?.some(event => event.kind === 'radio' && event.source === 'sample')
  )).toBe(true);
});

test('falls back procedurally when the optional audio package is unavailable', async ({ page }) => {
  await page.route('**/audio/**', route => route.abort());
  await startAndUseRadio(page);
  await expect.poll(() => page.evaluate(() =>
    window.__csbrasilAudioEvents?.some(event => event.kind === 'radio' && event.source === 'fallback')
  )).toBe(true);
});

test('keeps radio usable and silent when persisted volume is zero', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('csbrasil_godot_settings', JSON.stringify({
    nickname: 'Silêncio', mouse_sensitivity: 1, volume: 0, quality: 'med'
  })));
  await startAndUseRadio(page);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.audioSource)).toBe('muted');
  await expect.poll(() => page.evaluate(() =>
    window.__csbrasilAudioEvents?.some(event => event.kind === 'radio' && event.source === 'muted')
  )).toBe(true);
});
