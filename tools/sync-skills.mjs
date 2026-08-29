/* ============================================================================
   sync-skills.mjs — skills do PROJETO visíveis para TODOS os agentes.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   Este repo é trabalhado por mais de um agente (Claude, Kimi, OpenCode…). A
   convenção da casa, descrita no bloco gerado de docs/docs/stack.md:

     .agents/skills/   skills de TERCEIRO, fixadas por hash no skills-lock.json;
                       gitignored na maior parte. Os arnêses não-Claude leem daqui.
     .claude/skills/   symlinks para .agents/skills/ (terceiras) + DIRETÓRIOS
                       REAIS para as que nasceram aqui (bug-hunt, gauntlet-fps,
                       regua, csbrasil, asset-review).

   O buraco: as skills nativas ficavam invisíveis para os outros agentes, porque
   .agents/skills/ é gitignored e ninguém criava o link. Este script fecha o
   buraco: toda skill NATIVA (diretório real em .claude/skills/, não symlink) ganha
   um symlink em .agents/skills/. Symlink, não cópia, porque cópia desatualiza em
   silêncio — o mesmo modo de falha do "corrigir número à mão dura um commit".

   NUNCA toca em diretório real de .agents/skills/ — é skill de terceiro, dono
   dela é o skills-lock.json.

   Uso:
     node tools/sync-skills.mjs           → cria os links que faltam
     node tools/sync-skills.mjs --check   → sai 1 se algo está fora de sync
                                            (roda no check:fast)
   ============================================================================ */
import {
  readdirSync, lstatSync, readlinkSync, symlinkSync,
  existsSync, mkdirSync, realpathSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const NATIVAS = '.claude/skills';
const DESTINO = '.agents/skills';
const check = process.argv.includes('--check');

/* Nativa = diretório REAL em .claude/skills. Symlink aponta pra terceira. */
const nativas = readdirSync(NATIVAS).filter((d) => {
  const p = join(NATIVAS, d);
  try {
    return lstatSync(p).isDirectory() && !lstatSync(p).isSymbolicLink()
      && existsSync(join(p, 'SKILL.md'));
  } catch { return false; }
});

if (!nativas.length) {
  console.log('nenhuma skill nativa encontrada.');
  process.exit(0);
}

const problemas = [];
mkdirSync(DESTINO, { recursive: true });

for (const s of nativas) {
  const alvoRel = join('..', '..', '.claude', 'skills', s); // relativo AO LINK: .agents/skills/<s> → sobe dois
  const link = join(DESTINO, s);

  let st = null;
  try { st = lstatSync(link); } catch { /* não existe */ }

  if (st) {
    if (st.isSymbolicLink()) {
      const ok = existsSync(link) && realpathSync(link) === resolve(NATIVAS, s);
      if (!ok) {
        problemas.push(`${link}: symlink quebrado ou apontando para ${readlinkSync(link)}`);
      }
    } else {
      /* Diretório real: skill de TERCEIRO com o mesmo nome. Não é nossa. */
      if (!check) console.log(`  ~ ${link} existe como diretório real (terceira?), mantido.`);
    }
    continue;
  }

  if (check) {
    problemas.push(`${link}: faltando (rode npm run skills:sync)`);
    continue;
  }
  symlinkSync(alvoRel, link, 'dir');
  console.log(`  + ${link} → ${alvoRel}`);
}

if (problemas.length) {
  console.error(problemas.map((p) => `  ✗ ${p}`).join('\n'));
  process.exit(1);
}
if (check) console.log(`skills:check — ${nativas.length} skill(s) nativas linkadas em ${DESTINO}.`);
