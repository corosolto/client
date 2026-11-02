// Prova semântica de mutante (#1169): a negação `!node` aceitava setup/crash como verde.
// Uso: node tools/eval/mutante-semantico-proof.mjs <script> --mutant(e)=<nome da whitelist>
import {execFile} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';

const mutantHeaderCount=Object.entries(JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')).scripts)
  .filter(([key,comment])=>key.startsWith('//')&&/mutantes?:/i.test(String(comment))).length;

// Whitelist fixa: script -> child local conhecido, tipos semânticos aceitos e cláusula exata por mutante.
// Cláusula vem daqui, nunca derivada do próprio resultado do child (senão o mutante se auto-atesta).
const WHITELIST={
  'community-inbox':{
    script:'tools/eval/community-inbox-check.mjs',flag:'--mutant=',types:['AssertionError'],cases:25,
    mutants:{
      'feature-off-entry':'mensagens desabilitadas explicam indisponibilidade e não consultam conversa',
      'unsafe-text':'avisos mantêm prova, texto seguro e leitura do servidor',
      'dead-actions':'ações de missão chegam a perfil, amigos e jogo',
      'retry-new-key':'falha de envio preserva rascunho e a mesma chave no retry',
      'account-keeps-draft':'troca de conta limpa conversa e rascunho antes da próxima tela',
      'stale-conversation-response':'resposta antiga de conversa não volta ao DOM depois da troca de conta',
      'typing-during-send':'campo fica bloqueado durante envio e falha reativa o mesmo rascunho e retry',
      'failure-keeps-disabled':'falha de envio preserva rascunho e a mesma chave no retry',
      'rerender-keeps-input-enabled':'reabrir mensagens durante envio preserva bloqueio e impede um segundo envio',
      'read-all-rows':'corpo e nome do remetente são texto literal; leitura envia apenas IDs recebidos vistos',
      'ignore-message-badge':'contadores somam avisos e mensagens sem marcar conteúdo como lido',
      'refresh-engole-render':'estado fora do ar depois do envio não segura a tela no rascunho',
      'portao-mudo':'a mensagem vale em qualquer perfil, e a flag desligada se explica',
    },
  },
  'mutantes-anunciados':{
    script:'tools/eval/mutantes-anunciados-check.mjs',flag:'--mutante=',types:['ContractViolation'],cases:mutantHeaderCount+1,
    mutants:{'anuncia-fantasma':'MA1','executa-fantasma':'MA2'},
  },
  'grafite-fiel':{
    script:'tools/eval/graffiti-bake-fiel-check.mjs',flag:'--mutante=',types:['ContractViolation'],cases:1,
    mutants:{'engole-falta':'G2'},
  },
};
const TYPE_BY_MUTANT=Object.fromEntries(Object.values(WHITELIST).flatMap(({types,mutants})=>Object.keys(mutants).map(name=>[name,types])));
const RUIM=/SyntaxError|TypeError|ReferenceError|MUTANTE NÃO APLICOU|ETIMEDOUT|timeout|setup|ECONNREFUSED|ERR_MODULE_NOT_FOUND|ERR_UNKNOWN_FILE_EXTENSION|ENOBUFS/i;

export function aceitaResultado(result,expected){
  if(!result||result.error||result.signal)return false;
  if(result.status!==1)return false;
  if(RUIM.test(String(result.stdout||'')+'\n'+String(result.stderr||'')))return false;
  const lines=String(result.stdout||'').trimEnd().split('\n');
  if(!lines.includes('Mutação aplicada: '+expected.mutant))return false;
  let report;
  try{report=JSON.parse(lines[lines.length-1]);}catch{return false;}
  if(!report||report.mutant!==expected.mutant||report.cases!==expected.cases)return false;
  if(report.error || report.infra)return false;
  if(!Array.isArray(report.failed)||!report.failed.length)return false;
  const types=TYPE_BY_MUTANT[expected.mutant]||[];
  const todosSemanticos=report.failed.every(f=>f&&typeof f==='object'&&types.includes(f.type)&&typeof f.message==='string'&&f.message.length>0);
  return todosSemanticos&&report.failed.some(f=>f&&f.clause===expected.clause);
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const [script,flag]=process.argv.slice(2);
  const name=String(flag||'').replace(/^--mutant[e]?=/,'');
  // hasOwn nos dois níveis: `constructor`/`__proto__` herdados não são script/mutante válido.
  const entry=Object.hasOwn(WHITELIST,script)?WHITELIST[script]:undefined;
  const clause=entry&&Object.hasOwn(entry.mutants,name)?entry.mutants[name]:undefined;
  if(!entry||!clause){console.error('uso: node tools/eval/mutante-semantico-proof.mjs <'+Object.keys(WHITELIST).join('|')+'> --mutant(e)=<nome da whitelist>');process.exit(2);}
  const cwd=fileURLToPath(new URL('../../',import.meta.url));
  execFile(process.execPath,[entry.script,entry.flag+name],{cwd,timeout:180000,maxBuffer:8*1024*1024,encoding:'utf8'},(error,stdout,stderr)=>{
    const numericExit=error&&Number.isInteger(error.code);
    const result={status:error?(numericExit?error.code:null):0,signal:error?.signal??null,error:error&&!numericExit?error:null,stdout,stderr};
    if(aceitaResultado(result,{mutant:name,clause,cases:entry.cases})){console.log('PASS mutante-semantico '+script+' '+name+': cláusula "'+clause+'" reprovou semanticamente');return;}
    console.error('RED mutante-semantico '+script+' '+name+': falso-verde recusado (setup/crash) ou mutante não aplicou');
    process.exitCode=1;
  });
}
