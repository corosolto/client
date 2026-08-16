import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const DURATION_MS = Number(process.env.PERFORMANCE_DURATION_MS || 300_000);

test.use({ viewport: { width: 1920, height: 1080 } });
test.setTimeout(DURATION_MS + 90_000);

test('sustains the scripted five-minute match performance budget @performance', async ({ browser, browserName, page }) => {
  const consoleErrors = [];
  const failedRequests = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.addInitScript(() => {
    window.__csbrasilFrameProbe = { collecting: false, last: 0, intervals: [] };
    const sample = now => {
      const probe = window.__csbrasilFrameProbe;
      if (probe.collecting && probe.last > 0) probe.intervals.push(now - probe.last);
      probe.last = probe.collecting ? now : 0;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  const navigationStartedAt = Date.now();
  await page.goto('/?auto=P,esquerdomacho');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.uiState), {
    timeout: 40_000,
  }).toBe('playing');
  await expect.poll(() => page.evaluate(() => window.__csbrasilPlayerState?.fps), {
    timeout: 20_000,
  }).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__csbrasilPlayerState.quality)).toBe('med');
  const bootMs = Date.now() - navigationStartedAt;

  await page.locator('#canvas').click({ position: { x: 960, y: 540 } });
  await page.waitForTimeout(5_000);
  await page.evaluate(() => {
    window.__csbrasilFrameProbe.intervals = [];
    window.__csbrasilFrameProbe.collecting = true;
  });

  const godotFpsSamples = [];
  const startedAt = Date.now();
  let iteration = 0;
  const directions = ['KeyW', 'KeyD', 'KeyS', 'KeyA'];
  while (Date.now() - startedAt < DURATION_MS) {
    const direction = directions[iteration % directions.length];
    await page.keyboard.down(direction);
    if (iteration % 3 === 0) await page.keyboard.down('ShiftLeft');
    await page.mouse.move(900 + (iteration % 5) * 30, 500 + (iteration % 3) * 25);
    await page.waitForTimeout(300);
    await page.keyboard.up(direction);
    await page.keyboard.up('ShiftLeft');
    if (iteration % 6 === 0) await page.keyboard.press('Space');
    godotFpsSamples.push(await page.evaluate(() => window.__csbrasilPlayerState?.fps || 0));
    iteration += 1;
    await page.waitForTimeout(Math.min(4_700, Math.max(0, DURATION_MS - (Date.now() - startedAt))));
  }

  const raw = await page.evaluate(() => {
    window.__csbrasilFrameProbe.collecting = false;
    return {
      intervals: window.__csbrasilFrameProbe.intervals,
      heapBytes: performance.memory?.usedJSHeapSize ?? null,
      state: window.__csbrasilPlayerState,
    };
  });
  const sortedIntervals = raw.intervals.filter(value => value > 0 && value < 1_000).sort((a, b) => a - b);
  const p95FrameTimeMs = sortedIntervals[Math.floor(sortedIntervals.length * 0.95)] ?? Infinity;
  const meanGodotFps = godotFpsSamples.reduce((sum, value) => sum + value, 0) / godotFpsSamples.length;
  const rafFps = sortedIntervals.length * 1_000 / sortedIntervals.reduce((sum, value) => sum + value, 0);
  const metrics = {
    browser: browserName,
    browserVersion: browser.version(),
    viewport: '1920x1080',
    quality: raw.state.quality,
    durationMs: Date.now() - startedAt,
    bootMs,
    meanGodotFps,
    rafFps,
    p95FrameTimeMs,
    frameCount: sortedIntervals.length,
    heapMiB: raw.heapBytes === null ? null : raw.heapBytes / 1024 / 1024,
    finalUiState: raw.state.uiState,
    consoleErrors,
    failedRequests,
  };
  await mkdir('test-results', { recursive: true });
  await writeFile(`test-results/performance-${browserName}.json`, `${JSON.stringify(metrics, null, 2)}\n`);
  console.log(`PERFORMANCE ${browserName}: ${JSON.stringify(metrics)}`);

  expect(sortedIntervals.length).toBeGreaterThan(DURATION_MS / 40);
  expect(meanGodotFps).toBeGreaterThanOrEqual(60);
  expect(p95FrameTimeMs).toBeLessThanOrEqual(33.3);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
