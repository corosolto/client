/* browser.mjs — abre o Chrome pras réguas de captura sem prender à máquina do dono.
   ═══════════════════════════════════════════════════════════════════════════════════
   POR QUE ESTE ARQUIVO EXISTE

   As réguas de captura nasceram com duas linhas copiadas de script em script:

     const gRoot = execSync('npm root -g').toString().trim();
     await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
     chromium.launch({ executablePath: process.env.CHROME_BIN
       || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });

   As duas são falsas. `playwright` está em devDependencies (^1.62.1) e é instalado em
   `node_modules/` por `npm ci` — procurar SÓ no root global é pedir ao contribuidor que
   instale de novo, global, a mesma versão que ele já tem local. E o caminho do Chrome é
   literal de macOS: em Linux e Windows a régua morre no launch, não no assert. Quem
   clonou o repo não vê "faltou instalar", vê a régua explodindo.

   Reportado pelo Greptile no PR #216 e verdadeiro: sem isto, o redesenho de UI só pode
   ser medido numa máquina do planeta.

   A ORDEM DE BUSCA, E POR QUE ELA É ESTA

   Playwright:  local (node_modules) -> global -> erro que diz o comando a rodar.
   Local primeiro porque é o que o package.json promete; global fica como rede pra quem
   já rodava as réguas antes desta mudança.

   Executável:  CHROME_BIN -> Chrome do sistema (channel) -> Chromium do Playwright.
   O Chrome do sistema vem ANTES do Chromium empacotado de propósito, e isto é o oposto
   do que parece mais limpo: as capturas de referência do bloco 1 foram tiradas no Chrome
   real do dono, e Chrome e Chromium não pintam igual (fontes, sombra, cor gerenciada).
   Trocar o motor no meio de um redesenho de UI faria toda tela "mudar" numa comparação
   antes/depois sem ninguém ter tocado no CSS. `channel: 'chrome'` acha o Chrome instalado
   em macOS, Linux e Windows sem caminho escrito na mão; o Chromium empacotado é o último
   recurso, pra máquina que não tem Chrome nenhum (CI).
   ═══════════════════════════════════════════════════════════════════════════════════ */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** Carrega o módulo `chromium` do Playwright: node_modules local, depois global. */
export async function carregaChromium() {
  const tentativas = [
    async () => await import('playwright'),
    async () => {
      const gRoot = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      return await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
    },
  ];
  let ultimo;
  for (const tenta of tentativas) {
    try {
      const mod = await tenta();
      const chromium = mod.chromium || mod.default?.chromium;
      if (chromium) return chromium;
    } catch (e) { ultimo = e; }
  }
  throw new Error(
    'playwright não encontrado (nem local, nem global).\n' +
    '  rode:  npm ci  (ou  npm i -D playwright)\n' +
    '  e:     npx playwright install chromium\n' +
    (ultimo ? `  causa: ${ultimo.message}` : ''),
  );
}

/** Sobe um browser com a ordem de executável descrita no cabeçalho.
 *  `opts` vai inteiro pro launch (args, headless, etc). */
export async function abreChrome(opts = {}) {
  const chromium = await carregaChromium();

  if (process.env.CHROME_BIN)
    return await chromium.launch({ ...opts, executablePath: process.env.CHROME_BIN });

  try {
    return await chromium.launch({ ...opts, channel: 'chrome' });
  } catch (e) {
    // sem Chrome instalado (CI, container): cai pro Chromium que o Playwright baixou.
    console.warn('[browser] Chrome do sistema indisponível, usando o Chromium do Playwright.');
    console.warn('[browser] as cores/fontes podem diferir das capturas de referência.');
    console.warn(`[browser] causa: ${e.message.split('\n')[0]}`);
    return await chromium.launch(opts);
  }
}
