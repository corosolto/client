import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import vm from 'node:vm';
import path from 'node:path';
import sharp from 'sharp';

const source = readFileSync('public/js/characters.js', 'utf8');
const roster = vm.runInNewContext(source.match(/export const CHARACTERS = (\[[\s\S]*?\n\]);/)[1]).filter(c => c.team === 'P' || c.team === 'M');
const weapons = vm.runInNewContext('(' + source.match(/export const CHAR_WEAPON = (\{[\s\S]*?\n\});/)[1] + ')');
const repository = path.dirname(path.resolve(execFileSync('git', ['rev-parse', '--git-common-dir'], { encoding: 'utf8' }).trim()));
const masters = process.env.MASTERS || path.resolve(repository, '..', 'launch-media', '2026-10-11-wallpapers');
mkdirSync(masters, { recursive: true });
mkdirSync('plans', { recursive: true });
const jobs = [{
  id: 'loading-roster-red', aspect: '16:9', width: 2560,
  refs: ['public/img/loading-1.webp'],
  prompt: 'Extend this exact red clown loading illustration horizontally into a seamless 16:9 fullscreen wallpaper. Preserve the exact clown identity, costume, rifle, face, red lighting, Brazilian Congress architecture and CORO SOLTO TRETA SUPREMA logo from the reference. Recompose with the entire clown visible on the left and the exact logo in the upper right safe area, with generous breathing room. Continue the rain-wet plaza and architecture naturally all the way to BOTH edges. No blurred strips, no black borders, no rectangular patches, no duplicate figures or logos. Keep the reference illustration style. This is original game artwork, not a photograph.',
}];
const wallpapers = roster.map((c, i) => ({ id: c.id, name: c.name, wall: `/img/wall-${29 + i}.webp` }));
for (let i = 0; i < roster.length; i++) {
  const c = roster[i];
  jobs.push({
    id: `wall-${29 + i}`, character: c.id, aspect: '3:2', width: 3072,
    refs: [`references/wallpapers-roster/${c.id}.png`, 'public/img/wall-20.webp', `public/img/weapons/${weapons[c.id]}.webp`, 'public/img/loading-1.webp'],
    prompt: `Use case: style-transfer. Create a new CORO SOLTO game menu wallpaper of ${c.name}. Image 1 is the EXACT current game character render: preserve its recognizable identity, costume, colors, hairstyle and signature details. Reinterpret the character as rich cinematic GPT digital illustration matching the old wallpapers, with organic skin/fur, detailed cloth, expressive anatomy and painterly light; do not copy raw mesh facets or plastic game-model surfaces. ${c.blurb} Image 2 supplies only the cinematic Brazilian environment, lighting, composition and exact CORO SOLTO TRETA SUPREMA logo; do not copy its woman into the scene. Image 3 supplies the ${weapons[c.id]} firearm: give the character this weapon held naturally, finger outside trigger, muzzle lowered. Show ONLY the character from image 1, full body in the right half, head and feet safely inside the middle 70 percent of the canvas so a 16:9 screen can crop the top and bottom without cutting the figure. ${c.team === 'P' ? 'Keep the character an original hand-painted satirical political caricature with believable adult anatomy and expressive facial exaggeration, never a photograph, plastic mascot or raw 3D render. Image 4 supplies the approved red-clown artistic finish, not its character or color palette. Environment: rainy Brasilia civic plaza at blue hour, modern Brazilian architecture, warm street lamps.' : 'Environment: an original Brazilian landscape suited to the character, with recognizable Brazilian vegetation or colonial/cangaco architecture, atmospheric dusk and cinematic lighting. Keep the illustrated character recognizable from image 1. Image 4 supplies the approved red-clown artistic finish, not its subject or color palette.'} Landscape 3:2 composition, ideally 3072×2048, with quiet dark negative space on the left for menu controls. Place the exact small logo from image 2 in the upper left SAFE AREA at least 15 percent below the top. Integrate the figure naturally into the scene with ground contact, shadow and consistent lighting. Sharp detailed original game key art. Edge-to-edge continuous environment. No borders, no blur panels, no extra characters, no watermarks, no captions, no gore, no real-world political party logos.`,
  });
}
writeFileSync('public/img/roster-wallpapers.json', JSON.stringify(wallpapers, null, 2) + '\n');
writeFileSync('plans/WALLPAPERS-ROSTER.md', '<!-- spec:time -->\n# Wallpapers do elenco atual\n\n' + roster.map((c, i) => `## ${i + 1}. ${c.name} — arte do elenco\n\n- **Visual:** ${c.blurb} Identidade e figurino do GLB versionado, reinterpretados como ilustração cinematográfica GPT no acabamento das artes antigas; sem facetas nem aparência de boneco plástico.\n- **Papel:** wallpaper e sprite do personagem existente; não altera gameplay.\n- **Arma:** wallpapers seguem CHAR_WEAPON; sprites usam o render sem arma do charvideo.html.\n- **Mecânica:** mantém as habilidades existentes; varia somente apresentação e rotação de mídia.\n- **Procedência:** public/models/characters/${c.id}.glb; references/wallpapers-roster/FONTE.md.\n`).join('\n') + '\n## Vetos e aceite\n\nCaricaturas políticas seguem CONTRIBUTING.md; sem foto real, copyright externo ou gore. Acabamento ilustrado deve acompanhar loading-1 e wall-20; identidade não obriga copiar o material ou a geometria do GLB.\nMenu 3:2; loading 16:9; sprite transparente quadrado; revisão independente no tamanho servido.\n');
writeFileSync(path.join(masters, 'prompts.json'), JSON.stringify(jobs, null, 2) + '\n');
const requested = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (process.argv.includes('--prepare-only')) process.exit(0);
if (process.argv.includes('--import-masters')) {
  for (const job of jobs) {
    if (requested.length && !requested.includes(job.id) && !requested.includes(job.character)) continue;
    const source = path.join(masters, `${job.id}-source.png`);
    if (!existsSync(source)) throw new Error(`master ausente: ${source}`);
    const loading = job.id === 'loading-roster-red';
    const output = `public/img/${loading ? 'loading-1' : job.id}.webp`;
    if (loading && !existsSync(path.join(masters, 'previous-loading-1.webp'))) copyFileSync(output, path.join(masters, 'previous-loading-1.webp'));
    await sharp(source).resize(loading ? 1664 : 1536, loading ? 936 : 1024, { fit: 'cover', position: 'centre' }).webp({ quality: 90, smartSubsample: true }).toFile(output);
  }
  for (let i = 2; i <= 6 && (!requested.length || requested.includes('loading-roster-red')); i++) {
    const output = `public/img/loading-${i}.webp`;
    const previous = path.join(masters, `previous-loading-${i}.webp`);
    if (!existsSync(previous)) copyFileSync(output, previous);
    await sharp(previous).resize(1664, 936, { fit: 'cover', position: 'centre' }).webp({ quality: 90, smartSubsample: true }).toFile(output);
  }
  const styleRevision = existsSync(path.join(masters, 'gpt-style-prompts.json'));
  const masterLocation = path.relative(path.dirname(repository), masters);
  const provenance = styleRevision
    ? 'Revisão de estilo em 12/10/2026: os 19 wallpapers recebem o acabamento\ncinematográfico ilustrado de loading-1 e wall-20. Identidade, roupa e arma\nseguem o elenco; facetas e materiais plásticos do GLB não são referências de acabamento.\nPrompts efetivos: gpt-style-prompts.json; referências anteriores: previous-webp/.\n'
    : 'Referências: GLBs versionados, renders de charvideo.html, wall-20, loading-1\ne thumbnails das armas de CHAR_WEAPON. Prompts efetivos: gpt-prompts.json.\n';
  writeFileSync('public/img/roster-wallpapers-FONTE.md', '# Wallpapers do elenco\n\nGPT integrado do Codex, autorizado pelo dono após OpenRouter HTTP 402.\n' + provenance + 'Sem foto externa. Os políticos são caricaturas do jogo.\nMasters e prompts: ' + masterLocation + '/ no workspace.\nImportação: tools/gen-roster-wallpapers.mjs --import-masters; menu 1536×1024,\nloading 1664×936. A normalização conserva proporção e não estica a arte.\nA captura 5120×2880 verifica o enquadramento por cover; não é resolução nativa.\n\n' + wallpapers.map(w => `- ${w.wall}: ${w.name} (${w.id})`).join('\n') + '\n\nloading-1: recomposição GPT do palhaço original; loading-2..6: enquadramento\n16:9 das artes existentes, importados em 11/10. A revisão de estilo muda só wallpapers.\n');
  console.log(requested.length ? `masters importados: ${requested.join(', ')}` : `${wallpapers.length} wallpapers importados; 6 loadings normalizados`);
  process.exit(0);
}
for (const job of jobs) {
  if (requested.length && !requested.includes(job.id) && !requested.includes(job.character)) continue;
  if (existsSync(`public/img/${job.id}.webp`)) { console.log(`${job.id}: já gerado`); continue; }
  const args = ['tools/gen-image.mjs', '--id', job.id, '--prompt', job.prompt, '--aspect', job.aspect, '--crop', job.aspect, '--w', String(job.width), '--quality', '90'];
  for (const ref of job.refs) args.push('--ref', ref);
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${job.id}: gerador saiu ${code}`)));
  });
  copyFileSync(`/tmp/gen-image/${job.id}.png`, path.join(masters, `${job.id}-source.png`));
}
