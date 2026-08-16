/* ============================================================================
   setup.mjs — UM COMANDO PARA SAIR DO `git clone` COM O JOGO INTEIRO. (T26)
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   Quem clona hoje pega o jogo **sem som e sem grafite**, e não por bug: três
   diretórios ficam fora do git por decisão de procedência —

     public/audio/        pacote de áudio, licenciamento incerto
     public/img/decals/   acervo de decalques, curadoria (só os `or-*` são obra
                          própria e vêm no clone)
     references/          material de referência

   Está documentado no README. Mas o especialista que a gente quer atrair **não
   debuga setup**: ele abre o jogo, vê parede pelada e silêncio, e fecha a aba.
   Documentação não compete com um comando que funciona.

   ── POR QUE ELE NÃO É UMA CADEIA DE `&&` ────────────────────────────────────
   Pela mesma razão que o `check:fast` está sendo desmontado: numa cadeia, o passo
   que falha esconde todos os seguintes, e quem está chegando recebe UM erro em vez
   do estado real. Aqui cada passo roda, o resultado de todos é impresso junto, e
   **a mensagem final diz o que fazer** — não só o que quebrou.

   O fetch de áudio e o de decalques podem falhar por rede ou por release movida.
   Isso não impede `npm run dev`: o jogo sobe mudo e com parede pelada, que é
   exatamente o que precisa ser DITO, não escondido.

   Uso:  npm run setup
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';

const CYAN = '\x1b[36m', VERDE = '\x1b[32m', VERM = '\x1b[31m', AMAR = '\x1b[33m', OFF = '\x1b[0m';

/* Cada passo declara como se sabe que ele DEU CERTO — e a verificação não é o
   código de saída, é o estado do disco. `curl` que baixa um HTML de erro com
   status 200 sai zero e não instala nada; contar arquivo pega isso. */
const PASSOS = [
  {
    nome: 'dependências',
    cmd: ['npm', ['ci', '--no-audit', '--no-fund']],
    ok: () => existsSync('node_modules/astro'),
    falha: 'rode `npm install` e leia o erro — provavelmente Node < 22 ou rede.',
  },
  {
    nome: 'wasm (og:image e badge)',
    cmd: ['node', ['scripts/copy-wasm.mjs']],
    ok: () => existsSync('public/wasm/resvg.wasm'),
    falha: 'sem isto, /u/* e as og:image saem sem imagem. `node scripts/copy-wasm.mjs`.',
  },
  {
    nome: 'pacote de áudio',
    cmd: ['bash', ['scripts/fetch-audio.sh']],
    ok: () => existsSync('public/audio/manifest.json'),
    falha: 'o jogo sobe MUDO (cai no áudio sintetizado). `bash scripts/fetch-audio.sh`.',
  },
  {
    nome: 'acervo de decalques',
    cmd: ['bash', ['scripts/fetch-decals.sh']],
    ok: () => existsSync('public/img/decals')
      && readdirSync('public/img/decals').filter((f) => f.endsWith('.png') && !f.startsWith('or-')).length > 100,
    falha: 'os mapas sobem com a PAREDE PELADA. `bash scripts/fetch-decals.sh`.',
  },
];

console.log(`\n${CYAN}CORO SOLTO — setup${OFF}\n`);
const resultado = [];
for (const p of PASSOS) {
  process.stdout.write(`  ${p.nome} … `);
  const t = Date.now();
  const r = spawnSync(p.cmd[0], p.cmd[1], { stdio: 'pipe', encoding: 'utf8' });
  const bom = p.ok();
  const s = ((Date.now() - t) / 1000).toFixed(1);
  console.log(bom ? `${VERDE}ok${OFF} (${s}s)` : `${VERM}FALHOU${OFF} (${s}s)`);
  if (!bom) {
    const saida = ((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-2).join('\n');
    if (saida) console.log(`      ${saida.replace(/\n/g, '\n      ')}`);
  }
  resultado.push({ ...p, bom });
}

/* A asserção do T1 é a MESMA que roda no build da Vercel. Rodá-la aqui não é
   redundância: é o novato descobrindo AGORA, e não no primeiro deploy, que o
   pacote veio pela metade. */
console.log(`\n  ${CYAN}conferindo o que chegou${OFF}`);
const chk = spawnSync('node', ['tools/eval/assets-check.mjs'], { stdio: 'inherit' });

const ruins = resultado.filter((r) => !r.bom);
console.log('');
if (!ruins.length && chk.status === 0) {
  console.log(`${VERDE}Pronto.${OFF} \`npm run dev\` e abra http://localhost:4321\n`);
  console.log(`  ${AMAR}opcional${OFF}  \`npm run check\` roda o portão (~5 min, precisa de nada além disto)`);
  console.log(`  ${AMAR}opcional${OFF}  \`FEEDBACK_TO=voce@exemplo.com\` liga a notificação do formulário`);
  console.log(`             (o formsubmit.co exige ATIVAR o endereço: ele manda um link de`);
  console.log(`             confirmação no primeiro envio, e até você clicar nada chega)`);
  console.log('');
} else {
  console.log(`${AMAR}O jogo roda assim mesmo — mas com buraco:${OFF}`);
  for (const r of ruins) console.log(`  ${VERM}·${OFF} ${r.nome}: ${r.falha}`);
  if (chk.status !== 0) console.log(`  ${VERM}·${OFF} a conferência acima listou o que veio incompleto.`);
  console.log(`\n  \`npm run dev\` funciona; conserte o que estiver acima quando puder.\n`);
  process.exitCode = 1;
}
