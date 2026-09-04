#!/usr/bin/env node
/* ============================================================================
   shortlist.mjs — CANDIDATOS POR EVENTO, SÓ POR METADADO.
   ----------------------------------------------------------------------------
   O QUE ELA FAZ
   Lê o `catalog.json` e o `inventory.json` do staging privado — nome, hash,
   duração, canais, taxa, pico, loudness — e monta a lista de candidatos por
   evento do piloto. **Nenhum byte de áudio é lido, tocado ou enviado a modelo.**
   A listagem do pacote diz `Allows usage with AI: No`, e o que sai daqui é o que
   caberia numa etiqueta.

   ── A DECISÃO É POR NOME, E ISSO TEM LIMITE ────────────────────────────────
   O casamento é por família de nome (`Concrete_Walk`, `Unload_1`, `Gunshot_3`).
   Nome não é som: dois arquivos com o mesmo prefixo podem soar diferente, e um
   nome bom pode cobrir um som ruim. Por isso a saída é SHORTLIST, não escolha —
   quem escolhe é o ouvido do dono na página A/B (`tools/audio/ab-local.mjs`).

   ── QUANDO O PACOTE NÃO TEM O SOM, ELA DIZ ─────────────────────────────────
   `semCandidato` marca o evento cujo pacote não cobre semanticamente, com o
   motivo. Forçar um `Hit_Generic` de combate corpo a corpo para "impacto de bala
   em concreto" seria inventar procedência sonora — o mesmo erro que o contrato
   de licença existe para impedir, com outra roupa.

   ── VETO DE GORE ───────────────────────────────────────────────────────────
   `Blood___Gore`, `Blood_Drop`, `Bone` e os gritos de `Human_Vocalizations`
   ficam de fora por linha editorial do `AGENTS.md` ("nada de gore"), e a lista
   é uma DENYLIST conferida no autoteste: família nova de sangue que apareça num
   pacote futuro precisa ser barrada explicitamente, não esquecida.

   ── USO ────────────────────────────────────────────────────────────────────
     node tools/audio/shortlist.mjs <dir-do-pack> [--saida=<arquivo.json>]
     node tools/audio/shortlist.mjs --autoteste
   ============================================================================ */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';

/* Famílias que NUNCA entram, por linha editorial. Casamento por substring no
   caminho, sem depender de maiúscula. */
export const VETO_GORE = ['blood', 'gore', 'bone', 'scream', 'screaming'];

/* Um evento do piloto -> como achar candidato. `familias` são prefixos de
   caminho dentro do pack extraído; `porque` é o que justifica o casamento.
   `semCandidato` é preenchido quando o pacote não cobre o evento. */
export const EVENTOS = [
  {
    evento: 'ak.shot', rotulo: 'AK 1ª pessoa — tiro',
    familias: ['Guns/Gun_Shot/Gunshot_'],
    excluir: ['Gunshot_Burst_', 'Gunshot_Distant_'],
    porque: 'tiros secos e isolados; o pacote tem 8 famílias numeradas',
    ressalva: 'NENHUM arquivo do pacote identifica a arma. São "gunshot" genéricos —'
      + ' escolher qual soa como AK é decisão de ouvido, não de nome.',
  },
  {
    evento: 'ak.shot.distante', rotulo: 'AK — camada distante (opcional)',
    familias: ['Guns/Gun_Shot/Gunshot_Distant_'],
    porque: 'o pacote traz camadas distantes prontas, que é justamente o que falta'
      + ' para a lei de volume/timbre por distância (bloqueio 2 do handoff)',
    ressalva: 'Não é evento do piloto original. Entra como insumo para resolver a'
      + ' distância, se o dono quiser.',
  },
  {
    evento: 'ak.magOut', rotulo: 'AK — carregador sai',
    familias: ['Guns/Foley/Unload_1'],
    porque: '"unload" é literalmente tirar o carregador',
  },
  {
    evento: 'ak.magIn', rotulo: 'AK — carregador entra',
    familias: ['Guns/Foley/Insert_Ammo_1', 'Guns/Foley/Loading_Ammo_1'],
    porque: '"insert ammo" / "loading ammo" cobrem a entrada do carregador',
  },
  {
    evento: 'ak.bolt', rotulo: 'AK — ferrolho',
    familias: ['Guns/Foley/Load_1'],
    porque: 'única família cujo nome pode conter um ferrolho de fuzil',
    semCandidato: 'O pacote não tem ferrolho de fuzil. O que existe é de OUTRAS armas:'
      + ' `Hammer_Back` e `Spinning_Cylinder` são revólver, `Pumping` é bombeada,'
      + ' `Loading_Gate` é alavanca. `Load_1` é ambíguo pelo nome e só o ouvido resolve.'
      + ' Não force: ferrolho errado é a diferença que o jogador de FPS escuta.',
  },
  {
    evento: 'passo.concreto', rotulo: 'Passos em concreto',
    familias: ['Footstep/Concrete/Concrete_Walk', 'Footstep/Concrete/Concrete_Run'],
    porque: 'casamento exato: o pacote tem uma pasta Concrete com andar e correr',
  },
  {
    evento: 'morte.corpo', rotulo: 'Morte corporal — queda',
    familias: ['Combat/Body_Falling'],
    porque: 'queda de corpo, sem sangue e sem grito — é o baque que o synth já imita',
  },
  {
    evento: 'impacto.concreto', rotulo: 'Impacto em concreto',
    familias: [],
    porque: null,
    semCandidato: 'O pacote é de combate CORPO A CORPO e medieval — arco, flecha, escudo,'
      + ' estocada. Não há impacto de projétil em superfície. `Hit_Generic` é pancada de'
      + ' luta, não bala batendo em parede.',
  },
  {
    evento: 'impacto.metal', rotulo: 'Impacto em metal',
    familias: [],
    porque: null,
    semCandidato: 'Mesma razão. `Metal_Weapon_Clash` e `Shield_Metal` são arma contra arma;'
      + ' `Misc/Metallic_Gear` é manuseio de equipamento. Nenhum é bala em chapa.',
  },
];

/* Tira só o `-N` final (a VARIAÇÃO), preservando o número da família. `Gunshot_3-5`
   vira `Gunshot_3`, e não `Gunshot`: as 8 famílias numeradas são 8 armas diferentes,
   e é entre elas que a escuta A/B decide qual soa como AK. Colapsar tudo numa só
   apagaria justamente a comparação que interessa. */
const familia = (saida) => saida.replace(/-\d+\.wav$/i, '').replace(/\.wav$/i, '');
const temGore = (caminho) => VETO_GORE.some((g) => caminho.toLowerCase().includes(g));

export function montar(catalogo, inventario) {
  const porHash = new Map((inventario.arquivos || []).map((a) => [a.sha256, a]));
  const vetados = [];
  const arquivos = (catalogo.files || []).filter((f) => {
    if (temGore(f.output)) { vetados.push(f.output); return false; }
    return true;
  });

  const eventos = EVENTOS.map((e) => {
    const achados = arquivos.filter((f) => e.familias.some((p) => f.output.startsWith(p))
      && !(e.excluir || []).some((x) => f.output.includes(x)));
    const candidatos = achados.map((f) => {
      const inv = porHash.get(f.sha256) || {};
      return {
        arquivo: f.output,
        familia: familia(f.output),
        sha256: f.sha256,
        duracaoS: f.durationSeconds ?? inv.duracaoS ?? null,
        canais: f.channels ?? inv.canais ?? null,
        taxaHz: f.sampleRate ?? inv.taxaHz ?? null,
        bits: f.bitsPerSample ?? inv.bitsPorAmostra ?? null,
        picoDb: inv.picoDb ?? null,
        loudnessLufs: inv.loudnessLufs ?? null,
      };
    }).sort((a, b) => a.arquivo.localeCompare(b.arquivo));
    const familias = [...new Set(candidatos.map((c) => c.familia))].sort();
    return {
      evento: e.evento, rotulo: e.rotulo, porque: e.porque, ressalva: e.ressalva || null,
      semCandidato: e.semCandidato || null,
      total: candidatos.length, familias, candidatos,
    };
  });

  /* Biblioteca de escuta livre: expõe somente metadados dos arquivos que
     sobreviveram ao veto editorial. Não sugere evento nem aprovação. */
  const biblioteca = arquivos.map((f) => {
    const inv = porHash.get(f.sha256) || {};
    return {
      arquivo: f.output,
      categoria: f.output.split('/')[0] || 'Sem categoria',
      sha256: f.sha256,
      duracaoS: f.durationSeconds ?? inv.duracaoS ?? null,
      canais: f.channels ?? inv.canais ?? null,
      taxaHz: f.sampleRate ?? inv.taxaHz ?? null,
      bits: f.bitsPerSample ?? inv.bitsPorAmostra ?? null,
      picoDb: inv.picoDb ?? null,
      loudnessLufs: inv.loudnessLufs ?? null,
    };
  }).sort((a, b) => a.arquivo.localeCompare(b.arquivo));

  return {
    _leia: 'Shortlist METADATA-ONLY do pacote privado. Não contém áudio. Nome não é som:'
      + ' a escolha é do ouvido do dono na página A/B, não desta lista.',
    veto: { regras: VETO_GORE, arquivosVetados: vetados.length },
    total: arquivos.length,
    biblioteca,
    eventos,
  };
}

// ── autoteste ──────────────────────────────────────────────────────────────
if (process.argv.includes('--autoteste')) {
  const cat = {
    files: [
      { output: 'Guns/Gun_Shot/Gunshot_1-1.wav', sha256: 'a'.repeat(64), durationSeconds: 1, channels: 2, sampleRate: 44100, bitsPerSample: 16 },
      { output: 'Guns/Gun_Shot/Gunshot_Distant_1-1.wav', sha256: 'b'.repeat(64), durationSeconds: 2, channels: 2, sampleRate: 44100, bitsPerSample: 16 },
      { output: 'Footstep/Concrete/Concrete_Walk-1.wav', sha256: 'c'.repeat(64), durationSeconds: 0.4, channels: 2, sampleRate: 44100, bitsPerSample: 16 },
      { output: 'Combat/Blood___Gore-1.wav', sha256: 'd'.repeat(64), durationSeconds: 0.6, channels: 2, sampleRate: 44100, bitsPerSample: 16 },
      { output: 'Combat/Bone-1.wav', sha256: 'e'.repeat(64), durationSeconds: 0.5, channels: 2, sampleRate: 44100, bitsPerSample: 16 },
      { output: 'Human_Vocalizations/Male_1_-_Screaming-1.wav', sha256: 'f'.repeat(64), durationSeconds: 1.5, channels: 2, sampleRate: 44100, bitsPerSample: 16 },
    ],
  };
  const inv = { arquivos: [{ sha256: 'a'.repeat(64), picoDb: -3.1, loudnessLufs: -14.2 }] };
  const r = montar(cat, inv);
  const falhas = [];
  const ev = (n) => r.eventos.find((e) => e.evento === n);

  if (r.veto.arquivosVetados !== 3) falhas.push(`SL1 o veto de gore deveria barrar 3 arquivos, barrou ${r.veto.arquivosVetados}.`);
  const todos = JSON.stringify(r.eventos);
  for (const g of ['Blood', 'Bone', 'Screaming']) {
    if (todos.includes(g)) falhas.push(`SL2 "${g}" vazou para a shortlist — o veto de gore não é decorativo.`);
  }
  /* `Gunshot_Distant_` não pode contaminar o tiro seco: os dois começam com
     `Gunshot_`, e sem a exclusão o evento do piloto herdaria a camada distante. */
  if (ev('ak.shot').total !== 1) falhas.push(`SL3 ak.shot casou ${ev('ak.shot').total} candidato(s); esperado 1 (o Distant é outro evento).`);
  if (ev('ak.shot.distante').total !== 1) falhas.push('SL4 a camada distante não foi separada.');
  if (ev('passo.concreto').total !== 1) falhas.push('SL5 passo em concreto não casou.');
  if (!ev('impacto.concreto').semCandidato) falhas.push('SL6 impacto.concreto tinha que estar marcado como sem candidato.');
  if (ev('impacto.concreto').total !== 0) falhas.push('SL6 impacto.concreto não pode ter candidato forçado.');
  if (ev('ak.shot').candidatos[0].picoDb !== -3.1) falhas.push('SL7 o metadado do inventário não foi juntado pelo hash.');
  /* A família preserva o número da arma: sem isso as 8 famílias de tiro viram uma
     só e a escuta A/B perde a comparação que decide qual soa como AK. */
  if (ev('ak.shot').familias[0] !== 'Guns/Gun_Shot/Gunshot_1') {
    falhas.push(`SL9 família de ak.shot veio "${ev('ak.shot').familias[0]}"; esperado terminar em Gunshot_1.`);
  }
  if (JSON.stringify(montar(cat, inv)) !== JSON.stringify(r)) falhas.push('SL8 duas execuções deram saídas diferentes.');
  if (r.biblioteca.length !== 3) falhas.push(`SL10 a biblioteca segura deveria ter 3 arquivos, tem ${r.biblioteca.length}.`);
  if (r.biblioteca.some((a) => temGore(a.arquivo))) falhas.push('SL11 gore vazou para a biblioteca completa.');
  if (!r.biblioteca.some((a) => a.arquivo === 'Guns/Gun_Shot/Gunshot_1-1.wav')) {
    falhas.push('SL12 arquivo seguro sumiu da biblioteca completa.');
  }

  if (falhas.length) { for (const f of falhas) console.error(`  ✗ ${f}`); process.exit(1); }
  console.log('  ✓ autoteste shortlist: veto de gore morde, distante não contamina o tiro seco,'
    + ' evento sem candidato fica vazio, saída determinística.');
  process.exit(0);
}

const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!dir) {
  console.error('uso: node tools/audio/shortlist.mjs <dir-do-pack> [--saida=<arquivo.json>]');
  process.exit(2);
}
const base = resolve(dir);
const catPath = join(base, 'extracted-wav', 'catalog.json');
const invPath = join(base, 'inventory.json');
for (const p of [catPath, invPath]) {
  if (!existsSync(p)) { console.error(`não achei ${p}`); process.exit(2); }
}
const saida = arg('saida');
if (saida && !relative(RAIZ_REPO, resolve(saida)).startsWith('..')) {
  console.error(`recusado: ${saida} fica dentro do repositório — a shortlist bruta não entra no Git.`);
  process.exit(2);
}
const r = montar(JSON.parse(readFileSync(catPath, 'utf8')), JSON.parse(readFileSync(invPath, 'utf8')));
const texto = JSON.stringify(r, null, 1) + '\n';
if (saida) { writeFileSync(resolve(saida), texto); console.error(`shortlist -> ${saida}`); }
else process.stdout.write(texto);
for (const e of r.eventos) {
  const marca = e.semCandidato ? 'SEM CANDIDATO' : `${e.total} candidato(s)`;
  console.error(`  ${e.evento.padEnd(20)} ${marca}${e.familias.length ? ` [${e.familias.length} família(s)]` : ''}`);
}
console.error(`  (${r.veto.arquivosVetados} arquivo(s) barrados pelo veto de gore)`);
