/* estado.mjs — onde o estado dos bots mora, e por que não mora mais no repo.
   ─────────────────────────────────────────────────────────────────────────────
   O código da frota vive em /Volumes/Zenith (volume externo). Sob launchd o
   `node` NÃO consegue ABRIR PARA ESCRITA nada lá dentro: o TCC do macOS nega e
   o bot morre com

     EPERM: operation not permitted, open '…/estraga-codigo/estado/estado.json'

   a cada rodada (ver ~/Library/Logs/Canarinho/canarinho.err.log de 28/10). Ler
   passa, escrever não — então o canarinho revisava o mesmo PR para sempre: sem
   gravar o head revisado, toda rodada era a primeira.

   A cura é tirar o estado do volume externo. O disco interno do usuário é o
   lugar canônico de estado de serviço de usuário no macOS/XDG:

     ~/.local/state/corosolto/<bot>/

   DUAS funções, porque são dois papéis diferentes:
   - meuEstadoDir(): o bot DONO do estado. Cria a pasta, respeita o override
     ESTADO_DIR e migra uma única vez o que já existia no diretório legado.
   - estadoDeBot(): quem LÊ o estado de outro bot (cronista, conserta-codigo).
     Não cria nada e NÃO olha ESTADO_DIR — aquele override é do processo que
     roda, não do bot alheio que ele está espiando. Cai no legado quando a
     máquina ainda não migrou. */

import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const RAIZ_ESTADO = () => join(homedir(), '.local', 'state', 'corosolto');

/* Caminho do estado do bot que está rodando. `legado` + `migrar` descrevem a
 * mudança de endereço: na primeira vez que o novo diretório aparece vazio, as
 * entradas listadas são COPIADAS do antigo (cópia, não rename — atravessar
 * /Volumes → disco interno dá EXDEV). O legado fica onde está: ele é a prova
 * do que havia antes e não custa nada manter. */
export function meuEstadoDir(nomeBot, { legado = null, migrar = [] } = {}) {
  const env = (process.env.ESTADO_DIR || '').trim();
  const dir = env ? resolve(env) : join(RAIZ_ESTADO(), nomeBot);
  mkdirSync(dir, { recursive: true });
  if (legado && resolve(legado) !== dir && existsSync(legado)) {
    for (const nome of migrar) {
      const de = join(legado, nome), para = join(dir, nome);
      if (!existsSync(de) || existsSync(para)) continue;
      try { cpSync(de, para, { recursive: true }); } catch { /* legado ilegível: estado novo nasce limpo */ }
    }
  }
  return dir;
}

/* Caminho do estado de OUTRO bot, só para leitura. */
export function estadoDeBot(nomeBot, { legado = null } = {}) {
  const dir = join(RAIZ_ESTADO(), nomeBot);
  if (existsSync(dir)) return dir;
  return legado && existsSync(legado) ? legado : dir;
}
