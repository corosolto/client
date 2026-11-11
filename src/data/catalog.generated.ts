// Gerado de public/js/characters.js por scripts/site-catalog.mjs.
// Não edite: rode node scripts/site-catalog.mjs após alterar CHARACTERS.
import { FACTIONS } from '../../public/js/factions.js';

export interface Personagem {
  id: string;
  grupo: string;
  nome: string;
  blurb: string;
  passe?: { season: string; level: number };
}

export interface Grupo {
  id: string;
  nome: string;
  lema: string;
  cor: string;
  nota: string;
  art: string | null;
}

const CATALOG_CHARACTERS = [
  {"id":"esquerdomacho","grupoChave":"E","nome":"Esquerdomacho","blurb":"Barba, tote bag e 47 bottons. Mira acadêmica: analisa a treta antes de atirar."},
  {"id":"sindicato","grupoChave":"E","nome":"Líder do Sindicato","blurb":"Boné vermelho, colete de assembleia e megafone. Convoca greve de fogo a cada round."},
  {"id":"mst","grupoChave":"E","nome":"Líder do MST","blurb":"Do campo pra arena. Bandeira na mochila, bota no barro e tiro certeiro de enxada."},
  {"id":"doutora","grupoChave":"E","nome":"Doutora do SUS","blurb":"Jaleco, estetoscópio e plantão de 24h. Receita tiro certeiro, na veia."},
  {"id":"mistico","grupoChave":"E","nome":"Jovem Místico","blurb":"Faixa na testa, cristal no peito e aura calibrada. Só atira quando Mercúrio permite."},
  {"id":"caminhoneiro","grupoChave":"B","nome":"Caminhoneiro","blurb":"Camisa do Brasil, luva de estrada e 40h de BR na semana. Freia pra ninguém."},
  {"id":"sertanejo","grupoChave":"B","nome":"Cantor Sertanejo","blurb":"Chapéu de cowboy, fivela de ouro e violão nas costas. Moda de viola em dose dupla."},
  {"id":"coach","grupoChave":"B","nome":"Coach Quântico","blurb":"Blazer, headset e 47 técnicas de manifestação. Já venceu antes de começar - no quântico."},
  {"id":"gotinha","grupoChave":"E","nome":"Zé da Gotinha","blurb":"Mascote da saúde. Imuniza a treta com dose de reforço - e ainda pega o SUS de graça."},
  {"id":"farialimer","grupoChave":"B","nome":"Faria Limer","blurb":"Colete, sapatênis e planilha de day trade. Compra na baixa, atira na alta."},
  {"id":"bombado","grupoChave":"B","nome":"Bombado da Academia","blurb":"Peitoral gigante, perna de palito. Pulou o leg day pra treinar o gatilho."},
  {"id":"hipster","grupoChave":"E","nome":"Hipster Alternativo","blurb":"Moicano colorido e camiseta de banda que você não conhece. Já jogava isso antes de ser mainstream."},
  {"id":"dollynho","grupoChave":"B","nome":"Dollynho","blurb":"Mascote do guaraná polêmico. Efervescente, gelado e sempre do contra."},
  {"id":"et","grupoChave":"E","nome":"ET de Varginha","blurb":"Veio de longe pra treta. Abduz a direita e some no mato de Minas."},
  {"id":"ancap","grupoChave":"B","nome":"Ancap Medieval","blurb":"Cota de malha, cruz templária e capa verde-amarela. Privatiza a treta e xinga o Banco Central."},
  {"id":"canarinho","grupoChave":"B","nome":"Canarinho Pistola","blurb":"Pistola desde 2016. Bico torto, peito estufado e camisa 24: ele NÃO amarela."},
  {"id":"proerd","grupoChave":"B","nome":"Leão do Proerd","blurb":"Camisa preta colada, rugido de mascote de formatura e garra afiada na defesa da treta."},
  {"id":"bonzo","grupoChave":"palhacos","nome":"Bonzo","blurb":"Do picadeiro pra praça. Nariz vermelho, sapatão marrom e risada de quem arma o circo."},
  {"id":"palhacomal","grupoChave":"palhacos","nome":"Palhaço do Mal","blurb":"Riso que gela a espinha. Sai do picadeiro direto pro pesadelo - e ainda cobra ingresso."},
  {"id":"jozo","grupoChave":"palhacos","nome":"Jozo","blurb":"Mascote de lanche pirata. Fritou o juízo no óleo e agora só serve treta com batata."},
  {"id":"adjim","grupoChave":"palhacos","nome":"Adjim","blurb":"Espirra, ri e atira. Metade da dupla que faz a criançada chorar de rir (e de medo)."},
  {"id":"esbirro","grupoChave":"palhacos","nome":"Esbirro","blurb":"A outra metade da dupla. Buzina no gatilho e resenha no recuo."},
  {"id":"titica","grupoChave":"palhacos","nome":"Titica","blurb":"Do circo pro Congresso e do Congresso pra arena, sempre no bom humor e no gatilho leve."},
  {"id":"padati","grupoChave":"palhacos","nome":"Padati","blurb":"Um da dupla mais colorida do picadeiro. Cambalhota, buzina e mira infantil."},
  {"id":"padata","grupoChave":"palhacos","nome":"Padata","blurb":"O outro da dupla. Se um erra, o outro acerta - geralmente na risada."},
  {"id":"cadequinha","grupoChave":"palhacos","nome":"Cadequinha","blurb":"Clássico dos clássicos. Cartola, xadrez e uma gargalhada que atravessa gerações."},
  {"id":"emo","grupoChave":"urbanas","nome":"Emo","blurb":"Franja na cara e playlist de sofrência. Mira embaçada por um olho só."},
  {"id":"blackmetal","grupoChave":"urbanas","nome":"Black Metal","blurb":"Corpse paint, cabelão e blast beat. Congela a treta num inverno norueguês."},
  {"id":"metaleiro","grupoChave":"urbanas","nome":"Metaleiro","blurb":"Jaqueta jeans coberta de bottons e cabelo até a cintura. Headbang no recuo."},
  {"id":"punk","grupoChave":"urbanas","nome":"Punk","blurb":"Moicano colorido e jaqueta de spikes. Anarquia, três acordes e um tiro só."},
  {"id":"skatista","grupoChave":"urbanas","nome":"Skatista","blurb":"Gorro, camiseta larga e joelho ralado. Dropa a treta de flip."},
  {"id":"clubber","grupoChave":"urbanas","nome":"Clubber","blurb":"Regata neon e glowstick. Só atira no drop da batida."},
  {"id":"rapper","grupoChave":"urbanas","nome":"Rapper","blurb":"Camisão gigante, correntes de ouro e calça saggy. Rima e recarrega no flow."},
  {"id":"reggae","grupoChave":"urbanas","nome":"Rasta","blurb":"Dreads, gorro rastafári e paz interior. Só que armado. Jah guia a mira."},
  {"id":"pagodeiro","grupoChave":"urbanas","nome":"Pagodeiro","blurb":"Platinado, roupa toda branca e corrente de ouro. Canta o hit e acerta o tiro no refrão."},
  {"id":"mandrake","grupoChave":"funkeiros","nome":"Mandrake","blurb":"Boné, Juliet vermelho e corrente de ouro. Ostenta e domina na quebrada."},
  {"id":"raul","grupoChave":"funkeiros","nome":"Raul da Franja","blurb":"Franja açucarada, camisa de grife e cordão de ouro falso. Desfila antes de atirar."},
  {"id":"oakley","grupoChave":"funkeiros","nome":"Oakley","blurb":"Chapéu Medusa, colete tático e tattoo no braço. O corre só passa por ele."},
  {"id":"criarj","grupoChave":"funkeiros","nome":"Cria RJ","blurb":"Cabelo zebrado platinado e camisa de time. Cria do morro, mira de craque."},
  {"id":"chave","grupoChave":"funkeiros","nome":"Chave SP","blurb":"Polo, boné e óculos escuros. Só entra na treta se for chave."},
  {"id":"funkraiz","grupoChave":"funkeiros","nome":"Funk Raiz","blurb":"Tamborzão na cabeça e passinho no recuo. O funk mais velho da arena."},
  {"id":"trapfunk","grupoChave":"funkeiros","nome":"Trap Funk","blurb":"Autotune no grito de guerra e 808 no peito. Trap em dose dupla."},
  {"id":"fluxo","grupoChave":"funkeiros","nome":"Fluxo","blurb":"Óculos espelhado e corte na régua. No fluxo, quem corre é a bala."},
  {"id":"ostentacao","grupoChave":"funkeiros","nome":"Ostentação","blurb":"Corrente, anel e relógio brilhando. Se é pra atirar, que seja com estilo."},
  {"id":"lobisomem","grupoChave":"miticos","nome":"Lobisomem","blurb":"Sétimo filho, maldição da encruzilhada. O lobo preto acorda forte, dentuço e sem coleira."},
  {"id":"mariabonita","grupoChave":"mitico","nome":"Maria Bonita","blurb":"Cangaceira de precisão. Parou, mirou, acertou - a rainha do primeiro tiro."},
  {"id":"lampiao","grupoChave":"mitico","nome":"Lampião","blurb":"Cangaço no gatilho. Quanto mais segura o tiro, mais dano faz - Virgem Maria!"},
  {"id":"bandeirante","grupoChave":"mitico","nome":"Bandeirante","blurb":"Caçador de pegadas. Vê onde o inimigo pisou - o vilão que o time tolera."},
  {"id":"boto","grupoChave":"mitico","nome":"Boto Cor de Rosa","blurb":"Golfinho rosa do Amazonas. Sai da cobertura, encanta a mira inimiga e responde de Deagle."},
  {"id":"zumbi","grupoChave":"mitico","nome":"Zumbi dos Palmares","blurb":"Capitão quilombola. O grito de Palmares ecoa e acelera a recarga dos aliados."},
  {"id":"curupira","grupoChave":"mitico","nome":"Curupira","blurb":"Menino de cabelo de fogo, pés virados. As pegadas apontam pro lado errado."},
  {"id":"saci","grupoChave":"mitico","nome":"Saci-Pererê","blurb":"Moleque de uma perna só. Redemoinho de fumaça e some - o gorro vermelho é hitbox."},
  {"id":"caipora","grupoChave":"mitico","nome":"Caipora","blurb":"Guardiã da mata, cabelo de fogo e pintura de guerra. Quem caça demais vira caça."},
  {"id":"barbudo","grupoChave":"P","nome":"Barbudo do Planalto","blurb":"Discurso de três horas e o microfone nunca cansa. Faixa no peito, churrasco no domingo."},
  {"id":"capitao","grupoChave":"P","nome":"Capitão do Cercadinho","blurb":"Camisa amarela, cercadinho lotado e live toda quinta. Não leva desaforo pra casa."},
  {"id":"dama","grupoChave":"P","nome":"Dama da Mandioca","blurb":"Estoca vento e saúda a mandioca. Ninguém entende a frase, todo mundo lembra."},
  {"id":"professor","grupoChave":"P","nome":"Professor do Arcabouço","blurb":"Calcula o arcabouço de cabeça e ainda acha tempo de explicar a conta pro time."},
  {"id":"senador","grupoChave":"P","nome":"Zero Um","blurb":"O 01 da família. Sorriso de campanha e broche sempre no lugar."},
  {"id":"ministro","grupoChave":"P","nome":"Xandão da Toga","blurb":"A toga é capa e o despacho sai antes do café. Joga pelo Time E e ninguém discute."},
  {"id":"deputado","grupoChave":"P","nome":"Deputado da Peruca","blurb":"Sobe na tribuna de peruca loira e vira meme antes de terminar a frase."},
  {"id":"juiz","grupoChave":"P","nome":"Juiz do Conje","blurb":"Ex-juiz de sotaque marcado. O conje confirma: ele não perde um prazo."},
  {"id":"julia-zanatta","grupoChave":"P","nome":"Deputada da Tiara","blurb":"Tiara de flores, blazer fúcsia e presença de plenário. A treta começa com pose e termina no placar."},
  {"id":"marina-silva","grupoChave":"P","nome":"Dona Floresta","blurb":"Óculos vinho, coque grisalho e vestido verde-petróleo. A conversa é calma; a mira, firme."},
  {"id":"capitao-caveira","grupoChave":"fora-do-ar","nome":"Capitão Caveira","blurb":"Boina, uniforme preto e um sinal que não aceita rendição. A ronda da madrugada chegou.","passe":{"season":"sessao-da-treta-s1","level":1}},
  {"id":"teletreco-sinal-fraco","grupoChave":"fora-do-ar","nome":"Teletreco Sinal Fraco","blurb":"Antena de papel-alumínio e chiado na orelha. Só pega sinal quando a treta começa.","passe":{"season":"sessao-da-treta-s1","level":1}},
  {"id":"bebe-reborn","grupoChave":"fora-do-ar","nome":"Bebê Reborn","blurb":"Saiu da vitrine depois do fechamento. O chorinho agora vem com eco de fita velha.","passe":{"season":"sessao-da-treta-s1","level":2}},
  {"id":"chupa-cabra","grupoChave":"fora-do-ar","nome":"Chupa-Cabra","blurb":"Lenda do interior com fome de mistério. Ninguém acredita até ouvir o mato mexer.","passe":{"season":"sessao-da-treta-s1","level":2}},
  {"id":"teletreco-antenao","grupoChave":"fora-do-ar","nome":"Teletreco Antenão","blurb":"Antena alta, ouvido atento e sintonia duvidosa. Capta a treta antes do comercial.","passe":{"season":"sessao-da-treta-s1","level":3}},
  {"id":"assombracao-lanhouse","grupoChave":"fora-do-ar","nome":"Assombração da Lan House","blurb":"Travou na última partida da lan house. Voltou do monitor cobrando a hora extra.","passe":{"season":"sessao-da-treta-s1","level":3}},
  {"id":"dracula","grupoChave":"fora-do-ar","nome":"Drácula","blurb":"Saiu do romance de 1897 direto para a sessão da madrugada. Prefere sombra, capa e mira fria.","passe":{"season":"sessao-da-treta-s1","level":4}},
  {"id":"boneca-da-cristaleira","grupoChave":"fora-do-ar","nome":"Boneca da Cristaleira","blurb":"Vestido de domingo e olhos de porcelana. Muda de prateleira quando a câmera pisca.","passe":{"season":"sessao-da-treta-s1","level":4}},
  {"id":"satanista-talkshow","grupoChave":"fora-do-ar","nome":"Satanista de Talk Show","blurb":"Convidado da madrugada, figurino escuro e conversa atravessada. Nunca espera o intervalo.","passe":{"season":"sessao-da-treta-s1","level":5}},
  {"id":"clovis-fora-do-ar","grupoChave":"fora-do-ar","nome":"Clóvis Fora do Ar","blurb":"O bate-bola saiu do carnaval e entrou na fita errada. A máscara sorri, mas a sintonia não volta.","passe":{"season":"sessao-da-treta-s1","level":5}},
  {"id":"teletreco-chiadinho","grupoChave":"fora-do-ar","nome":"Teletreco Chiadinho","blurb":"Pequeno, elétrico e cheio de interferência. Onde ele passa, a programação vira chuvisco.","passe":{"season":"sessao-da-treta-s1","level":6}},
  {"id":"bicho-do-bueiro","grupoChave":"fora-do-ar","nome":"Bicho do Bueiro","blurb":"Subiu da galeria quando a rua ficou quieta. Carrega a lenda que o bairro evita contar.","passe":{"season":"sessao-da-treta-s1","level":6}},
  {"id":"coronel-arrego","grupoChave":"fora-do-ar","nome":"Coronel do Arrego","blurb":"Quepe, pose de autoridade e recibo que ninguém encontra. A transmissão caiu bem na auditoria.","passe":{"season":"sessao-da-treta-s1","level":7}},
  {"id":"sorridente-onibus","grupoChave":"fora-do-ar","nome":"Sorridente do Último Ônibus","blurb":"Embarcou no último ônibus e não pediu parada. O sorriso continua no reflexo do vidro.","passe":{"season":"sessao-da-treta-s1","level":7}},
  {"id":"bebezao-de-feira","grupoChave":"fora-do-ar","nome":"Bebezão de Feira","blurb":"Bonecão de feira, passo pesado e risada de gravação gasta. O expediente só começa à noite.","passe":{"season":"sessao-da-treta-s1","level":8}},
  {"id":"boneco-falante-87","grupoChave":"fora-do-ar","nome":"Boneco Falante 87","blurb":"Ficou guardado desde 87 e decorou todas as fitas. Agora responde antes da pergunta.","passe":{"season":"sessao-da-treta-s1","level":8}},
  {"id":"padre-parapsicologo","grupoChave":"fora-do-ar","nome":"Padre Parapsicólogo","blurb":"Batina, gravador e uma explicação para tudo. Só não explica quem ligou a TV sozinha.","passe":{"season":"sessao-da-treta-s1","level":9}},
  {"id":"muro-de-caco","grupoChave":"fora-do-ar","nome":"Muro de Caco","blurb":"Carrega a cara das histórias de quintal. O bairro inteiro conhece, mas ninguém viu de perto.","passe":{"season":"sessao-da-treta-s1","level":9}},
  {"id":"teletreco-fora-do-ar","grupoChave":"fora-do-ar","nome":"Teletreco Fora-do-Ar","blurb":"A última antena da madrugada. Quando ele aparece, não sobra nem aviso de manutenção.","passe":{"season":"sessao-da-treta-s1","level":10}},
  {"id":"coelho-pascoa-shopping","grupoChave":"fora-do-ar","nome":"Coelho da Páscoa do Shopping","blurb":"O shopping fechou e esqueceram o mascote. Ele ainda espera a próxima foto de família.","passe":{"season":"sessao-da-treta-s1","level":10}},
  {"id":"pm-arrego","grupoChave":"fora-do-ar","nome":"PM do Arrego","blurb":"Farda sem corporação, rádio sem frequência e um plantão muito mal explicado.","passe":{"season":"sessao-da-treta-s1","level":11}},
  {"id":"nanica","grupoChave":"fora-do-ar","nome":"Nanica","blurb":"Silhueta pequena, presença enorme. Cabe em qualquer canto que a câmera deixou de vigiar.","passe":{"season":"sessao-da-treta-s1","level":11}},
  {"id":"roqueiro-mistico-70","grupoChave":"fora-do-ar","nome":"Roqueiro Místico dos 70","blurb":"Cabelo comprido, roupa de época e uma fita que toca ao contrário. O solo virou assombração.","passe":{"season":"sessao-da-treta-s1","level":12}},
  {"id":"profeta-auditorio","grupoChave":"fora-do-ar","nome":"Profeta de Auditório","blurb":"Promete resposta depois dos comerciais. O auditório foi embora, mas ele continua ao vivo.","passe":{"season":"sessao-da-treta-s1","level":12}},
  {"id":"bicheiro-barracao","grupoChave":"fora-do-ar","nome":"Bicheiro do Barracão","blurb":"Aposta no silêncio do barracão e conhece cada corredor. A banca não fecha nem fora do ar.","passe":{"season":"sessao-da-treta-s1","level":13}},
  {"id":"prata","grupoChave":"fora-do-ar","nome":"Prata","blurb":"Brilho frio de madrugada e um olhar que a fita não consegue apagar.","passe":{"season":"sessao-da-treta-s1","level":13}},
  {"id":"dom-pedro-i","grupoChave":"fora-do-ar","nome":"Dom Pedro I","blurb":"Traje de época e pose de quadro histórico. Saiu da moldura para disputar a própria transmissão.","passe":{"season":"sessao-da-treta-s1","level":14}},
  {"id":"tiradentes","grupoChave":"fora-do-ar","nome":"Tiradentes","blurb":"Figura histórica em uma sessão que atravessa séculos. A memória entrou na arena sem pedir licença.","passe":{"season":"sessao-da-treta-s1","level":14}},
  {"id":"corisco","grupoChave":"fora-do-ar","nome":"Corisco","blurb":"Chapéu de couro e silhueta do cangaço histórico. A madrugada não consegue tirar o sertão do ar.","passe":{"season":"sessao-da-treta-s1","level":15}},
  {"id":"vlad","grupoChave":"fora-do-ar","nome":"Vlad, o Empalador","blurb":"Traje histórico, bigode longo e olhar de retrato antigo. Sem cenas de violência: só a tensão da madrugada.","passe":{"season":"sessao-da-treta-s1","level":15}},
] as const;

const grupoId = (key: string) =>
  FACTIONS.find((f) => f.catalogId === key || f.id === key || f.slug === key)?.catalogId || key;

export const PERSONAGENS: Personagem[] = Object.freeze(CATALOG_CHARACTERS.map((character) => ({
  id: character.id,
  grupo: grupoId(character.grupoChave),
  nome: character.nome,
  blurb: character.blurb,
  ...(character.passe ? { passe: character.passe } : {}),
})));

const POLITICAL_GROUP: Grupo = {
  id: 'P',
  nome: 'Políticos',
  lema: 'A treta atravessa os dois lados!',
  cor: '#d6b55a',
  nota: 'Caricaturas satíricas de figuras públicas. Na escalação do menu, é o primeiro grupo.',
  art: null,
};

const factionGroups = FACTIONS
  .filter((f) => f.ready && PERSONAGENS.some((character) => character.grupo === f.catalogId))
  .map((f): Grupo => ({
    id: f.catalogId,
    nome: f.catalogName,
    lema: f.slogan,
    cor: f.color,
    nota: f.description,
    art: f.art || null,
  }));

const politicalPosition = factionGroups.findIndex((group) => group.id === 'B');
if (politicalPosition < 0) factionGroups.unshift(POLITICAL_GROUP);
else factionGroups.splice(politicalPosition + 1, 0, POLITICAL_GROUP);

export const GRUPOS: Grupo[] = Object.freeze(factionGroups);
export const capaDoGrupo = (id: string) => {
  const art = GRUPOS.find((group) => group.id === id)?.art;
  return art ? `/img/faccoes/${art}.webp` : null;
};
