import { existsSync, readFileSync, rmSync } from 'node:fs';

export function freshReport(path, produce) {
  // map_check.json é versionado; sem remover o antigo, um timeout parece medição atual.
  rmSync(path, { force: true });
  const output = produce();
  if (!existsSync(path)) {
    const reason = String(output).split('__ERRO__')[1]?.trim() || 'verifique a execução do auditor';
    return { data: null, error: `auditoria não gravou relatório novo: ${reason.slice(0, 180)}` };
  }
  try {
    return { data: JSON.parse(readFileSync(path, 'utf8')), error: null };
  } catch (error) {
    return { data: null, error: `relatório novo inválido: ${error.message}` };
  }
}
