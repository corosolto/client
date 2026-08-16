import { expect, test } from '@playwright/test';

test('boots the parallel Godot client without runtime errors', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto('/');

  await expect(page.locator('#canvas')).toBeVisible();
  await page.waitForFunction(() => window.__csbrasilGodotReady === true, null, {
    timeout: 20_000,
  });
  await expect(page.locator('#status')).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});

test('keeps the legacy Three.js client executable during migration', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));

  await page.goto('http://127.0.0.1:8176/?debug=1');

  await expect(page.locator('#game-container canvas')).toBeVisible();
  await expect(page.locator('#main-menu')).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
