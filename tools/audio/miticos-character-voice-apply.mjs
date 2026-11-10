#!/usr/bin/env node
/* Estrutura as vozes do Time Mítico no manifest do pack vivo (content-addressed-v1).
 *
 * PROBLEMA: no pack v8 cada Mítico tem `characterVoice.<id>` = string (só a fala longa de
 * seleção) e TODOS os bordões de kill moram juntos no pool `voice.M` (regra de 30/08). O
 * runtime (`Sfx.characterVoice`) só acha take próprio em `characterVoice.<id>.<evento>`, então
 * cada kill/rádio de Mítico sorteava do pool da facção inteira — o Lampião comemorava com a
 * voz do Saci numa sala sem Saci.
 *
 * O QUE FAZ: para cada Mítico, `characterVoice.<id>` vira
 *   { select: [<string antiga>], kill: [<hashes do pool M que são dele>] }
 * e `characterVoiceText` ganha a legenda de cada bordão. Nenhum byte novo: todos os hashes
 * já estão no pool M (verificado antes de escrever; hash fora do pool = recusa). O pool M
 * fica intacto (continua sendo o fallback genérico de `sfx.voice('M')`).
 * O mapa hash→personagem está em tools/audio/miticos-voice-map.json.
 *
 * O QUE NÃO FAZ: publicar. O manifest de produção é do dono (pack privado).
 *
 * Uso: node tools/audio/miticos-character-voice-apply.mjs --manifest=<manifest.json|URL> --out=<arquivo>
 *      (--out fora do repositório; recusa sobrescrever) */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const repoRoot = resolve(new URL('../..', import.meta.url).pathname);
const MAPA = JSON.parse(readFileSync(new URL('./miticos-voice-map.json', import.meta.url), 'utf8'));

export function aplicarVozesMiticas(manifest, mapa = MAPA) {
  const alvo = JSON.parse(JSON.stringify(manifest));
  const poolM = new Set(Array.isArray(alvo.voice?.M) ? alvo.voice.M : []);
  if (!poolM.size) throw new Error('manifest sem pool voice.M — não é o pack v8 dos Míticos');
  alvo.characterVoice ||= {};
  alvo.characterVoiceText ||= {};
  for (const [id, { kill }] of Object.entries(mapa.personagens)) {
    for (const take of kill) {
      if (!poolM.has(take.file)) throw new Error(`${id}/${take.slug || 'sfx'}: ${take.file} não está no pool voice.M deste manifest`);
    }
    const atual = alvo.characterVoice[id];
    const entrada = atual && typeof atual === 'object' ? { ...atual } : {};
    if (typeof atual === 'string') entrada.select = [atual];
    entrada.kill = kill.map((take) => take.file);
    alvo.characterVoice[id] = entrada;
    for (const take of kill) if (take.text) alvo.characterVoiceText[take.file] = take.text;
  }
  return alvo;
}

const ehMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (ehMain) {
  const arg = (nome) => process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3) || '';
  const fonte = arg('manifest'), saida = arg('out');
  if (!fonte || !saida) { console.error('uso: --manifest=<manifest.json|URL> --out=<arquivo fora do repo>'); process.exit(2); }
  const outPath = resolve(saida);
  if (!relative(repoRoot, outPath).startsWith('..')) { console.error('recusado: saída precisa ficar fora do repositório.'); process.exit(2); }
  if (existsSync(outPath)) { console.error(`recusado: ${outPath} já existe.`); process.exit(2); }
  const texto = /^https?:/.test(fonte)
    ? await fetch(fonte, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(`manifest HTTP ${r.status}`); return r.text(); })
    : readFileSync(fonte, 'utf8');
  const alvo = aplicarVozesMiticas(JSON.parse(texto));
  writeFileSync(outPath, JSON.stringify(alvo) + '\n');
  const n = Object.values(MAPA.personagens).reduce((a, p) => a + p.kill.length, 0);
  console.log(`${Object.keys(MAPA.personagens).length} Míticos estruturados (${n} takes do pool M, 0 bytes novos) → ${outPath}`);
}
