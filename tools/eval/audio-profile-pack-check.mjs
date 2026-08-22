#!/usr/bin/env node
/* Prova que os dois perfis de áudio são separados e que o Steam não aceita memes. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = mkdtempSync(join(tmpdir(), 'coro-solto-audio-profiles-'));
const script = join(process.cwd(), 'scripts', 'build-audio-pack.mjs');
const makeSource = (name, licenseProfile, asset) => {
  const source = join(root, name, 'audio');
  mkdirSync(join(source, 'weapons'), { recursive: true });
  mkdirSync(join(source, 'capture'), { recursive: true });
  mkdirSync(join(source, 'menu-music'), { recursive: true });
  const rel = asset.folder === 'capture' ? 'audio/capture/punchline.mp3' : 'audio/weapons/shot.wav';
  writeFileSync(join(source, rel.replace(/^audio\//, '')), 'fixture');
  writeFileSync(join(source, 'manifest.json'), JSON.stringify({
    schema: 2,
    licenseProfile,
    general: { cue: rel },
  }));
  return source;
};
const run = (args, allowFailure = false) => {
  try {
    execFileSync('node', [script, ...args], { cwd: process.cwd(), stdio: 'pipe' });
    if (allowFailure) throw new Error('o comando deveria reprovar');
  } catch (error) {
    if (!allowFailure) throw error;
  }
};

const steamSource = makeSource('steam', 'release-safe', { folder: 'weapons' });
const steamOut = join(root, 'steam-out');
run([steamOut, '--profile', 'steam', '--audio-root', steamSource]);
if (!existsSync(join(steamOut, 'audio-pack-steam.zip'))) throw new Error('pack Steam não foi criado');
const steamProfile = JSON.parse(readFileSync(join(steamOut, 'pack', 'audio-profile.json')));
if (steamProfile.profile !== 'steam' || steamProfile.storeEligible !== true) throw new Error('metadado Steam incorreto');

const memeSource = makeSource('meme', 'web-meme', { folder: 'capture' });
run([join(root, 'meme-blocked'), '--profile', 'web-meme', '--audio-root', memeSource], true);
const memeOut = join(root, 'meme-out');
run([memeOut, '--profile', 'web-meme', '--allow-web-meme', '--audio-root', memeSource]);
if (!existsSync(join(memeOut, 'audio-pack-web-meme.zip'))) throw new Error('pack web-meme não foi criado');
const memeProfile = JSON.parse(readFileSync(join(memeOut, 'pack', 'audio-profile.json')));
if (memeProfile.profile !== 'web-meme' || memeProfile.storeEligible !== false) throw new Error('metadado web-meme incorreto');

console.log('✓ perfis Steam/web-meme separados; meme exige opt-in e Steam mantém base segura');
