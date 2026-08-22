#!/usr/bin/env node
// cache-probe.mjs — instrumentação de cache por sessão de agente
//
// Lê logs de sessão do Claude Code e do Codex, extrai métricas de tokens e
// chamadas de ferramentas, e escreve tools/eval/cache-baseline.json.
//
// O formato exato dos logs varia entre arnêses; este script procura arquivos
// JSON/Text em diretórios comuns e faz parse defensivo. Sem logs o baseline
// fica vazio e o script sinaliza o que não encontrou.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const OUT = new URL('./cache-baseline.json', import.meta.url);

const candDirs = [
  join(homedir(), '.claude', 'sessions'),
  join(homedir(), '.claude', 'logs'),
  join(homedir(), '.codex', 'sessions'),
  join(homedir(), '.codex', 'logs'),
  join(homedir(), '.codeium', 'windsurf', 'logs'),
  join(homedir(), '.kimi', 'logs'),
  join(homedir(), '.opencode', 'logs'),
];

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (s.isFile() && (nome.endsWith('.json') || nome.endsWith('.log') || nome.endsWith('.md'))) yield p;
  }
}

const met = [];
for (const dir of candDirs) {
  for (const p of walk(dir)) {
    let txt;
    try { txt = readFileSync(p, 'utf8'); } catch { continue; }
    const linhas = txt.split('\n');

    // Métricas de tokens (procura no corpo do JSON/texto)
    const input = Number(txt.match(/"input_tokens"\s*[:=]\s*(\d+)/)?.[1] ?? txt.match(/input_tokens[:\s]+(\d+)/)?.[1]);
    const cacheCreation = Number(txt.match(/"cache_creation_tokens"\s*[:=]\s*(\d+)/)?.[1] ?? txt.match(/cache_creation_tokens[:\s]+(\d+)/)?.[1]);
    const cacheRead = Number(txt.match(/"cache_read_tokens"\s*[:=]\s*(\d+)/)?.[1] ?? txt.match(/cache_read_tokens[:\s]+(\d+)/)?.[1]);
    const output = Number(txt.match(/"output_tokens"\s*[:=]\s*(\d+)/)?.[1] ?? txt.match(/output_tokens[:\s]+(\d+)/)?.[1]);

    // Contagem de chamadas de ferramentas
    const leituras = linhas.reduce((s, l) => s + (/(^|\s)(read|grep|glob|search)\s*\(/.test(l) ? 1 : 0), 0);
    const edicoes = linhas.reduce((s, l) => s + (/(^|\s)(edit|write)\s*\(/.test(l) ? 1 : 0), 0);

    if ([input, cacheCreation, cacheRead, output, leituras, edicoes].some((x) => x > 0)) {
      met.push({
        arquivo: p,
        input_tokens: input || 0,
        cache_creation_tokens: cacheCreation || 0,
        cache_read_tokens: cacheRead || 0,
        output_tokens: output || 0,
        reads: leituras,
        edits: edicoes,
      });
    }
  }
}

const porArquivo = met.map((m) => {
  const total = m.input_tokens + m.cache_creation_tokens + m.cache_read_tokens;
  return {
    ...m,
    cache_read_rate: total ? +(m.cache_read_tokens / total).toFixed(4) : null,
    exploration_edit_ratio: m.edits ? +(m.reads / m.edits).toFixed(2) : null,
  };
});

const baseline = {
  gerado: new Date().toISOString(),
  fontes: candDirs,
  logs_lidos: porArquivo.length,
  sessoes: porArquivo,
  totalizacao: porArquivo.length
    ? {
        input_tokens: porArquivo.reduce((s, m) => s + m.input_tokens, 0),
        cache_creation_tokens: porArquivo.reduce((s, m) => s + m.cache_creation_tokens, 0),
        cache_read_tokens: porArquivo.reduce((s, m) => s + m.cache_read_tokens, 0),
        output_tokens: porArquivo.reduce((s, m) => s + m.output_tokens, 0),
      }
    : null,
};

writeFileSync(OUT, JSON.stringify(baseline, null, 2));

console.log(`cache-probe: ${porArquivo.length} sessão(ões) encontrada(s).`);
console.log(`  baseline escrito em ${OUT.pathname}`);
if (!porArquivo.length) {
  console.log('  Nenhum log com métricas foi encontrado nos diretórios procurados:');
  for (const d of candDirs) console.log(`    · ${d}`);
} else {
  const t = baseline.totalizacao;
  const total = t.input_tokens + t.cache_creation_tokens + t.cache_read_tokens;
  console.log(`  cache read rate: ${(t.cache_read_tokens / total * 100).toFixed(1)}%`);
  console.log(`  read/edit ratio: ${(porArquivo.reduce((s, m) => s + m.reads, 0) / porArquivo.reduce((s, m) => s + m.edits, 0)).toFixed(2)}`);
}
