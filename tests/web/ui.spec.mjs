import { expect, test } from '@playwright/test';

test('navigates menu, starts, pauses, resumes, exits, and persists settings', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.uiState), {
    timeout: 40_000,
  }).toBe('main_menu');

  await page.keyboard.press('Shift+Tab');
  await page.keyboard.type('BrowserAWP');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.uiState)).toBe('team_select');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.uiState)).toBe('character_select');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.uiState)).toBe('playing');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.nickname)).toBe('BrowserAWP');

  await page.locator('canvas').click({ position: { x: 640, y: 360 } });
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.uiState)).toBe('paused');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.uiState)).toBe('playing');
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.uiState)).toBe('paused');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.uiState)).toBe('main_menu');

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.uiState)).toBe('settings');
  await page.keyboard.press('End');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Home');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.locator('canvas').click({ position: { x: 640, y: 540 } });
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.uiState)).toBe('main_menu');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.mouseSensitivity)).toBe(3);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.volume)).toBe(0);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.quality)).toBe('high');

  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.nickname), {
    timeout: 15_000,
  }).toBe('BrowserAWP');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.mouseSensitivity)).toBe(3);
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.quality)).toBe('high');
});
