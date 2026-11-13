import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const objeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

/* GitHub Actions usa YAML 1.2: `on` é chave literal, não o booleano da YAML 1.1.
   Além de decodificar os valores, validamos a forma usada pelas réguas para que um
   jobs/steps malformado falhe fechado em vez de desaparecer da varredura. */
export function parseWorkflow(source, nome = '<workflow>') {
  let workflow;
  try {
    workflow = parse(source, { prettyErrors: true, uniqueKeys: true });
  } catch (error) {
    throw new Error(`${nome}: YAML inválido — ${error.message}`);
  }
  if (!objeto(workflow)) throw new Error(`${nome}: workflow precisa ser um mapa YAML`);
  if (workflow.jobs !== undefined && !objeto(workflow.jobs)) {
    throw new Error(`${nome}: jobs precisa ser um mapa YAML`);
  }
  for (const [id, job] of Object.entries(workflow.jobs || {})) {
    if (!objeto(job)) throw new Error(`${nome}: job ${id} precisa ser um mapa YAML`);
    if (job.steps !== undefined && !Array.isArray(job.steps)) {
      throw new Error(`${nome}: steps do job ${id} precisa ser uma lista YAML`);
    }
    for (const [indice, step] of (job.steps || []).entries()) {
      if (!objeto(step)) throw new Error(`${nome}: passo ${indice + 1} do job ${id} precisa ser um mapa YAML`);
    }
  }
  return workflow;
}

export function jobsDe(workflow) {
  return objeto(workflow?.jobs) ? workflow.jobs : {};
}

export function passosDe(job) {
  return Array.isArray(job?.steps) ? job.steps : [];
}

export function runDe(step) {
  return typeof step?.run === 'string' ? step.run : '';
}

export function ifDe(valor) {
  return typeof valor?.if === 'string' || typeof valor?.if === 'number' ? String(valor.if) : '';
}

export function gatilhoDe(workflow, nome) {
  const on = workflow?.on;
  if (nome === 'on') return on;
  if (objeto(on)) return on[nome];
  return undefined;
}

export function gatilhosDe(workflow) {
  const on = workflow?.on;
  if (typeof on === 'string') return [on];
  if (Array.isArray(on)) return on.filter((gatilho) => typeof gatilho === 'string');
  return objeto(on) ? Object.keys(on) : [];
}

/* O portão Python consome exatamente o mesmo parser: não existe uma segunda
   interpretação de YAML para triggers, jobs, permissões ou ordem de passos. */
if (process.argv[2] === '--parse-stdin') {
  try {
    const workflow = parseWorkflow(readFileSync(0, 'utf8'), '<stdin>');
    process.stdout.write(JSON.stringify(workflow));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
