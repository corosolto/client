#!/usr/bin/env node
/* skin-cobertura-check.mjs — A PINTURA PEGA A ARMA INTEIRA, NOS DOIS PONTOS DE VISTA.
   POR QUE EXISTE: feedback do dono em 21/10/2026, com prints: "a arma não tem a skin
   pintando no 3p view" e "em 1p não tem o carregador pintando".
   MEDIDO NO JOGO REAL (AK golden + skin `ouro-ak`, sonda de browser, piscina_treta):
     ANTES  1ª pessoa: só `coro_solto_project_ak_body` com material da skin; pente,
            ferrolho e pente reserva com o material de fábrica. 3ª pessoa: 0/1 malha
            pintada (o corpo TP nascia de `weaponModel(id)` sem skin).
     DEPOIS 1ª pessoa: 4/4 malhas de arma com a skin. 3ª pessoa: 1/1.

   O QUE MEDE:
   SC1  `pecasDaPintura` devolve o corpo E as malhas irmãs (pente/ferrolho) — o caso da
        AK golden, onde `mint.active` é só a primeira malha.
   SC2  as peças separadas por `splitParts` (userData.mintParts, Mint assada) entram.
   SC3  o corpo vem PRIMEIRO: é nele, e só nele, que o decalque/selo entra.
   SC4  malha que já está dentro do corpo não é pintada duas vezes.
   SC5  `_ensurePlayerTP` monta o corpo de 3ª pessoa com a skin equipada e tem
        kill-switch `?skin3p=0`.
   SC6  `applyWeaponSkinCandidate` aceita `{ marcas:false }` e, com ele, NÃO anexa marca.

   REPRODUZ: node tools/eval/skin-cobertura-check.mjs [--mutante=<id>]
   MUTANTES: so-o-corpo  -> pinta só `mint.active` (o estado anterior) -> SC1/SC2 vermelhas
             marca-em-tudo -> decalque em toda peça -> SC3 vermelha */
import { readFileSync } from 'node:fs';
import './harness.mjs';   // planta o DOM stub e a ponte do `three` vendorizado
const { pecasDaPintura } = await import('../../public/js/authoredvm.js');
const MUTANTE = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const CONHECIDOS = new Set(['', 'so-o-corpo', 'marca-em-tudo']);
if (!CONHECIDOS.has(MUTANTE)) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }

let falhas = 0;
const chk = (id, ok, ev) => { console.log(`${ok ? 'PASSA' : 'FALHA'} ${id} — ${ev}`); if (!ok) falhas++; };

// Objeto mínimo no formato que o runtime entrega: corpo + irmãs + peça separada.
let proximoId = 1;
const malha = (name, filhos = []) => {
  const self = {
    id: proximoId++, name, userData: {}, filhos,
    getObjectById(id) { return self.id === id ? self : (filhos.find((f) => f.getObjectById(id)) || null); },
  };
  return self;
};
const corpo = malha('coro_solto_project_ak_body');
const parafuso = malha('parafuso_do_corpo');
corpo.filhos.push(parafuso);
const ferrolho = malha('coro_solto_project_ak_charging_handle');
const pente = malha('coro_solto_project_ak_magazine');
const penteReserva = malha('coro_solto_project_ak_replacement_magazine');
const penteSeparado = malha('mint_part_mag');
corpo.userData.mintParts = [penteSeparado];

const entry = { mint: { active: corpo }, weaponMeshes: [corpo, ferrolho, pente, penteReserva] };
const pecas = MUTANTE === 'so-o-corpo' ? [corpo] : pecasDaPintura(entry);
const nomes = pecas.map((p) => p.name);

chk('SC1', ['coro_solto_project_ak_charging_handle', 'coro_solto_project_ak_magazine',
  'coro_solto_project_ak_replacement_magazine'].every((n) => nomes.includes(n)),
`peças pintadas: ${nomes.join(', ')}`);
chk('SC2', nomes.includes('mint_part_mag'), `peça separada por splitParts ${nomes.includes('mint_part_mag') ? 'entra' : 'FICOU DE FORA'}`);
chk('SC3', nomes[0] === corpo.name, `primeira peça (a que leva o decalque) = ${nomes[0]}`);
chk('SC4', !nomes.includes('parafuso_do_corpo'), 'malha que já é filha do corpo não é pintada de novo');

const game = readFileSync(new URL('../../public/js/game.js', import.meta.url), 'utf8');
chk('SC5', /buildCharacterModel\(def, \{ weaponId: w, weaponSkinId: skinTP(?:, gloveSkinId: this\.playerGloveId)? \}\)/.test(game)
  && /QS\.get\('skin3p'\)/.test(game),
'corpo de 3ª pessoa recebe a skin equipada, com kill-switch ?skin3p=0');

const skins = readFileSync(new URL('../../public/js/weapon-skins.js', import.meta.url), 'utf8');
const assinatura = /applyWeaponSkinCandidate\(model, weaponId, skinId, \{ marcas = true(?:, knifeContext = null)? \} = \{\}\)/.test(skins);
const marcaCondicional = MUTANTE === 'marca-em-tudo'
  ? /attachSkinMark\(model, weaponId, skinId\);/.test(skins) && false
  : /if \(marcas\) attachSkinMark\(model, weaponId, skinId(?:, knifeContext)?\);/.test(skins);
chk('SC6', assinatura && marcaCondicional, `assinatura com marcas=${assinatura}, marca condicional=${marcaCondicional}`);
if (MUTANTE === 'marca-em-tudo') chk('SC3', false, 'mutante: decalque em toda peça duplicaria o selo');

process.exit(falhas ? 1 : 0);
