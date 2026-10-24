#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY fora do Git');
const db = createClient(url, key, { auth: { persistSession: false } });
const bucketName = 'gameplay-submissions';
const action = process.argv[2];
const library = resolve(process.argv[3] || '../../launch-media/2026-10-24-growth-pipeline/capture-library');

if (action === 'setup') {
  const { data: current } = await db.storage.getBucket(bucketName);
  if (current) {
    const limit = Number(current.file_size_limit);
    const types = current.allowed_mime_types;
    if (current.public || !limit || limit > 300 * 1024 * 1024 ||
      !Array.isArray(types) || !['video/webm', 'video/mp4'].every(type => types.includes(type)))
      throw new Error('Bucket existente não atende ao limite privado de 300 MB');
    process.stdout.write('Bucket privado já existe.\n');
  } else {
    const { error } = await db.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 300 * 1024 * 1024,
      allowedMimeTypes: ['video/webm', 'video/mp4'],
    });
    if (error) throw error;
    process.stdout.write('Bucket privado criado.\n');
  }
} else if (action === 'sync') {
  const manifest = join(library, 'index.jsonl');
  let known = new Set();
  try { known = new Set((await readFile(manifest, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line).remotePath).filter(Boolean)); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  async function list(prefix) {
    const items = [];
    for (let offset = 0;; offset += 100) {
      const { data, error } = await db.storage.from(bucketName).list(prefix, { limit: 100, offset });
      if (error) throw error;
      items.push(...data);
      if (data.length < 100) break;
    }
    return items;
  }
  let imported = 0;
  for (const profile of await list('')) {
    if (profile.id) continue;
    for (const date of await list(profile.name)) {
      if (date.id) continue;
      const prefix = `${profile.name}/${date.name}`;
      for (const file of await list(prefix)) {
        if (!file.id || !/\.(webm|mp4)$/i.test(file.name)) continue;
        const remotePath = `${prefix}/${file.name}`;
        if (known.has(remotePath)) continue;
        const { data, error } = await db.storage.from(bucketName).download(remotePath);
        if (error || !data) throw error || new Error('Download falhou');
        const tempDir = await mkdtemp(join(tmpdir(), 'coro-take-'));
        try {
          const tempFile = join(tempDir, file.name);
          await writeFile(tempFile, Buffer.from(await data.arrayBuffer()));
          const map = file.name.replace(/-[a-f0-9-]{36}\.(webm|mp4)$/i, '');
          const { stdout } = await run(process.execPath, [
            resolve('tools/film/library-import.mjs'), '--source', tempFile,
            '--rights', 'community-consent', '--creator', profile.name,
            '--map', map, '--library', library,
          ], { maxBuffer: 1024 * 1024 });
          const result = JSON.parse(stdout);
          const lines = (await readFile(manifest, 'utf8')).trim().split('\n').map(JSON.parse);
          const row = lines.find(item => item.id === result.id);
          if (row) {
            row.remotePath = remotePath;
            if (row.source === tempFile) row.source = `supabase://${bucketName}/${remotePath}`;
          }
          await writeFile(manifest, lines.map(item => JSON.stringify(item)).join('\n') + '\n');
          known.add(remotePath);
          imported++;
        } finally { await rm(tempDir, { recursive: true, force: true }); }
      }
    }
  }
  process.stdout.write(JSON.stringify({ imported, library }) + '\n');
} else {
  process.stderr.write('Uso: node tools/film/library-storage.mjs setup|sync [diretorio-da-biblioteca]\n');
  process.exitCode = 2;
}
