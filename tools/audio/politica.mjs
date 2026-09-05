/* ============================================================================
   politica.mjs — A REGRA DE QUEM PODE ATRAVESSAR, ESCRITA UMA VEZ SÓ.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   Gerador, empacotador e `assets-check` decidem a mesma coisa: este arquivo pode
   seguir adiante? Cada um tinha a sua cópia da decisão, e as três eram DENYLIST —
   barravam o que estava catalogado como proibido e deixavam passar o que não
   estava catalogado nenhum.

   A auditoria da 4ª rodada provou o escape: fonte `proibida-standalone`,
   `derivados: []`, manifest apontando `audio/piloto/nao-catalogado.wav`. O
   empacotador saiu **0** e gerou o zip com o arquivo dentro. Lição 1 na veia — a
   régua perguntava "é um mau conhecido?" e não enxergava o desconhecido, que era
   justamente o estado ruim.

   Aqui a regra é ALLOWLIST e mora num arquivo só (lição 2: mesma decisão, mesma
   função, não três cópias que divergem na próxima edição).

   ── A REGRA ────────────────────────────────────────────────────────────────
   1. Caminho que casa um padrão do `legado` bloqueado: RECUSA, por NOME.
   2. Caminho sob `prefixoDerivado`: só passa se o sha-256 do conteúdo estiver no
      ledger, o caminho catalogado for o mesmo, a aprovação for `aprovado`, o
      evento estiver em `derivado` com caminho específico (`arma`, `superficie`
      ou `evento`), e a fonte
      existir. No contexto `pack`, a fonte ainda precisa ser `livre`.
      Qualquer outra coisa — inclusive "não sei o que é isto" — RECUSA.
   3. Uma raiz de runtime declarada em `raizesRuntime` herda a licença da fonte.
      No contexto `pack`, qualquer raiz de fonte não-`livre` é recusada mesmo sem
      hash em `derivados`. Isto cobre os diretórios locais do instalador — Fab,
      BOOM, Fish e callouts legados — que não vivem sob `prefixoDerivado`.
   4. Fora do prefixo e das raízes: se o conteúdo casar um derivado de fonte
      não-`livre`, recusa no contexto `pack` (derivado escondido fora da pasta
      ainda é redistribuição). Senão passa: está fora deste contrato.

   ── O QUE ELA NÃO CONSEGUE VER, E ESTÁ ESCRITO ─────────────────────────────
   Depois que o empacotador renomeia para `audio/a/<sha1>`, o prefixo some. Um
   derivado NÃO catalogado, nesse ponto, é indistinguível de qualquer outro áudio:
   sem hash no ledger não há o que casar. Por isso a camada decisiva é o
   EMPACOTADOR, que roda antes do rename e ainda vê o caminho. O `assets-check`
   é segunda linha e mede o que ainda dá para medir.

   O mesmo vale para o legado: ele é barrado por NOME. Sem hash — e não há hash,
   porque os arquivos não existem em clone limpo — não existe bloqueio por
   conteúdo. Isso é limitação declarada, não cobertura.
   ============================================================================ */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

export function carregarPolitica(caminhoLedger) {
  if (!existsSync(caminhoLedger)) {
    return { erro: `ledger não encontrado em ${caminhoLedger}` };
  }
  const L = JSON.parse(readFileSync(caminhoLedger, 'utf8'));
  const legadoAtivo = L.legado && String(L.legado.decisao || '').startsWith('bloqueado');
  return {
    prefixo: L.prefixoDerivado || 'audio/piloto/',
    raizesRuntime: (L.raizesRuntime || []).map((r) => ({
      prefixo: String(r.prefixo || ''),
      fonte: String(r.fonte || ''),
    })),
    porHash: new Map((L.derivados || []).map((d) => [d.sha256, d])),
    fontes: L.fontes || {},
    evento: new Map((L.piloto || []).map((p) => [p.evento, p])),
    legadoRes: legadoAtivo
      ? (L.legado.padroes || []).map((p) => ({ re: new RegExp(p.padrao, 'i'), porque: p.porque }))
      : [],
  };
}

/* Devolve `null` quando pode passar, ou o MOTIVO da recusa. Motivo é string
   porque quem chama imprime — recusa sem diagnóstico manda procurar no lugar
   errado. `contexto`: 'pack' (zip standalone) ou 'manifest' (autoria local). */
export function motivoDeRecusa(rel, bytes, pol, contexto = 'pack') {
  const legado = pol.legadoRes.find((p) => p.re.test(rel));
  if (legado) return `caminho de legado bloqueado por procedência (${legado.porque})`;

  const raiz = (pol.raizesRuntime || []).find((r) => r.prefixo && rel.startsWith(r.prefixo));
  if (raiz && contexto === 'pack') {
    const fonte = pol.fontes[raiz.fonte];
    if (!fonte) return `raiz de runtime cita fonte inexistente \`${raiz.fonte}\``;
    if (fonte.redistribuicao !== 'livre') {
      return `raiz de runtime \`${raiz.prefixo}\` vem da fonte \`${raiz.fonte}\` `
        + `(\`${fonte.redistribuicao}\`) e não pode entrar num pacote público só de áudio`;
    }
  }

  const sha = createHash('sha256').update(bytes).digest('hex');
  const d = pol.porHash.get(sha);

  if (!rel.startsWith(pol.prefixo)) {
    if (d && pol.fontes[d.fonte]?.redistribuicao !== 'livre' && contexto === 'pack') {
      return `derivado de fonte \`${d.fonte}\` (${pol.fontes[d.fonte]?.redistribuicao}) fora de `
        + `\`${pol.prefixo}\` — mudar de pasta não muda a licença`;
    }
    return null;
  }

  /* Daqui para baixo é ALLOWLIST: sob o prefixo derivado, o silêncio do ledger
     é recusa, não permissão. Era exatamente por aqui que o escape passava. */
  if (!d) return `NÃO CATALOGADO: nenhum derivado do ledger tem o sha-256 ${sha.slice(0, 12)}…`;
  if (d.arquivo !== rel) return `catalogado como \`${d.arquivo}\`, não como \`${rel}\``;
  if (d.aprovacao !== 'aprovado') return `aprovação está \`${d.aprovacao}\``;

  const f = pol.fontes[d.fonte];
  if (!f) return `fonte \`${d.fonte}\` não existe no ledger`;
  if (contexto === 'pack' && f.redistribuicao !== 'livre') {
    return `fonte \`${d.fonte}\` é \`${f.redistribuicao}\` e isto vira pacote só de áudio`;
  }

  const ev = pol.evento.get(d.evento);
  if (!ev) return `evento \`${d.evento}\` não está na lista do piloto`;
  if (ev.decisao !== 'derivado') return `o evento \`${d.evento}\` está em \`${ev.decisao}\``;
  if (!['arma', 'superficie', 'evento'].includes(ev.caminhoRuntime)) {
    return `o evento \`${d.evento}\` não tem caminho de runtime específico (\`${ev.caminhoRuntime}\`)`;
  }
  return null;
}
