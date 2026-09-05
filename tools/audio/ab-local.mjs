#!/usr/bin/env node
/* ============================================================================
   ab-local.mjs — ESCUTA A/B LOCAL E PRIVADA. NUNCA APROVA SOZINHA.
   ----------------------------------------------------------------------------
   PARA QUE SERVE
   Todas as réguas desta lane provam que o arquivo chegou inteiro, veio de onde
   diz que veio e que a pipeline o alcança. **Nenhuma delas ouve nada.** Quem
   aprova é o Ruben, comparando A/B contra o synth, no jogo real. Esta ferramenta
   é o lugar onde ele faz isso sem precisar montar nada.

   ── PRIVADO POR CONSTRUÇÃO ─────────────────────────────────────────────────
   Sobe um servidor em `127.0.0.1` que serve, em memória, uma página e os WAVs
   DO STAGING PRIVADO, lidos de onde estão. Ele:
     · não copia nenhum WAV para dentro do repositório;
     · não escreve nada em `public/`;
     · só aceita conexão de loopback, e recusa qualquer caminho que escape da
       raiz do pacote (path traversal);
     · grava as decisões num JSON FORA do repositório.

   ── A APROVAÇÃO É HUMANA, E O FORMATO OBRIGA ISSO ──────────────────────────
   Um clique grava `{evento, arquivo, sha256, decisao, por, quando, nota}` no
   arquivo de decisões. Isso é REGISTRO DE ESCUTA, não aprovação: para virar
   `aprovacao: "aprovado"` no ledger alguém ainda precisa escrever a entrada do
   derivado, e a PRV2 exige `escutaAB.por` e `escutaAB.data`. A ferramenta não
   edita o ledger, de propósito — aprovação automática é exatamente o que o
   contrato existe para impedir.

   O botão do synth toca o MESMO sintetizador do jogo (`public/js/audio.js`), não
   uma imitação: é o lado B da comparação, e comparar contra outra coisa não
   responderia a pergunta.

   ── USO ────────────────────────────────────────────────────────────────────
     node tools/audio/ab-local.mjs <dir-do-pack> [--porta=8130] [--por=ruben]
   Abre http://127.0.0.1:8130 . Ctrl+C encerra.
   ============================================================================ */
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, appendFileSync, statSync } from 'node:fs';
import { join, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || d;

const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!dir) { console.error('uso: node tools/audio/ab-local.mjs <dir-do-pack> [--porta=8130] [--por=nome]'); process.exit(2); }
const PACK = resolve(dir);
const WAVS = join(PACK, 'extracted-wav');
const SHORTLIST = join(PACK, 'shortlist-piloto.json');
const PORTA = +arg('porta', '8130');
const POR = arg('por', 'ruben');
const DECISOES = join(PACK, 'decisoes-escuta.jsonl');
const TRIAGEM = join(PACK, 'triagem-escuta.jsonl');

if (!relative(RAIZ_REPO, PACK).startsWith('..')) {
  console.error(`recusado: ${PACK} está dentro do repositório. O staging privado fica fora.`);
  process.exit(2);
}
for (const p of [WAVS, SHORTLIST]) {
  if (!existsSync(p)) { console.error(`não achei ${p} — rode antes: node tools/audio/shortlist.mjs ${dir} --saida=${SHORTLIST}`); process.exit(2); }
}
const lista = JSON.parse(readFileSync(SHORTLIST, 'utf8'));
const PERMITIDOS = new Set((lista.biblioteca || lista.eventos.flatMap((e) => e.candidatos || []))
  .map((a) => a.arquivo));

const PAGINA = `<!doctype html><meta charset=utf-8><title>Escuta A/B — piloto Fab</title>
<style>
 :root{--bg:#12100f;--fg:#f2ece4;--mut:#9b938a;--lin:#2a2522;--ok:#4f9d5d;--no:#b4553f;--ac:#c9a227}
 *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);
  font:14px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
 header{padding:18px 22px;border-bottom:1px solid var(--lin);position:sticky;top:0;background:var(--bg);z-index:2}
 h1{margin:0 0 4px;font-size:17px;letter-spacing:.2px}
 .sub{color:var(--mut);font-size:12.5px}
 main{padding:14px 22px 60px;max-width:1080px}
 details{border:1px solid var(--lin);border-radius:9px;margin:12px 0;background:#171412}
 summary{padding:12px 14px;cursor:pointer;font-weight:600;list-style:none;display:flex;gap:10px;align-items:center}
 summary::-webkit-details-marker{display:none}
 .tag{font:600 10.5px/1.6 ui-monospace,monospace;padding:1px 7px;border-radius:99px;border:1px solid var(--lin);color:var(--mut)}
 .tag.sem{color:var(--no);border-color:#4a2a22}
 .aviso{margin:0;padding:10px 14px;color:#e8c99a;background:#241d13;border-top:1px solid var(--lin);font-size:12.5px}
 .porque{padding:8px 14px;color:var(--mut);font-size:12.5px;border-top:1px solid var(--lin)}
 table{width:100%;border-collapse:collapse;font-size:12.5px}
 th,td{padding:7px 10px;text-align:left;border-top:1px solid var(--lin);vertical-align:middle}
 th{color:var(--mut);font-weight:500}
 td.num{font-family:ui-monospace,monospace;color:var(--mut);white-space:nowrap}
 button{font:inherit;background:#221d1a;color:var(--fg);border:1px solid var(--lin);
  border-radius:7px;padding:5px 11px;cursor:pointer}
 button:hover{border-color:#463c36}
 button.play{min-width:74px}
 button.ok[data-on]{background:var(--ok);border-color:var(--ok);color:#0d1a0f}
 button.no[data-on]{background:var(--no);border-color:var(--no);color:#1a0d0a}
 .synth{background:#1d2733;border-color:#2c3a4a}
 .barra{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
 .nota{color:var(--mut);font-size:12px;padding:0 14px 12px}
 input[type=text]{font:inherit;background:#0e0c0b;color:var(--fg);border:1px solid var(--lin);
  border-radius:6px;padding:4px 8px;width:190px}
 .rodape{position:fixed;bottom:0;left:0;right:0;background:#0e0c0b;border-top:1px solid var(--lin);
  padding:8px 22px;font-size:12px;color:var(--mut);display:flex;gap:16px;justify-content:space-between}
 .biblioteca{margin-top:28px;border-top:1px solid var(--lin);padding-top:18px}
 .biblioteca h2{font-size:17px;margin:0 0 5px}
 .filtros{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}
 .filtros input{width:min(460px,100%)}
 select{font:inherit;background:#0e0c0b;color:var(--fg);border:1px solid var(--lin);border-radius:6px;padding:5px 8px}
 .contador{color:var(--mut);font-size:12px}
</style>
<header>
 <h1>Escuta A/B — piloto de áudio Fab</h1>
 <div class=sub>Nada aqui aprova nada sozinho. O clique grava um <b>registro de escuta</b>;
  virar <code>aprovado</code> no ledger continua sendo um passo manual.</div>
</header>
<main id=app></main>
<div class=rodape><span id=status>pronto</span><span>decisões: <code id=arq></code></span></div>
<script type="module">
const dados = __DADOS__;
document.getElementById('arq').textContent = dados.decisoes;
const app = document.getElementById('app');
const status = document.getElementById('status');
const ctxP = new Promise(r => r(new (window.AudioContext||window.webkitAudioContext)()));
let sfx = null;
async function synth(){
  if (!sfx) { const m = await import('/js/audio.js'); sfx = new m.Sfx(); }
  sfx.ensure(); sfx.pack = null;              // pack null = caminho sintetizado puro
  return sfx;
}
let atual = null;
function tocar(url){
  if (atual) { atual.pause(); }
  atual = new Audio(url); atual.play().catch(e => status.textContent = 'erro: '+e.message);
  status.textContent = 'tocando ' + decodeURIComponent(url.replace('/wav/',''));
}
async function tocarSynth(evento){
  const s = await synth();
  status.textContent = 'tocando synth: ' + evento;
  if (evento.startsWith('ak.shot')) s.shotWeapon('ak', 0, 1, 0, 0);
  else if (evento === 'passo.concreto') s.step('concrete');
  else if (evento === 'morte.corpo') s.death(1, 0, 0);
  else if (evento === 'ak.magOut') s.reloadStart();
  else if (evento === 'ak.magIn') s.reloadEnd();
  else if (evento === 'ak.bolt') s.bolt();
  else if (evento.startsWith('impacto')) s.ricochet();
  else s.uiClick();
}
async function registrar(btn, evento, c, decisao){
  const nota = btn.closest('tr').querySelector('input').value || '';
  const r = await fetch('/decisao', {method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({evento, arquivo:c.arquivo, sha256:c.sha256, decisao, nota})});
  if (!r.ok) { status.textContent = 'falhou ao gravar'; return; }
  const tr = btn.closest('tr');
  tr.querySelectorAll('button.ok,button.no').forEach(b => b.removeAttribute('data-on'));
  btn.setAttribute('data-on','1');
  status.textContent = decisao + ' registrado para ' + c.arquivo;
}
for (const e of dados.eventos) {
  const d = document.createElement('details');
  const semCand = e.semCandidato && !e.total;
  d.innerHTML = '<summary>' + e.rotulo +
    ' <span class="tag' + (semCand?' sem':'') + '">' +
    (semCand ? 'SEM CANDIDATO NO PACOTE' : e.total + ' candidatos · ' + e.familias.length + ' famílias') +
    '</span></summary>';
  if (e.semCandidato) { const p = document.createElement('p'); p.className='aviso';
    p.textContent = '⚠ ' + e.semCandidato; d.appendChild(p); }
  if (e.ressalva) { const p = document.createElement('p'); p.className='aviso';
    p.textContent = '⚠ ' + e.ressalva; d.appendChild(p); }
  if (e.porque) { const p = document.createElement('p'); p.className='porque';
    p.textContent = 'casou porque: ' + e.porque; d.appendChild(p); }
  const barra = document.createElement('p'); barra.className='nota';
  const bs = document.createElement('button'); bs.className='synth'; bs.textContent='▶ ouvir o SYNTH (lado B)';
  bs.onclick = () => tocarSynth(e.evento);
  barra.appendChild(bs); d.appendChild(barra);
  if (e.total) {
    const t = document.createElement('table');
    t.innerHTML = '<tr><th>arquivo</th><th>dur</th><th>pico</th><th>LUFS</th><th>escuta</th></tr>';
    for (const c of e.candidatos) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + c.arquivo + '</td>' +
        '<td class=num>' + (c.duracaoS ?? '—') + 's</td>' +
        '<td class=num>' + (c.picoDb ?? '—') + '</td>' +
        '<td class=num>' + (c.loudnessLufs ?? '—') + '</td>';
      const td = document.createElement('td'); td.className='barra';
      const bp = document.createElement('button'); bp.className='play'; bp.textContent='▶ A';
      bp.onclick = () => tocar('/wav/' + c.arquivo.split('/').map(encodeURIComponent).join('/'));
      const bok = document.createElement('button'); bok.className='ok'; bok.textContent='aprovar';
      const bno = document.createElement('button'); bno.className='no'; bno.textContent='rejeitar';
      const inp = document.createElement('input'); inp.type='text'; inp.placeholder='nota (opcional)';
      bok.onclick = () => registrar(bok, e.evento, c, 'aprovado');
      bno.onclick = () => registrar(bno, e.evento, c, 'rejeitado');
      td.append(bp, bok, bno, inp); tr.appendChild(td); t.appendChild(tr);
    }
    d.appendChild(t);
  }
  app.appendChild(d);
}

const sec = document.createElement('section'); sec.className='biblioteca';
const h = document.createElement('h2'); h.textContent='Biblioteca completa — triagem local';
const intro = document.createElement('p'); intro.className='sub';
intro.textContent='Todos os arquivos permitidos pela linha editorial. “Interessante” apenas registra uma pista; não aprova nem integra o áudio.';
const filtros = document.createElement('div'); filtros.className='filtros';
const busca = document.createElement('input'); busca.type='search'; busca.placeholder='buscar por nome (ex.: rain, door, explosion, metal)…';
const categoria = document.createElement('select');
const categorias = ['Todas', ...new Set(dados.biblioteca.map(a => a.categoria))];
for (const c of categorias) { const o=document.createElement('option'); o.value=c; o.textContent=c; categoria.appendChild(o); }
const contador = document.createElement('span'); contador.className='contador';
filtros.append(busca, categoria, contador);
const tabela = document.createElement('table');
tabela.innerHTML='<thead><tr><th>arquivo</th><th>dur</th><th>pico</th><th>LUFS</th><th>triagem</th></tr></thead><tbody></tbody>';
const corpoTabela = tabela.querySelector('tbody');
async function registrarTriagem(btn, a, decisao){
  const nota = btn.closest('tr').querySelector('input').value || '';
  const r = await fetch('/triagem', {method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({arquivo:a.arquivo, sha256:a.sha256, categoria:a.categoria, decisao, nota})});
  if (!r.ok) { status.textContent='falhou ao gravar triagem'; return; }
  const tr=btn.closest('tr'); tr.querySelectorAll('button.ok,button.no').forEach(b=>b.removeAttribute('data-on'));
  btn.setAttribute('data-on','1'); status.textContent=decisao+' registrado para '+a.arquivo;
}
function renderBiblioteca(){
  const termo=busca.value.trim().toLowerCase(); const cat=categoria.value;
  const filtrados=dados.biblioteca.filter(a => (cat==='Todas'||a.categoria===cat) && (!termo||a.arquivo.toLowerCase().includes(termo)));
  contador.textContent=filtrados.length+' de '+dados.biblioteca.length+' arquivos'; corpoTabela.replaceChildren();
  for (const a of filtrados) {
    const tr=document.createElement('tr');
    const nome=document.createElement('td'); nome.textContent=a.arquivo;
    const dur=document.createElement('td'); dur.className='num'; dur.textContent=(a.duracaoS??'—')+'s';
    const pico=document.createElement('td'); pico.className='num'; pico.textContent=a.picoDb??'—';
    const lufs=document.createElement('td'); lufs.className='num'; lufs.textContent=a.loudnessLufs??'—';
    const acao=document.createElement('td'); acao.className='barra';
    const play=document.createElement('button'); play.className='play'; play.textContent='▶ ouvir';
    play.onclick=()=>tocar('/wav/'+a.arquivo.split('/').map(encodeURIComponent).join('/'));
    const ok=document.createElement('button'); ok.className='ok'; ok.textContent='interessante';
    const no=document.createElement('button'); no.className='no'; no.textContent='descartar';
    const nota=document.createElement('input'); nota.type='text'; nota.placeholder='possível uso';
    ok.onclick=()=>registrarTriagem(ok,a,'interessante'); no.onclick=()=>registrarTriagem(no,a,'descartado');
    acao.append(play,ok,no,nota); tr.append(nome,dur,pico,lufs,acao); corpoTabela.appendChild(tr);
  }
}
busca.oninput=renderBiblioteca; categoria.onchange=renderBiblioteca;
sec.append(h,intro,filtros,tabela); app.appendChild(sec); renderBiblioteca();
</script>`;

const TIPOS = { '.wav': 'audio/wav', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' };

const servidor = createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  const caminho = decodeURIComponent(u.pathname);

  if (req.method === 'POST' && caminho === '/decisao') {
    let corpo = '';
    req.on('data', (c) => { corpo += c; if (corpo.length > 1e5) req.destroy(); });
    req.on('end', () => {
      try {
        const d = JSON.parse(corpo);
        /* Registro de ESCUTA, não aprovação. O ledger continua sendo editado à mão,
           e a PRV2 é quem cobra `escutaAB.por` e `escutaAB.data`. */
        appendFileSync(DECISOES, JSON.stringify({
          evento: d.evento, arquivo: d.arquivo, sha256: d.sha256,
          decisao: d.decisao === 'aprovado' ? 'aprovado' : 'rejeitado',
          por: POR, quando: new Date().toISOString(), nota: String(d.nota || '').slice(0, 500),
        }) + '\n');
        res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}');
        console.log(`  ${d.decisao === 'aprovado' ? '✓' : '✗'} ${d.evento.padEnd(18)} ${d.arquivo}`);
      } catch { res.writeHead(400); res.end('{}'); }
    });
    return;
  }

  if (req.method === 'POST' && caminho === '/triagem') {
    let corpo = '';
    req.on('data', (c) => { corpo += c; if (corpo.length > 1e5) req.destroy(); });
    req.on('end', () => {
      try {
        const d = JSON.parse(corpo);
        const permitido = (lista.biblioteca || []).find((a) => a.arquivo === d.arquivo && a.sha256 === d.sha256);
        if (!permitido) { res.writeHead(400); res.end('{}'); return; }
        appendFileSync(TRIAGEM, JSON.stringify({
          arquivo: permitido.arquivo, sha256: permitido.sha256, categoria: permitido.categoria,
          decisao: d.decisao === 'interessante' ? 'interessante' : 'descartado',
          por: POR, quando: new Date().toISOString(), nota: String(d.nota || '').slice(0, 500),
        }) + '\n');
        res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}');
      } catch { res.writeHead(400); res.end('{}'); }
    });
    return;
  }

  if (caminho === '/' || caminho === '/index.html') {
    const dados = JSON.stringify({ eventos: lista.eventos, biblioteca: lista.biblioteca || [], decisoes: DECISOES });
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(PAGINA.replace('__DADOS__', dados));
    return;
  }

  /* Os dois únicos diretórios servidos, cada um com a raiz travada: o WAV vem do
     staging privado e o `audio.js` do repositório, para o lado B ser o synth REAL
     do jogo e não uma imitação. Resolve e confere prefixo — nome com `..` não sai
     da raiz. */
  const rotas = [['/wav/', WAVS], ['/js/', join(RAIZ_REPO, 'public', 'js')]];
  for (const [prefixo, raiz] of rotas) {
    if (!caminho.startsWith(prefixo)) continue;
    const pedido = caminho.slice(prefixo.length);
    if (prefixo === '/wav/' && !PERMITIDOS.has(pedido)) break;
    const abs = resolve(join(raiz, pedido));
    if (relative(raiz, abs).startsWith('..') || !existsSync(abs) || !statSync(abs).isFile()) break;
    res.writeHead(200, { 'content-type': TIPOS[extname(abs).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(abs));
    return;
  }
  res.writeHead(404); res.end('nao encontrado');
});

/* Só loopback: a página serve material licenciado que não pode ser redistribuído,
   e um servidor em 0.0.0.0 publicaria o pacote na rede local. */
servidor.listen(PORTA, '127.0.0.1', () => {
  const n = lista.eventos.reduce((a, e) => a + e.total, 0);
  console.log(`escuta A/B em http://127.0.0.1:${PORTA}`);
  console.log(`  ${lista.eventos.length} eventos · ${n} candidatos · WAVs lidos de ${WAVS}`);
  console.log(`  ${(lista.biblioteca || []).length} arquivos seguros disponíveis na biblioteca completa`);
  console.log(`  decisões vão para ${DECISOES} (fora do repositório)`);
  console.log(`  triagem livre vai para ${TRIAGEM} (fora do repositório)`);
  console.log('  NADA aqui aprova sozinho: o clique grava registro de escuta, e o ledger continua manual.');
  console.log(`  sha256 do catálogo conferido: ${createHash('sha256').update(readFileSync(join(WAVS, 'catalog.json'))).digest('hex').slice(0, 16)}…`);
});
