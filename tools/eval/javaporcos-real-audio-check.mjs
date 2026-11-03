import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.BASE;
if (!base) throw new Error('BASE obrigatório');
const mutante = process.argv.find(arg => arg.startsWith('--mutante='))?.slice(10) || '';
if (!['', 'sintetico', 'sem-gravacao'].includes(mutante)) throw new Error('mutante desconhecido');
const out = process.env.OUT || '/tmp/javaporcos-real-audio';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] });
try {
  const page = await browser.newPage();
  await page.route(`${base}/__javaporcos_audio_qa`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Audio QA</title>' }));
  await page.goto(`${base}/__javaporcos_audio_qa`);
  const result = await page.evaluate(async mutante => {
    const { Sfx } = await import('/js/audio.js');
    const kinds = ['rosnado', 'carga', 'morte', 'horda', 'fucar', 'mix'];
    const measures = [];
    for (const kind of kinds) {
      const context = new OfflineAudioContext(2, 48000 * 3, 48000);
      window.AudioContext = function () { return context; };
      const sfx = new Sfx(); sfx.ensure(); sfx.setVolume(1);
      if (sfx.preloadJavaporcos) await sfx.preloadJavaporcos();
      let oscillators = 0; const sources = [];
      const oscillator = context.createOscillator.bind(context), source = context.createBufferSource.bind(context);
      context.createOscillator = () => { oscillators++; return oscillator(); };
      context.createBufferSource = () => { const node = source(); sources.push(node); return node; };
      if (mutante === 'sem-gravacao') sfx._boarSamples?.clear();
      if (mutante === 'sintetico') sfx.javaporco = () => {
        const node = context.createOscillator(), gain = context.createGain();
        gain.gain.value = .1; node.connect(gain).connect(context.destination); node.start(.1); node.stop(.4);
        return true;
      };
      let played = false;
      for (let i = 0; i < (kind === 'mix' ? 32 : 1); i++) played = sfx.javaporco(kind === 'mix' ? 'morte' : kind, .8, -.6, .1) || played;
      const rendered = await context.startRendering();
      const samples = rendered.getChannelData(0);
      let peak = 0, energy = 0;
      for (const value of samples) { peak = Math.max(peak, Math.abs(value)); energy += value * value; }
      const decoded = new Set(sfx._boarSamples?.values() || []);
      measures.push({ kind, played, oscillators, recordedSources: sources.filter(n => decoded.has(n.buffer)).length,
        peak, rms: Math.sqrt(energy / samples.length) });
    }
    return measures;
  }, mutante);
  writeFileSync(`${out}/resultado.json`, JSON.stringify(result, null, 2));
  let ok = true, rejected = 0;
  for (const m of result) {
    const pass = m.played && m.oscillators === 0 && m.recordedSources > 0 && m.peak > 0 && m.peak <= 1;
    ok &&= pass;
    if (!pass) rejected++;
    console.log(`${pass ? '✓' : '✗'} REAL1 ${m.kind}: osc=${m.oscillators}, gravações=${m.recordedSources}, pico=${m.peak.toFixed(4)}, RMS=${m.rms.toFixed(4)}`);
  }
  process.exitCode = mutante ? (rejected === result.length ? 0 : 1) : (ok ? 0 : 1);
} finally {
  await browser.close();
}
