// OOM #1188: cada mutante recebe um processo; nenhum resultado parcial vale como mordida.
import { spawnSync } from 'node:child_process';

export function classificarMutanteIsolado(nome, r, clausulas) {
  const linhas = `${r.stdout || ''}\n${r.stderr || ''}`.split(/\r?\n/);
  const evidencias = linhas.filter(l => l.startsWith(`mutante ${nome}: `));
  const resumo = linhas.filter(l => l.startsWith('economia no jogo: '));
  const nominal = resumo.length === 1 && resumo[0].startsWith(`economia no jogo: ${clausulas}/${clausulas} verdes;`)
    && !linhas.some(l => l.startsWith('XX '));
  const linha = evidencias.length === 1 ? evidencias[0] : '';
  if (!r.error && !r.signal && nominal && linha) {
    if (r.status === 0 && linha.startsWith(`mutante ${nome}: DETECTADO (EJ`)
      && resumo[0].endsWith('mutantes cegos: nenhum; cant_test: nenhum')) return { estado: 'detectado', linha };
    if (r.status === 1 && linha === `mutante ${nome}: VERDE, régua cega`
      && resumo[0].endsWith(`mutantes cegos: ${nome}; cant_test: nenhum`)) return { estado: 'cego', linha };
    if (r.status === 1 && linha.startsWith(`mutante ${nome}: CANT_TEST —`)
      && resumo[0].endsWith(`mutantes cegos: nenhum; cant_test: ${nome}`)) return { estado: 'cant_test', linha };
  }
  return { estado: 'cant_test', linha: `mutante ${nome}: CANT_TEST — processo isolado inválido (exit=${r.status}, signal=${r.signal || '-'}, erro=${r.error?.code || '-'}, baseline=${nominal}, evidências=${evidencias.length})` };
}

export function rodarMutanteIsolado(checker, nome, clausulas) {
  const r = spawnSync(process.execPath, [checker, `--mutante=${nome}`], {
    encoding: 'utf8', timeout: 300_000,
  });
  return { ...classificarMutanteIsolado(nome, r, clausulas), pid: r.pid };
}
