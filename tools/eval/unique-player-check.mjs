/* RÉGUA do funil diário real: cada etapa leva o UUID persistente do navegador,
   depois pseudonimizado pelo backend, e a sessão autenticada segue pelo proxy same-origin. */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MUT = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = ['manda-click-id', 'sem-anon-id', 'sem-consentimento', 'sem-jogador', 'cookie-omit', 'proxy-sem-sessao', 'proxy-sem-ua', 'sem-visita-site', 'sem-visita-layout', 'sem-visita-legal'];
if (MUT && !MUTANTES.includes(MUT)) throw new Error(`mutante desconhecido: ${MUT}`);
const ler = (path) => { try { return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'); } catch { return ''; } };
const troca = (fonte, de, para) => { const nova = fonte.replace(de, para); if (nova === fonte) throw new Error(`MUTANTE ${MUT} NAO APLICOU`); return nova; };
let fonte = ler('public/js/player-unique.js');
let contagem = ler('public/js/contagem.js');
let siteVisit = ler('public/js/site-visit.js');
let layout = ler('src/layouts/Layout.astro');
let legalLayout = ler('src/layouts/LegalPage.astro');
let proxy = ler('src/pages/api/[rota].ts');
let proxyLib = ler('src/lib/api-proxy.mjs');
if (MUT === 'manda-click-id') fonte = troca(fonte, 'campaign: attr.campaign,', 'campaign: attr.campaign, fbclid: new URLSearchParams(location.search).get(\'fbclid\'),');
if (MUT === 'sem-anon-id') fonte = troca(fonte, 'anonId: identidade(),', '');
if (MUT === 'sem-consentimento') fonte = troca(fonte, 'consent: estadoDoConsentimento(escolha()),', "consent: 'unknown',");
if (MUT === 'sem-jogador') fonte = troca(fonte, "match_start: 'player',", '');
if (MUT === 'cookie-omit') fonte = troca(fonte, "credentials: 'same-origin'", "credentials: 'omit'");
if (MUT === 'proxy-sem-sessao') proxy = troca(proxy, "'clans','unique'].includes(rota)", "'clans','unique-desligado'].includes(rota)");
if (MUT === 'proxy-sem-ua') proxy = troca(proxy, "userAgent: rota === 'unique'", 'userAgent: false');
if (MUT === 'sem-visita-site') siteVisit = troca(siteVisit, "jogadoresUnicos.evento('page_view', VERSION);", '');
if (MUT === 'sem-visita-layout') layout = troca(layout, '<script type="module" src={`/js/site-visit.js?v=${V}-${JS_REV}`} is:inline></script>', '');
if (MUT === 'sem-visita-legal') legalLayout = troca(legalLayout, '<script type="module" src={`/js/site-visit.js?v=${V}-${JS_REV}`} is:inline></script>', '');

let ok = 0, falhas = 0;
const cobra = (cond, msg) => { if (cond) ok++; else { falhas++; console.error(`  FALHA ${msg}`); } };
if (!fonte) { falhas++; console.error('  FALHA public/js/player-unique.js ausente'); }

if (fonte) {
  const enviados = [], ouvintes = {};
  const escolha = { analytics: true };
  const ANON = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const g = {
    location: { search: '?utm_source=Meta+Ads&utm_medium=paid_social&utm_campaign=Outubro+01&fbclid=NAO-ENVIAR', hostname: 'www.corosolto.com.br' },
    document: { referrer: 'https://l.instagram.com/caminho?segredo=1' },
    window: { addEventListener: (tipo, fn) => { (ouvintes[tipo] ||= []).push(fn); } },
    fetch: (url, options) => { enviados.push({ url, options }); return Promise.resolve({ ok: true }); },
  };
  globalThis.__mundoUnique = g;
  let executavel = fonte
    .replace("import { privacyChoice } from './privacy-preferences.js';", 'const privacyChoice=()=>globalThis.__escolhaUnique;')
    .replace("import { getAnonId } from './client-id.js';", 'const getAnonId=()=>globalThis.__anonUnique;');
  const nomes = Object.keys(g);
  executavel = `const {${nomes.join(',')}}=globalThis.__mundoUnique;\n${executavel}`;
  globalThis.__escolhaUnique = escolha;
  globalThis.__anonUnique = ANON;
  let mod = null;
  try { mod = await import(`data:text/javascript;base64,${Buffer.from(executavel).toString('base64')}#${Date.now()}-${MUT}`); }
  catch (error) { falhas++; console.error(`  FALHA módulo não executou: ${error.message}`); }
  if (mod) {
    const attr = mod.atribuirVisita({ search: g.location.search, referrer: g.document.referrer });
    cobra(JSON.stringify(attr) === JSON.stringify({ source: 'meta-ads', medium: 'paid-social', campaign: 'outubro-01' }), `C1 · UTM normalizada sem click id: ${JSON.stringify(attr)}`);
    const meta = mod.atribuirVisita({ search: '?fbclid=segredo', referrer: '' });
    cobra(JSON.stringify(meta) === JSON.stringify({ source: 'meta', medium: 'paid-social', campaign: '' }), `C2 · fbclid vira categoria Meta sem guardar o valor: ${JSON.stringify(meta)}`);
    const direto = mod.atribuirVisita({ search: '', referrer: '' });
    cobra(direto.source === 'direct' && direto.medium === 'direct', 'C3 · acesso direto fica explícito');

    const coletor = mod.criarJogadoresUnicos({ enviar: (body) => enviados.push({ url: '/fake', options: { body } }), escolha: () => escolha, aquisicao: () => attr, identidade: () => ANON });
    coletor.evento('page_view', '2.1.0-alpha.126');
    coletor.evento('game_loaded', '2.1.0-alpha.126');
    coletor.evento('match_start', '2.1.0-alpha.126');
    coletor.evento('match_end', '2.1.0-alpha.126');
    const corpos = enviados.filter((item) => item.url === '/fake').map((item) => JSON.parse(item.options.body));
    cobra(corpos.map((body) => body.stage).join(',') === 'visit,player,finisher', `C4 · etapas únicas erradas: ${corpos.map((body) => body.stage)}`);
    cobra(corpos.every((body) => body.consent === 'granted'), 'C5 · consentimento explícito não acompanhou cada etapa');
    const permitidos = ['stage', 'consent', 'source', 'medium', 'campaign', 'version', 'anonId'];
    cobra(corpos.every((body) => Object.keys(body).every((key) => permitidos.includes(key))), `C6 · corpo leva campo proibido: ${JSON.stringify(corpos)}`);
    cobra(corpos.every((body) => body.anonId === ANON), `C7 · etapas não usam o mesmo UUID persistente do navegador: ${JSON.stringify(corpos)}`);
    cobra(!JSON.stringify(corpos).includes('NAO-ENVIAR') && !JSON.stringify(corpos).includes('segredo'), 'C8 · click id ou URL completa vazou no corpo');
    globalThis.__escolhaUnique = { analytics: false };
    mod.jogadoresUnicos.evento('page_view', '2.1.0-alpha.126');
    const real = enviados.find((item) => item.url === '/api/unique');
    cobra(real?.options.credentials === 'same-origin' && real?.options.keepalive === true && real?.options.headers?.['content-type'] === 'text/plain', `C9 · transporte unique não é same-origin/keepalive/text/plain: ${JSON.stringify(real)}`);
    cobra(JSON.parse(real?.options.body || '{}').consent === 'denied', 'C10 · recusa explícita não foi categorizada');
  }

  const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  for (const proibido of ['localStorage', 'sessionStorage', 'document.cookie', 'randomUUID', 'sessionId', 'fbclid:']) cobra(!codigo.includes(proibido), `C11 · player-unique usa campo proibido ${proibido}`);
}

if (!siteVisit) {
  falhas++;
  console.error('  FALHA public/js/site-visit.js ausente');
} else {
  const chamadas = [];
  globalThis.__jogadoresSite = { evento: (...args) => chamadas.push(args) };
  const executavel = siteVisit
    .replace("import { VERSION } from './version.js';", "const VERSION = '2.1.0-alpha.129';")
    .replace("import { jogadoresUnicos } from './player-unique.js';", 'const jogadoresUnicos = globalThis.__jogadoresSite;');
  try { await import(`data:text/javascript;base64,${Buffer.from(executavel).toString('base64')}#site-${Date.now()}-${MUT}`); }
  catch (error) { falhas++; console.error(`  FALHA visita do site não executou: ${error.message}`); }
  cobra(JSON.stringify(chamadas) === JSON.stringify([['page_view', '2.1.0-alpha.129']]), `C12 · página pública não registra uma visita: ${JSON.stringify(chamadas)}`);
}

cobra(/<script type="module" src=\{`\/js\/site-visit\.js\?v=\$\{V\}-\$\{JS_REV\}`\} is:inline><\/script>/.test(layout), 'C13 · layout das páginas públicas não carrega a visita versionada');
cobra(/<script type="module" src=\{`\/js\/site-visit\.js\?v=\$\{V\}-\$\{JS_REV\}`\} is:inline><\/script>/.test(legalLayout), 'C14 · layout das páginas legais não carrega a visita versionada');
cobra(/import \{ jogadoresUnicos \} from '\.\/player-unique\.js';/.test(contagem), 'C15 · contagem não liga eventos reais ao coletor de únicos');
cobra(/jogadoresUnicos\.evento\(event, versao\)/.test(contagem), 'C16 · cada evento aceito não avisa o coletor de únicos');
cobra(/session:\s*\[[^\]]*'unique'[^\]]*\]\.includes\(rota\)/.test(proxy.replace(/\n/g, ' ')), 'C17 · proxy não encaminha a sessão HttpOnly para unique');
cobra(/userAgent: rota === 'unique'/.test(proxy) && /if \(userAgent\).*'user-agent'/.test(proxyLib.replace(/\n/g, ' ')), 'C18 · proxy não encaminha user-agent somente para unique');

if (MUT) {
  const mordeu = falhas > 0;
  console.log(mordeu ? `mutante "${MUT}" DETECTADO` : `mutante "${MUT}" NÃO detectado`);
  process.exit(mordeu ? 0 : 1);
}
if (falhas) { console.error(`REPROVADO: ${ok} ok, ${falhas} falha(s)`); process.exit(1); }
let vivos = 0;
for (const nome of MUTANTES) {
  const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutante=${nome}`], { encoding: 'utf8' });
  const mordeu = result.status === 0;
  if (!mordeu) vivos++;
  console.log(`  ${mordeu ? 'morto' : 'VIVO '} ${nome}`);
}
if (vivos) { console.error(`REPROVADO: ${vivos} mutante(s) vivo(s)`); process.exit(1); }
console.log(`unique-player client: ${ok} verificações verdes, ${MUTANTES.length}/${MUTANTES.length} mutantes mortos`);
