/* VERIFICADOR DE SKILLS — recalcula o SHA-256 de cada skill instalada e compara
   com o skills-lock.json. Fecha o buraco de supply chain da issue #42: um lock
   que ninguém confere é só texto com números bonitos — não detecta uma skill de
   terceiro cujo conteúdo mudou depois de travado.
   ═══════════════════════════════════════════════════════════════════════════════
   O QUE ENTRA NO HASH (definição canônica — hash sem algoritmo documentado não é
   reproduzível):

     • Um arquivo por entrada do lock: .agents/skills/<nome>/SKILL.md
       (o skillPath do lock aponta pra um único SKILL.md por skill).
     • Bytes lidos como UTF-8.
     • BOM inicial (U+FEFF) removido, se houver.
     • Fim de linha normalizado: CRLF e CR isolado viram LF.
     • Espaço em branco no fim do arquivo aparado e UM \n final garantido.
     • SHA-256 dos bytes UTF-8 resultantes, em hex.

   A normalização existe porque o mesmo texto commitado no Windows (CRLF) e no
   Unix (LF) tem bytes diferentes — sem ela, o hash acusaria deriva que não houve.

   COMPORTAMENTO
     • Sem o diretório .agents/skills/ (o normal nesta release — o conteúdo saiu
       do git e é reinstalado a partir do lock): AVISA e sai 0. Não falha.
     • Skill declarada no lock mas ausente no disco: PULADA (não instalada).
     • Skill presente com hash diferente: FALHA, imprime esperado × obtido, sai 1.
     • Pasta presente mas sem nenhuma skill do lock: AVISA e sai 0.

   uso:
     node tools/verify-skills.mjs            confere (default)
     node tools/verify-skills.mjs --update   regrava os computedHash das skills
                                             instaladas sob o algoritmo acima
   ═══════════════════════════════════════════════════════════════════════════════ */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const LOCK = 'skills-lock.json';
const DIR = '.agents/skills';
const UPDATE = process.argv.includes('--update');

/** Hash canônico de um SKILL.md — ver definição no cabeçalho. */
function hashSkill(buf) {
  const texto = buf
    .toString('utf8')
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\s+$/, '') + '\n';
  return crypto.createHash('sha256').update(texto, 'utf8').digest('hex');
}

if (!fs.existsSync(LOCK)) {
  console.error(`verify:skills — ${LOCK} não encontrado`);
  process.exit(1);
}
const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
const skills = lock.skills || {};

if (!fs.existsSync(DIR)) {
  console.warn(`verify:skills — ${DIR}/ ausente; skills reinstaladas a partir do lock. Nada a conferir.`);
  process.exit(0);
}

const falhas = [];
let conferidas = 0;
let ausentes = 0;

for (const [nome, meta] of Object.entries(skills)) {
  const arquivo = path.join(DIR, nome, 'SKILL.md');
  if (!fs.existsSync(arquivo)) {
    ausentes++;
    continue;
  }
  const obtido = hashSkill(fs.readFileSync(arquivo));
  if (UPDATE) {
    meta.computedHash = obtido;
    conferidas++;
    continue;
  }
  if (obtido !== meta.computedHash) {
    falhas.push({ nome, esperado: meta.computedHash, obtido });
  }
  conferidas++;
}

if (UPDATE) {
  fs.writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n');
  console.log(`verify:skills — ${conferidas} hash(es) regravado(s) em ${LOCK} (${ausentes} não instaladas)`);
  process.exit(0);
}

if (conferidas === 0) {
  console.warn(`verify:skills — nenhuma skill do lock instalada em ${DIR}/ (${ausentes} declaradas). Nada a conferir.`);
  process.exit(0);
}

if (falhas.length) {
  console.error(`verify:skills — ${falhas.length} skill(s) com hash divergente:`);
  for (const f of falhas) {
    console.error(`  ✗ ${f.nome}`);
    console.error(`      esperado ${f.esperado}`);
    console.error(`      obtido   ${f.obtido}`);
  }
  console.error('  conteúdo mudou depois de travado no lock, ou o lock está desatualizado.');
  process.exit(1);
}

console.log(`verify:skills — OK: ${conferidas} skill(s) conferem com o lock (${ausentes} declaradas não instaladas).`);
process.exit(0);
