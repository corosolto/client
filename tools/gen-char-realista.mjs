// Retrato FOTORREALISTA de cada personagem, com a identidade travada pelo render do modelo.
//
// É a etapa 2 do pipeline que começa em `tools/gen-char-video.mjs`. A ordem importa
// e é o ponto inteiro desta ferramenta:
//
//   1. `public/charvideo.html` renderiza o GLB REAL (mesmo rig, mesma luz do jogo)
//   2. esse frame vira `--ref` do modelo de imagem
//   3. o modelo só troca o MEIO — de render estilizado para fotografia
//
// Sem o passo 1 o modelo desenha *um* mandrake. Com ele, desenha O Mandrake: a
// referência é que responde "quem é", e o prompt responde só "como é fotografado".
// Por isso o prompt abaixo é GENÉRICO e igual para os 44 — descrever a roupa de
// cada um à mão seria reintroduzir, em texto, a chance de errar o personagem.
//
// A saída NUNCA sobrescreve a do passo 1: sufixo `-<estilo>`. Uma corrida com chave
// não pode apagar o render fiel, que é o único artefato que não dá para refazer sem
// o browser.
//
// Uso:
//   node tools/gen-char-realista.mjs --ids mandrake,canarinho --base http://localhost:8137
//   node tools/gen-char-realista.mjs --todos --estilo gamer
//
//   --estilo gamer|foto   gamer (padrao) = hero render 3D estilizado, casa com o jogo.
//                         foto = retrato fotorrealista de estudio.
//
// Flags:
//   --ids a,b,c    lista de personagens (obrigatório, salvo --todos)
//   --todos        o elenco inteiro de public/models/characters/
//   --shot         busto (padrão) | corpo
//   --model        padrão openai/gpt-5-image
//   --out          padrão /tmp/gen-char-realista (use --publicar para ir a public/img)
//   --publicar     grava em public/img/chars-realista/<id>.webp já recortado
//   --base         padrão http://localhost:8137 (suba `node tools/eval/serve.mjs 8137`)
//   --forcar       regera mesmo se a saída já existir
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const flag = (n) => argv.includes(`--${n}`);
const die = (m) => { console.error('ERRO:', m); process.exit(1); };

const SHOT = arg('shot', 'busto');
const MODEL = arg('model', 'openai/gpt-5-image');
const BASE = arg('base', process.env.BASE || 'http://localhost:8137');
const PUBLICAR = flag('publicar');
const FORCAR = flag('forcar');
const OUT = arg('out', PUBLICAR ? 'public/img/chars-realista' : '/tmp/gen-char-realista');
const TMP = '/tmp/gen-char-realista/refs';

/* A lista sai do ELENCO cruzado com os arquivos, não do diretório sozinho.
   `public/models/characters/` tem funkeiro.glb, que é ÓRFÃO: o glbchars.js explica
   que "mandrake = o antigo funkeiro.glb renomeado", e a entrada saiu do
   characters.js mas o arquivo ficou. Listando por diretório, o tool tentava
   renderizar um personagem que o jogo não tem — CHARACTERS.find devolvia undefined,
   o modelo não montava e a página pendurava até o timeout de 120s. Duas corridas
   perdidas nisso.
   Leio por regex em vez de importar: characters.js é módulo de browser e arrastá-lo
   para o node traria three e o resto junto. */
function elenco() {
  const src = readFileSync('public/js/characters.js', 'utf8');
  const ids = new Set();
  for (const m of src.matchAll(/\bid:\s*'([a-z0-9_]+)'/g)) ids.add(m[1]);
  return ids;
}

let IDS;
if (flag('todos')) {
  const roster = elenco();
  const arquivos = readdirSync('public/models/characters').filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, ''));
  const orfaos = arquivos.filter((id) => !roster.has(id));
  if (orfaos.length) console.log(`· ignorando GLB sem entrada no elenco: ${orfaos.join(', ')}`);
  IDS = arquivos.filter((id) => roster.has(id)).sort();
} else {
  const s = arg('ids');
  if (!s) die('faltou --ids (ou --todos)');
  IDS = s.split(',').map((x) => x.trim()).filter(Boolean);
}

/* OS PROMPTS SÃO GENÉRICOS DE PROPÓSITO — ver o cabeçalho. Cada um diz o que
   PRESERVAR (tudo que define quem é) e o que MUDAR (só o acabamento). Descrever a
   roupa personagem por personagem seria reintroduzir, em texto, exatamente a chance
   de errar o personagem que a referência existe para eliminar.

   As duas travas do fim nasceram de defeito MEDIDO na primeira leva de 5: o modelo
   pôs uma corrente prateada no canarinho (o busto corta na gola e ele preencheu o
   vazio) e trocou o casaco rosa do palhacomal por couro vinho — ele "conserta" para
   o plausível, e plausível não é o personagem. */
const PRESERVAR = [
  'PRESERVE COM EXATIDÃO, sem inventar nem substituir nada: o rosto e suas proporções,',
  'o tom de pele, o cabelo e o corte, todos os acessórios de cabeça (boné, chapéu, capuz,',
  'faixa, máscara), os óculos e a cor exata das lentes, cada peça de roupa com as MESMAS',
  'cores, o mesmo recorte e os mesmos blocos de cor, correntes e joias, tatuagens e suas',
  'posições, e qualquer adereço que apareça. Mesma pose, mesmo ângulo da cabeça e do',
  'tronco, mesmo enquadramento.',
].join('\n');

const TRAVAS = [
  /* TRAVA DE ÓCULOS — global, e não mais uma exceção por personagem. Dois de dois
     personagens com óculos marcante perderam o modelo para um Wayfarer preto de
     acetato: o Mandrake (Juliet) e o Chave (Oakley envolvente). Duas ocorrências na
     MESMA categoria é viés do modelo, não azar — ele tem um óculos default e recorre
     a ele sempre que não é contrariado. Como o blurb não é fonte confiável (o do
     Mandrake nem cita óculos), a trava vale para todos. */
  'ÓCULOS — o modelo erra sistematicamente aqui, preste atenção: reproduza a GEOMETRIA',
  'EXATA da armação que está na referência. Formato e curvatura da lente, se envolve o',
  'rosto ou é plano, espessura e material da haste, aro completo / meio-aro / sem aro,',
  'e a cor real da lente. NUNCA substitua por óculos retangular preto de acetato tipo',
  'Wayfarer — esse é o erro padrão. Armação fina de metal envolvente de esporte (tipo',
  'Oakley) tem de sair como armação fina de metal envolvente de esporte.',
  'NÃO acrescente NENHUM objeto que não esteja na referência — nem corrente, colar,',
  'brinco, arma, faca, cigarro nem objeto na mão. Se o enquadramento cortar o peito, o',
  'que fica de fora simplesmente não existe: não preencha.',
  'TRATE COR SATURADA COMO A COR REAL DO TECIDO, não como estilização a corrigir. Rosa',
  'é rosa, verde-limão é verde-limão. Não "amadureça" a paleta para tons realistas.',
  'NÃO acrescente texto, legenda, marca de água, logotipo inventado nem moldura.',
  'NÃO troque a etnia, o tipo físico, a idade aparente ou o gênero do personagem.',
  /* "Não troque a etnia" é categórico e não pegava a deriva GRADUAL: o Bombado saiu
     bem mais escuro do que o `skin: 0x8d5a3b` (pardo médio) que characters.js declara
     para ele. Tom de pele precisa ser tratado como VALOR a reproduzir, não como
     categoria a respeitar. */
  'TOM DE PELE: reproduza exatamente o da referência, sem clarear nem escurecer. Se a',
  'referência mostra pele parda média, o resultado é pele parda média — não mais clara,',
  'não mais escura. O mesmo vale para o gênero: o que estiver na referência é o que sai.',
].join('\n');

const PROMPTS = {
  /* ESCOLHIDO como padrão: o jogo é 3D estilizado, então retrato fotorrealista
     brigaria com o próprio personagem que aparece jogando na tela ao lado. */
  gamer: [
    'Render 3D de personagem de videogame AAA moderno, SEMI-REALISTA.',
    'NÃO é fotografia de pessoa real, e NÃO é desenho animado.', '', PRESERVAR, '',
    'O QUE MUDA — mais DENSIDADE DE DETALHE que o modelo de origem: malha de alta',
    'resolução no lugar do low-poly (nada de facetas chapadas nem silhueta poligonal),',
    'materiais PBR de verdade com mapa de normal e rugosidade, trama visível no tecido,',
    'costura e barra nas roupas, desgaste e sujeira sutis, metal com reflexo anisotrópico,',
    'tatuagens com traço nítido. Iluminação de game art: luz-chave direcional forte, luz',
    'de contorno separando o personagem do fundo, oclusão de ambiente nas dobras. Fundo',
    'escuro liso neutro.', '',
    /* Este bloco existe porque o dono reprovou "guru e doutora do SUS muito estilo
       Pixar". Citar Overwatch/Fortnite como alvo era parte do problema: os dois SÃO
       cartoon. O alvo certo não é outro jogo — é a arte que este jogo já publicou
       (public/img/wall-*.webp e loading-*.webp), que é semi-realista. */
    '@PROPORCAO@', '',
    TRAVAS,
  ].join('\n'),

  foto: [
    'Fotografia de retrato do personagem da imagem de referência.', '', PRESERVAR, '',
    'MUDE APENAS O MEIO: em vez de um render 3D estilizado, entregue uma fotografia feita',
    'com câmera real e lente de retrato. Pele com poros, pelos finos e dispersão',
    'subsuperficial; tecido com trama, costura e fiapos; metal com reflexo especular; couro',
    'e plástico com micro-riscos. Profundidade de campo rasa com o rosto em foco. Luz de',
    'estúdio contrastada vinda da esquerda, preenchimento suave à direita, recorte de luz na',
    'silhueta. Fundo liso escuro neutro, sem cenário.', '',
    TRAVAS,
  ].join('\n'),
};

/* MASCOTES — quem NÃO é gente, e por que isso precisa de um bloco próprio.
   A trava anti-Pixar ("proporção adulta real, olho de tamanho de gente, nada de
   expressão fofa") nasceu de o dono reprovar o guru e a doutora. Aplicada a estes
   quatro ela DESTRÓI o personagem: o Dollynho é uma garrafa de olho grande, e
   "realismo" nele vira monstro. A lista é a mesma de IK_L_SKIP em glbchars.js —
   "mascotes de braços-toco" —, que o repo já mantinha por outro motivo e que por
   acaso é exatamente o recorte de quem não é humano. */
const MASCOTES = new Set(['dollynho', 'gotinha', 'et', 'canarinho']);

const PROPORCAO_HUMANO = [
  'PROPORÇÃO E ROSTO — ponto mais importante:',
  'Adulto de proporções REAIS. Cabeça no tamanho de cabeça de gente, olhos no tamanho',
  'de olhos de gente, mandíbula e nariz definidos, pele com textura.',
  'PROIBIDO o visual de animação da Pixar / Disney / DreamWorks: nada de olhos enormes',
  'e brilhantes, nada de rosto redondo de bebê, nada de bochecha inflada, nada de nariz',
  'de botão, nada de pele plástica sem poro, nada de expressão fofa.',
  'A referência de estilo é a arte de capa DESTE jogo: personagem semi-realista de',
  'sátira urbana brasileira, com peso e presença — mais perto de GTA V ou Max Payne 3',
  'do que de filme de animação infantil.',
].join('\n');

const PROPORCAO_MASCOTE = [
  'PROPORÇÃO — ATENÇÃO: este personagem NÃO é uma pessoa. É um MASCOTE de marca, e a',
  'linguagem de desenho é a identidade dele, não um defeito a corrigir.',
  'MANTENHA a proporção caricata da referência: olhos grandes e expressivos, cabeça',
  'desproporcional, corpo simplificado, mãos de luva, expressão alegre. NÃO tente',
  'torná-lo realista, NÃO dê a ele rosto ou pele humana, NÃO corrija a anatomia.',
  'O que melhora é só o ACABAMENTO: superfície com material de verdade (plástico, vinil,',
  'pelo, borracha, conforme o caso), volume com iluminação de estúdio, oclusão nas',
  'dobras, brilho especular onde couber. Um mascote bem renderizado, não um humano.',
].join('\n');

/* DICAS POR PERSONAGEM — a lista de exceções, e ela existe por um motivo medido.
   O modelo não erra ao acaso: ele SUBSTITUI o item específico pelo genérico da
   categoria. Palhaço ganha casaco escuro de circo, médica perde a faixa de cabeça,
   e o Mandrake ganhou um Wayfarer no lugar da Juliet — que é justamente a peça que
   define o arquétipo. Enquadrar melhor resolveu omissão de peça grande (as
   ombreiras do palhaço voltaram); NÃO resolve esse viés, porque aqui o modelo tem
   a informação e escolhe "corrigir".
   A alavanca que funciona é NOMEAR o objeto: o modelo sabe o que é uma Oakley
   Juliet. Por isso a dica é uma linha curta e só para quem escorrega — descrever
   os 44 à mão traria de volta a chance de errar o personagem no texto.
   REGRA: só entra aqui item que já foi visto errado numa geração. Não é lugar de
   palpite preventivo. */
const DICAS = {
  mandrake: 'Os óculos são uma OAKLEY JULIET: armação de metal escovado envolvente, '
    + 'hastes com detalhe de parafuso, lente vermelha em duas peças curvas. NÃO é Wayfarer, '
    + 'NÃO é armação quadrada de acetato, NÃO é óculos redondo de metal fino.',
  doutora: 'Ela usa uma FAIXA/BANDANA na testa, sobre a linha do cabelo, presa por trás. '
    + 'Ela existe na referência e não pode sumir.',
  palhacomal: 'O casaco é ROSA-LILÁS claro, não vinho nem bordô. Mantenha o rosa como está '
    + 'na referência mesmo que pareça improvável para um palhaço sombrio.',
  /* A segunda referência (wall-9) trouxe o acabamento certo mas NÃO a idade: o modelo
     entregou um homem de ~40 com pescoço grosso onde a arte mostra um rapaz magro.
     Idade precisa ser dita, como tudo que o modelo decide sozinho quando calamos. */
  chave: 'Ele é JOVEM: entre 18 e 22 anos. Rosto fino e anguloso, queixo estreito, pescoço '
    + 'magro, corpo esguio de adolescente crescido. NÃO é um homem de meia-idade, NÃO tem '
    + 'pescoço grosso nem mandíbula larga, NÃO é musculoso. '
    + 'Os óculos são OAKLEY de esporte: armação fina, envolvente, lente escura curva que '
    + 'acompanha o rosto. NÃO é Wayfarer, NÃO é armação retangular grossa de acetato.',
  /* O dono mandou a arte clássica do mascote. Descrevo em vez de anexar arquivo porque
     a imagem veio no chat, não no repo — e insumo de gerador que só existe no histórico
     de uma conversa é insumo que ninguém regera. Se a arte entrar em public/, isto vira
     entrada em ARTE_OFICIAL e o texto sai. */
  /* O modelo entregou uma MULHER triste. O GLB é low-poly e a franja cobrindo o rosto
     dá margem para ler como quiser — então o gênero, que aqui não é opcional, precisa
     ser dito. Os três acessórios são do personagem e sumiram: sem eles ele vira
     "pessoa de preto", não o Emo. */
  emo: 'É um RAPAZ, homem jovem — NÃO é mulher. Magro, pele bem clara (o jogo declara '
    + 'skin 0xe6d3d0), cabelo preto liso com FRANJA COMPRIDA cobrindo um dos olhos. '
    + 'Ele usa, e os três precisam aparecer: MUNHEQUEIRA no pulso, COLAR DE BOLINHAS '
    + 'preto e branco no pescoço, e um PIERCING no rosto. Roupa toda preta. '
    + 'Expressão emburrada de adolescente, não expressão de tristeza feminina.',
  /* characters.js declara `skin: 0x8d5a3b` = rgb(141,90,59), pardo médio. O modelo
     escureceu por conta própria — é a deriva gradual que a trava categórica não pega. */
  /* Citar o hex (0x8d5a3b) não funcionou — o modelo não lê número, lê descrição.
     Trocado por referência visual concreta, que é como ele de fato ancora cor. */
  bombado: 'PELE PARDA CLARA, cor de caramelo tostado — o tom de um brasileiro moreno '
    + 'de praia, bem mais CLARO do que pele negra. Pense em pele bronzeada dourada, não '
    + 'em pele escura. Este ponto vem sendo errado: ele NÃO é negro, é pardo claro. '
    + 'Mantenha o contraste do corpo: peitoral e braços enormes com pernas finas, que é '
    + 'a piada do personagem.',
  dollynho: 'É o mascote clássico da Dolly: CORPO DE GARRAFA verde brilhante (o corpo é a '
    + 'garrafa, não uma pessoa vestida), com a tampinha branca de rosca no alto da cabeça '
    + 'como se fosse chapéu. Olhos grandes, redondos e alegres, com sobrancelhas finas e '
    + 'sorriso aberto mostrando os dentes. Luvas brancas de quatro dedos. Tênis vermelhos '
    + 'com sola branca. A palavra DOLLY em letras brancas inclinadas no peito. Braços e '
    + 'pernas finos e curtos saindo direto da garrafa. Verde vivo e saturado, superfície '
    + 'de plástico com brilho. Nada de rosto humano, nada de anatomia realista.',
};

/* ARTE OFICIAL — segunda referência, quando o personagem já tem key art publicada.
   O render do GLB responde "quem é, nesta pose"; o wallpaper responde "que idade e
   que acabamento". Nasceu do dono apontando que o Chave SP ficou velho demais: o
   GLB é low-poly e não carrega idade, mas wall-9.webp mostra o personagem jovem,
   de polo e boné, do jeito certo. Com as duas referências juntas o modelo tem as
   duas informações, e nenhuma delas precisa virar texto.
   A caixa de recorte foi medida na arte (1672x941): enquadra da cabeça à cintura.
   Só entra aqui personagem que TEM arte própria — hoje o Chave. */
const ARTE_OFICIAL = {
  chave: { arquivo: 'public/img/wall-9.webp', caixa: { left: 820, top: 100, width: 300, height: 420 } },
};

const ESTILO = arg('estilo', 'gamer');
if (!PROMPTS[ESTILO]) die(`--estilo desconhecido: ${ESTILO} (use gamer ou foto)`);
const PROMPT_BASE = PROMPTS[ESTILO];
const comDica = (id) => {
  /* O bloco de proporção é escolhido por personagem: humano leva a trava anti-Pixar,
     mascote leva o oposto. Um prompt só para os dois casos era o defeito — o mesmo
     texto que conserta a doutora estraga o Dollynho. */
  let p = PROMPT_BASE.replace('@PROPORCAO@', MASCOTES.has(id) ? PROPORCAO_MASCOTE : PROPORCAO_HUMANO);
  if (ARTE_OFICIAL[id]) {
    p += '\n\nDUAS REFERÊNCIAS. A PRIMEIRA imagem é o modelo 3D do jogo: dela vêm a POSE, o'
      + ' ENQUADRAMENTO e o ângulo. A SEGUNDA é a arte oficial deste personagem: dela vêm a'
      + ' IDADE APARENTE, o rosto, o tipo físico e o acabamento. Onde as duas discordarem'
      + ' sobre como ele É, mande a segunda; onde discordarem sobre como ele está POSICIONADO,'
      + ' mande a primeira.';
  }
  if (DICAS[id]) p += `\n\nATENÇÃO NESTE PERSONAGEM: ${DICAS[id]}`;
  return p;
};

mkdirSync(TMP, { recursive: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });

let feitos = 0, pulados = 0, falhas = 0;
for (const ID of IDS) {
  /* Sem --publicar, o gen-image grava em /tmp/gen-image (o --raw-only dele), NÃO em
     OUT. A checagem apontava para OUT nos dois casos, então "já existe, pulando"
     nunca disparava no modo cru e um `--todos` repetido regerava o elenco inteiro —
     44 imagens de crédito queimadas em silêncio. Agora cada modo olha onde de fato
     escreve. */
  const saida = PUBLICAR ? `${OUT}/${ID}-${ESTILO}.webp` : `/tmp/gen-image/${ID}-${ESTILO}.png`;
  if (!FORCAR && existsSync(saida)) { console.log(`· ${ID} já existe, pulando (use --forcar)`); pulados++; continue; }

  const ref = `${TMP}/${ID}-${SHOT}.png`;
  try {
    // 1. render fiel do modelo
    await page.goto(`${BASE}/charvideo.html?id=${encodeURIComponent(ID)}&bg=alpha&shot=${SHOT}&w=512&h=512`,
      { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.CHARVID && window.CHARVID.ready, null, { timeout: 120000 });
    const dataUrl = await page.evaluate(() => { window.CHARVID.reset(); return window.CHARVID.grab(); });
    writeFileSync(ref, Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
  } catch (e) {
    console.error(`✗ ${ID}: falhou no render — ${String(e.message || e).slice(0, 140)}`);
    falhas++; continue;
  }

  // 2. acabamento realista, com o render como referência
  /* A arte oficial entra como SEGUNDA referência, recortada na hora. O recorte não
     é publicado em public/: é insumo do gerador, e materializá-lo no repo criaria um
     arquivo que ninguém sabe regerar quando a arte mudar. */
  const refs = ['--ref', ref];
  const arte = ARTE_OFICIAL[ID];
  if (arte) {
    const corte = `${TMP}/${ID}-arte.png`;
    await sharp(arte.arquivo).extract(arte.caixa).png().toFile(corte);
    refs.push('--ref', corte);
  }
  const flags = ['tools/gen-image.mjs', '--id', `${ID}-${ESTILO}`, ...refs,
    '--model', MODEL, '--aspect', '1:1', '--prompt', comDica(ID)];
  if (PUBLICAR) flags.push('--out', OUT, '--crop', '1:1', '--w', '512');
  else flags.push('--raw-only');

  try {
    const saidaTxt = execFileSync('node', flags, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const linha = saidaTxt.trim().split('\n').filter((l) => l.includes('→') || l.includes('->')).pop() || saidaTxt.trim().split('\n').pop();
    console.log(`✓ ${ID}  ${linha.trim()}`);
    feitos++;
  } catch (e) {
    console.error(`✗ ${ID}: gen-image falhou — ${String(e.stderr || e.message).slice(0, 200)}`);
    falhas++;
  }
}

await browser.close();
console.log(`\n${feitos} gerado(s), ${pulados} pulado(s), ${falhas} falha(s).`);
console.log(PUBLICAR ? `publicados em ${OUT}/` : `crus em /tmp/gen-image/ (referências em ${TMP}/)`);
if (falhas) process.exit(1);
