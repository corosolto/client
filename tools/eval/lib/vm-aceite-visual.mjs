import crypto from 'node:crypto';
import fs from 'node:fs';

const ARQUIVO = 'tools/eval/vm-launch-aceite-visual.json';

export function assinaturaCelula(x) {
  return crypto.createHash('sha256').update(JSON.stringify([x.estado, x.valor, x.msg])).digest('hex');
}

export function lerAceites() {
  const dados = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
  if (dados.schema !== 1 || !dados.aceites || typeof dados.aceites !== 'object') {
    throw new Error(`${ARQUIVO}: schema ou aceites inválidos`);
  }
  return dados.aceites;
}

export function aceiteExato(aceites, aspecto, regua, arma, x) {
  const a = aceites[`${aspecto}/${regua}/${arma}`];
  return Boolean(a && a.estado === x.estado && a.valor === x.valor
    && a.sha256 === assinaturaCelula(x));
}
