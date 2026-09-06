import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../..', import.meta.url));
const mutante = process.argv.find((arg) => arg.startsWith('--mutante='))?.split('=')[1] || '';
if (mutante && mutante !== 'fish-sem-direito') {
  console.error(`mutante desconhecido: ${mutante}`);
  process.exit(2);
}

const tmp = mkdtempSync(join(tmpdir(), 'csbr-audio-private-'));
const audio = join(tmp, 'public', 'audio');
const out = join(tmp, 'out');
const ledgerPath = join(tmp, 'ledger.json');
const arquivo = (rel, conteudo) => {
  const alvo = join(tmp, 'public', rel);
  mkdirSync(join(alvo, '..'), { recursive: true });
  writeFileSync(alvo, conteudo);
};

const fontes = {
  fab: { redistribuicao: 'proibida-standalone', deployPrivado: { build: true } },
  fish: { redistribuicao: 'proibida', deployPrivado: { build: mutante !== 'fish-sem-direito' } },
  characters: { redistribuicao: 'proibida-standalone', deployPrivado: { build: true } },
  legado: { redistribuicao: 'proibida', deployPrivado: { build: false } },
  menu: { redistribuicao: 'proibida-standalone', deployPrivado: { build: true } },
};
const ledger = {
  prefixoDerivado: 'audio/piloto/',
  raizesRuntime: [
    { prefixo: 'audio/fab-dev/', fonte: 'fab' },
    { prefixo: 'audio/fish-announcer-dev/', fonte: 'fish' },
    { prefixo: 'audio/character-voices-dev/', fonte: 'characters' },
    { prefixo: 'audio/legacy-callouts-dev/', fonte: 'legado' },
    { prefixo: 'audio/menu-music/', fonte: 'menu' },
  ],
  fontes,
  piloto: [],
  derivados: [],
  legado: {
    decisao: 'bloqueado',
    padroes: [{ padrao: '^audio/legacy-callouts-dev/', porque: 'callout legado' }],
  },
};

const rodar = (manifest, privado = true) => {
  rmSync(out, { recursive: true, force: true });
  writeFileSync(join(audio, 'manifest.json'), JSON.stringify(manifest));
  const args = [join(raiz, 'scripts', 'build-audio-pack.mjs'), out, `--raiz=${audio}`, `--ledger=${ledgerPath}`];
  if (privado) args.push('--private-build');
  return spawnSync(process.execPath, args, { encoding: 'utf8' });
};

try {
  arquivo('audio/fab-dev/shot.wav', 'fab permitido\n');
  arquivo('audio/fish-announcer-dev/round.wav', 'fish sem direito verificado\n');
  arquivo('audio/character-voices-dev/mandrake/select/select-01.mp3', 'voz aprovada\n');
  arquivo('audio/legacy-callouts-dev/double.mp3', 'legado bloqueado\n');
  arquivo('audio/menu-music/m03.mp3', 'menu aprovado\n');
  writeFileSync(ledgerPath, JSON.stringify(ledger));

  const falhas = [];
  const permitido = rodar({
    weapons: { ak: ['audio/fab-dev/shot.wav'] },
    ...(mutante ? {} : { roundNumbers: { 1: ['audio/fish-announcer-dev/round.wav'] } }),
    characterVoice: { mandrake: { select: ['audio/character-voices-dev/mandrake/select/select-01.mp3'] } },
    menuMusic: ['audio/menu-music/m03.mp3'],
  });
  if (permitido.status !== 0 || !existsSync(join(out, 'audio-pack.zip'))) {
    falhas.push(`pack privado recusou fontes autorizadas (${permitido.stderr.trim().split('\n')[0] || `exit ${permitido.status}`})`);
  } else {
    const manifest = JSON.parse(readFileSync(join(out, 'pack', 'manifest.json'), 'utf8'));
    if (manifest._privateBuild?.format !== 'content-addressed-v1') {
      falhas.push('pack privado não marca o formato content-addressed para o audio:check');
    }
    const refs = [
      ...(manifest.weapons?.ak || []), ...(manifest.roundNumbers?.['1'] || []),
      ...(manifest.characterVoice?.mandrake?.select || []), ...(manifest.menuMusic || []),
    ];
    const expected = mutante ? 3 : 4;
    if (refs.length !== expected || refs.some((ref) => !/^audio\/a\/[0-9a-f]{16}\.(wav|mp3)$/.test(ref))) {
      falhas.push(`pack privado não reescreveu as ${expected} fontes autorizadas com nomes opacos (${JSON.stringify(refs)})`);
    }
  }

  const publico = rodar({ weapons: { ak: ['audio/fab-dev/shot.wav'] }, menuMusic: ['audio/menu-music/m03.mp3'] }, false);
  if (publico.status === 0) falhas.push('pack público aceitou fonte proibida para redistribuição standalone');

  const fish = rodar({ roundNumbers: { 1: ['audio/fish-announcer-dev/round.wav'] }, menuMusic: ['audio/menu-music/m03.mp3'] });
  if (mutante === 'fish-sem-direito') {
    if (fish.status === 0) falhas.push('mutante sobreviveu: pack privado aceitou Fish sem autorização explícita de build');
  } else if (fish.status !== 0) {
    falhas.push(`pack privado recusou Fish apesar da autorização explícita (${fish.stderr.trim().split('\n')[0] || `exit ${fish.status}`})`);
  }

  const legado = rodar({ general: { doublekill: ['audio/legacy-callouts-dev/double.mp3'] }, menuMusic: ['audio/menu-music/m03.mp3'] });
  if (legado.status === 0) falhas.push('pack privado aceitou callout legado bloqueado por procedência');

  if (falhas.length) {
    falhas.forEach((falha) => console.error(`REPROVADO — ${falha}`));
    process.exitCode = 1;
  } else {
    console.log(`APROVADO — build privado é allowlist; Fish ${mutante ? 'sem autorização foi recusado' : 'autorizado e vozes dos personagens foram incorporados'}; pack público e legado continuam bloqueados`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
