import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cards = JSON.parse(fs.readFileSync(path.join(root, 'cards.json')));
const tokens = JSON.parse(fs.readFileSync(path.join(root, 'tokens.json')));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'exports/MANIFEST.json')));
const channels = ['x', 'tiktok', 'instagram', 'youtube'];
const calendar = [
  [11, 0, 'Como entrar na primeira partida?', 'Abra o CORO SOLTO, escolha seu personagem e entre na partida.'],
  [12, 1, 'Quem você escolhe?', 'Canarinho Pistola no menu. Qual personagem você escolhe pra treta?'],
  [13, 2, 'Onde acontece a treta?', 'Esse é o Velho Oeste do CORO SOLTO. Escolha o mapa pra sua próxima partida.'],
  [14, 4, 'Como reportar o que quebrou?', 'Testa uma partida. Achou um bug? Manda mapa, navegador e passos no Feedback do jogo.'],
  [15, 3, 'Por onde um dev começa?', 'CORO SOLTO tem o código aberto. Comece pelo CONTRIBUTING.md e teste o jogo antes de escolher uma mudança.'],
  [16, 0, 'Dá pra testar no navegador?', 'CORO SOLTO é grátis no navegador. Escolha personagem e mapa e teste uma partida.'],
  [17, 1, 'Quem voltou pra jogar?', 'Voltando pra treta? Escolha um personagem pra próxima partida e conte qual levou.'],
  [18, 2, 'Qual cenário você quer testar?', 'O casario do Velho Oeste virou cenário de partida. Testa o mapa e conta como foi.'],
  [19, 4, 'O que ajuda a corrigir um bug?', 'Um bug que dá pra repetir ajuda a consertar o jogo. Conte o que fez, em qual mapa e navegador.'],
  [20, 3, 'Como contribuir sem um PR?', 'Quer ajudar o CORO SOLTO? Teste uma partida e abra uma issue com passos pra reproduzir o que quebrou.'],
  [21, 0, 'Qual vai ser a próxima partida?', 'A próxima partida pode ser agora. Escolha personagem e mapa no CORO SOLTO.'],
  [22, 2, 'Qual mapa merece outro teste?', 'Volta ao Velho Oeste e testa outra partida. Depois conta qual canto do mapa deu mais trabalho.'],
  [23, 1, 'Qual personagem entrou na sua partida?', 'Canarinho tá no card. Qual personagem entrou na sua partida? Escolha o seu no jogo.'],
  [24, 4, 'Como trazer alguém pra testar?', 'Mande o link do CORO SOLTO pra alguém que curte FPS de navegador. Depois contem como foi o teste.'],
  [25, 0, 'Como continuar depois de outubro?', 'A treta continua. Jogue CORO SOLTO no navegador e acompanhe os próximos testes do projeto.'],
  [12, 5, 'Barbudo do Planalto na sua partida?', 'Barbudo do Planalto entrou na treta. Escolha sua caricatura no CORO SOLTO.'],
  [17, 6, 'Capitão do Cercadinho na sua partida?', 'Capitão do Cercadinho entrou na treta. Escolha sua caricatura no CORO SOLTO.'],
  [23, 7, 'Barbudo ou Capitão?', 'Barbudo do Planalto ou Capitão do Cercadinho? Escolha seu personagem no CORO SOLTO.']
];
const campaign = card => `outubro2026_${card.id.replaceAll('-', '_')}`;
function link(card, channel) {
  const u = new URL(tokens.site);
  u.searchParams.set('utm_source', channel);
  u.searchParams.set('utm_medium', 'organic_social');
  u.searchParams.set('utm_campaign', campaign(card));
  return u.href;
}
const rows = [];
for (const [day, cardIndex, question, hook] of calendar) {
  const card = cards[cardIndex];
  for (const channel of channels) {
    const format = channel === 'x' || channel === 'youtube' ? 'landscape' : 'feed';
    const asset = manifest.files.find(f => f.file === `exports/${card.id}-${format}.png`);
    const url = link(card, channel);
    let caption = card.captions[channel].replaceAll('{url}', url);
    if (channel === 'x') caption = `${hook} ${card.destination === 'code' ? 'Código no menu Sobre o jogo. ' : ''}${url}`;
    else if (channel === 'instagram') caption = `${hook}\n\n${card.kind === 'map' || card.kind === 'dev' ? 'Imagem: captura WebGL do jogo de 06/09/2026.\n' : ''}${card.destination === 'code' ? 'Abra o jogo pelo link do perfil. O código fica no menu Sobre o jogo.' : 'Jogo grátis no link do perfil.'} #CoroSolto ${card.kind === 'dev' ? '#GameDevBrasil' : '#JogoBrasileiro'}`;
    else if (channel === 'tiktok') caption = `${hook} ${card.destination === 'code' ? 'Jogo no link do perfil. Código no menu Sobre o jogo.' : 'Jogo grátis no link do perfil.'} ${card.kind === 'map' || card.kind === 'dev' ? 'Captura do jogo de 06/09/2026.' : ''} #CoroSolto`;
    else caption = `${question}\n\n${caption}`;
    const sourceNote = card.kind === 'political' ? 'Variantes estilizadas com image_gen a partir dos personagens existentes; fonte/prompts em SOURCES.json e GENERATION-PROMPTS.md. Alternativa da mesma data, publicação depende do dono.' : card.kind === 'map' || card.kind === 'dev' ? 'Captura histórica real de 06/09/2026; não afirma cenário atual.' : 'Procedência em SOURCES.json; revisão de conteúdo e destino antes de publicar.';
    rows.push({ id: `2026-10-${day}-${channel}${card.kind === 'political' ? '-' + card.id : ''}`, ...(card.kind === 'political' ? { alternativeTo: `2026-10-${day}-${channel}` } : {}), date: `2026-10-${day}`, channel, account: '@corosolto', cardId: card.id, question, caption, alt: card.alt, asset: asset.file, assetSha256: asset.sha256, profileAsset: `exports/${card.id}-story.png`, url, campaign: campaign(card), attribution: 'first-touch por navegador; não mede retorno atribuível nem clique seguinte no repo', placement: ['instagram', 'tiktok'].includes(channel) ? 'Revisar link do perfil para esta peça antes de postar; não presumir link clicável na legenda.' : 'Link na legenda; confirmar suporte na superfície escolhida.', status: 'awaiting_owner_approval', sourceNote });
  }
}
for (const day of [15, 20, 24]) {
  const card = cards[day === 24 ? 4 : 3];
  const asset = manifest.files.find(f => f.file === `exports/${card.id}-landscape.png`);
  rows.push({ id: `2026-10-${day}-linkedin`, date: `2026-10-${day}`, channel: 'linkedin', account: 'Ruben Marcus (pessoal)', cardId: card.id, question: 'Como um dev ajuda a testar o jogo?', caption: card.captions.linkedin.replaceAll('{url}', link(card, 'linkedin')), alt: card.alt, asset: asset.file, assetSha256: asset.sha256, url: link(card, 'linkedin'), campaign: campaign(card), attribution: 'first-touch por navegador; não mede retorno atribuível nem clique seguinte no repo', placement: 'Post pessoal; audiência informada pelo dono não foi auditada nem aparece na copy.', status: 'awaiting_owner_approval', sourceNote: 'Alegações técnicas verificadas na fonte. Sem métricas privadas.' });
}
fs.writeFileSync(path.join(root, 'QUEUE.json'), JSON.stringify({ campaignWindow: '2026-10-11/2026-10-25', timezone: 'Europe/Lisbon', publication: 'manual_after_owner_approval', rows }, null, 2) + '\n');
let captions = '# Legendas e destinos para revisão\n\nFontes: cards.json, SOURCES.json e fila QUEUE.json. Cada variante responde a uma pergunta; horários de postagem serão decididos após aprovação. TikTok/Instagram usam peças estáticas ou carrossel, com link do perfil conferido. YouTube: card/community quando disponível; Shorts aguardam vídeo da mídia.\n\n';
for (const card of cards) {
  captions += `## ${card.id}\n\n`;
  for (const [channel, copy] of Object.entries(card.captions)) captions += `### ${channel}\n\n${copy.replaceAll('{url}', link(card, channel))}\n\n`;
}
fs.writeFileSync(path.join(root, 'CAPTIONS.md'), captions);
console.log(`Fila local gerada: ${rows.length} rascunhos de canal, 15 datas com alternativas políticas. Sem agenda instalada.`);
