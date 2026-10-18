import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://127.0.0.1:4328';
const mutant = process.argv.includes('--mutante=sem-sticky');
const image = process.env.OUT_IMAGE;
const width = Number(process.env.VIEWPORT_WIDTH || 915);
const height = Number(process.env.VIEWPORT_HEIGHT || 412);
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width, height },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const response = await page.goto(`${base}/jogar/confirmar?map=piscina_treta&personagem=esquerdomacho`, {
    waitUntil: 'domcontentloaded', timeout: 45_000,
  });
  if (!response?.ok()) throw new Error(`Pagina: HTTP ${response?.status() ?? 'sem resposta'}`);
  await page.locator('#hub-quick:not([hidden]) #hub-quick-confirm').waitFor();
  if (mutant) await page.addStyleTag({ content: '#hub-quick-confirm{position:static!important;bottom:auto!important}' });
  if (image) {
    await page.locator('#aviso-software button').click({ timeout: 1_500 }).catch(() => {});
  }
  const result = await page.evaluate(() => {
    const card = document.querySelector('#hub-quick .hub-modal-card');
    const button = document.querySelector('#hub-quick-confirm');
    const box = button.getBoundingClientRect();
    return {
      viewportHeight: innerHeight,
      buttonTop: Math.round(box.top),
      buttonBottom: Math.round(box.bottom),
      cardScrollHeight: card.scrollHeight,
      cardClientHeight: card.clientHeight,
      buttonVisibleWithoutScroll: box.top >= 0 && box.bottom <= innerHeight - 8,
    };
  });
  if (image) await page.screenshot({ path: image });
  console.log(JSON.stringify({ mutant, ...result }));
  if (!result.buttonVisibleWithoutScroll) process.exitCode = 1;
} finally {
  await browser.close();
}
