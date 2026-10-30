/* Texturas procedurais da Invasão dos Javaporcos. Os hex vêm da amostragem de pixel das
   referências de arte (docs/maps/invasao-javaporcos-visual.md §3), não de escolha a olho. */
import * as THREE from 'three';
import { registerDetail, detailFor } from './textures.js';

export const COR = Object.freeze({
  asfalto: '#868581', remendo: '#4a4846', calcada: '#9e9b95', bloquete: '#97807a',
  rebocoOcre: '#cea978', rebocoMenta: '#a8bfaa', rebocoRosa: '#c9a39b', rebocoPalha: '#d8c892',
  bloco: '#a19f9a', telha: '#9a6348', fibrocimento: '#8d887c', zinco: '#946c54',
  terra: '#5a5045', matoSeco: '#825c2e', folhagem: '#1c2d1b', folhagemClara: '#2d4425',
  casca: '#4a3b2e', cacamba: '#b85828', lixeira: '#19233f', saco: '#1b1a19',
  caixote: '#7f4527', toldoA: '#5e86a8', toldoB: '#6f9a62', toldoC: '#b06a5e', toldoListra: '#e6ddcf',
});

const lcg = (s) => () => ((s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296);

/* Toda textura nasce do MESMO caminho: canvas, detalhe (normal+roughness derivados) e
   `repeat`. Em node o contexto 2D é mudo e a imagem sai branca — a régua só cobra `map`. */
function tela(nome, lado, rx, ry, desenho, forca = 1.6) {
  const c = document.createElement('canvas');
  c.width = c.height = lado;
  desenho(c.getContext('2d'), lado, lcg(0x9e3779 ^ (nome.length * 2654435761)));
  const t = new THREE.CanvasTexture(c);
  t.name = nome;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  registerDetail(t, c, forca, 0.72, 0.99);
  detailFor(t);
  return t;
}

const grao = (x, s, n, cores, a, r) => {
  for (let i = 0; i < n; i++) {
    x.fillStyle = cores[(r() * cores.length) | 0];
    x.globalAlpha = a;
    x.fillRect(r() * s, r() * s, 1 + r() * 3, 1 + r() * 3);
  }
  x.globalAlpha = 1;
};

export function asfaltoTex(rx = 1, ry = 1) {
  return tela('jp-asfalto', 256, rx, ry, (x, s, r) => {
    x.fillStyle = '#5f5e5b'; x.fillRect(0, 0, s, s);
    // agregado: é o grão do asfalto que dá a leitura de pista e não de areia lavada
    for (let i = 0; i < 5200; i++) {
      const v = r();
      x.fillStyle = v > 0.82 ? '#8d8b86' : v > 0.5 ? '#6e6d69' : '#4c4b49';
      x.fillRect(r() * s, r() * s, 1 + r() * 1.6, 1 + r() * 1.6);
    }
    for (let i = 0; i < 4; i++) {
      x.globalAlpha = 0.3 + r() * 0.25; x.fillStyle = COR.remendo;
      x.beginPath();
      const px = r() * s, py = r() * s, w = 14 + r() * 34, h = 10 + r() * 26;
      x.ellipse(px, py, w, h, r() * 3, 0, 6.283); x.fill();
    }
    x.globalAlpha = 1;
    for (let i = 0; i < 34; i++) {
      x.fillStyle = '#393836'; x.beginPath();
      x.ellipse(r() * s, r() * s, 1.5 + r() * 3.5, 1.5 + r() * 3, r() * 3, 0, 6.283); x.fill();
    }
    x.strokeStyle = '#4a4947'; x.lineWidth = 1.6;
    for (let i = 0; i < 7; i++) {
      x.beginPath(); x.moveTo(r() * s, 0);
      x.bezierCurveTo(r() * s, s / 3, r() * s, 2 * s / 3, r() * s, s); x.stroke();
    }
  }, 2.2);
}

export function calcadaTex(rx = 1, ry = 1) {
  return tela('jp-calcada', 256, rx, ry, (x, s, r) => {
    x.fillStyle = COR.calcada; x.fillRect(0, 0, s, s);
    grao(x, s, 1400, ['#8f8c86', '#aba89f'], 0.5, r);
    x.strokeStyle = '#7d7a75'; x.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      x.beginPath(); x.moveTo(i * s / 4, 0); x.lineTo(i * s / 4, s); x.stroke();
      x.beginPath(); x.moveTo(0, i * s / 4); x.lineTo(s, i * s / 4); x.stroke();
    }
    x.strokeStyle = COR.matoSeco; x.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const u = ((r() * 4) | 0) * s / 4, v = r() * s;
      x.beginPath(); x.moveTo(u, v); x.lineTo(u + (r() - 0.5) * 6, v + 8 + r() * 10); x.stroke();
    }
    x.strokeStyle = '#6e6b66'; x.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const u = r() * s, v = r() * s;
      x.beginPath(); x.moveTo(u, v); x.lineTo(u + 20 + r() * 30, v + (r() - 0.5) * 24); x.stroke();
    }
  });
}

export function bloqueteTex(rx = 1, ry = 1) {
  return tela('jp-bloquete', 256, rx, ry, (x, s, r) => {
    x.fillStyle = '#6d5a55'; x.fillRect(0, 0, s, s);
    for (let linha = 0; linha < 8; linha++) for (let col = 0; col < 8; col++) {
      const desloca = linha % 2 ? 16 : 0;
      const v = 0.86 + r() * 0.28;
      x.fillStyle = `rgb(${(151 * v) | 0},${(128 * v) | 0},${(122 * v) | 0})`;
      x.fillRect(col * 32 + desloca - 32, linha * 32 + 2, 28, 28);
      x.fillRect(col * 32 + desloca, linha * 32 + 2, 28, 28);
    }
    grao(x, s, 900, ['#8a736d', '#a68d85'], 0.35, r);
  });
}

export function rebocoTex(cor, semente = 1, rx = 1, ry = 1) {
  return tela(`jp-reboco-${semente}`, 256, rx, ry, (x, s, r) => {
    x.fillStyle = cor; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 9; i++) {
      x.globalAlpha = 0.10 + r() * 0.14; x.fillStyle = i % 2 ? '#ffffff' : '#000000';
      x.beginPath(); x.ellipse(r() * s, r() * s, 24 + r() * 60, 18 + r() * 50, r() * 3, 0, 6.283); x.fill();
    }
    x.globalAlpha = 1;
    const umidade = x.createLinearGradient(0, s, 0, s * 0.62);
    umidade.addColorStop(0, 'rgba(60,52,42,0.46)'); umidade.addColorStop(1, 'rgba(60,52,42,0)');
    x.fillStyle = umidade; x.fillRect(0, s * 0.62, s, s * 0.38);
    for (let i = 0; i < 5; i++) {
      x.globalAlpha = 0.5; x.fillStyle = COR.bloco;
      x.beginPath();
      const px = r() * s, py = r() * s * 0.8;
      x.moveTo(px, py);
      for (let k = 1; k < 7; k++) x.lineTo(px + Math.cos(k) * (8 + r() * 22), py + Math.sin(k * 1.7) * (6 + r() * 18));
      x.closePath(); x.fill();
    }
    x.globalAlpha = 1;
    grao(x, s, 700, ['#ffffff', '#000000'], 0.07, r);
  });
}

export function blocoTex(rx = 1, ry = 1) {
  return tela('jp-bloco', 256, rx, ry, (x, s, r) => {
    x.fillStyle = '#8d8b86'; x.fillRect(0, 0, s, s);
    for (let linha = 0; linha < 6; linha++) for (let col = 0; col < 4; col++) {
      const desloca = linha % 2 ? 32 : 0;
      const v = 0.9 + r() * 0.2;
      x.fillStyle = `rgb(${(161 * v) | 0},${(159 * v) | 0},${(154 * v) | 0})`;
      x.fillRect(col * 64 + desloca - 64 + 3, linha * 42 + 3, 58, 36);
      x.fillRect(col * 64 + desloca + 3, linha * 42 + 3, 58, 36);
    }
    grao(x, s, 1100, ['#7e7c78', '#b0aea8'], 0.35, r);
  });
}

export function telhaTex(rx = 1, ry = 1) {
  return tela('jp-telha', 256, rx, ry, (x, s, r) => {
    x.fillStyle = '#7d4f3a'; x.fillRect(0, 0, s, s);
    for (let linha = 0; linha < 8; linha++) {
      for (let col = 0; col < 16; col++) {
        const v = 0.82 + r() * 0.36;
        x.fillStyle = `rgb(${(154 * v) | 0},${(99 * v) | 0},${(72 * v) | 0})`;
        x.beginPath();
        x.ellipse(col * 16 + (linha % 2 ? 8 : 0), linha * 32 + 16, 8.5, 17, 0, 0, 6.283);
        x.fill();
      }
      x.fillStyle = 'rgba(40,24,18,0.45)'; x.fillRect(0, linha * 32, s, 3);
    }
    x.globalAlpha = 0.3;
    for (let i = 0; i < 10; i++) { x.fillStyle = '#5c6b4a'; x.beginPath(); x.ellipse(r() * s, r() * s, 6 + r() * 14, 4 + r() * 9, 0, 0, 6.283); x.fill(); }
    x.globalAlpha = 1;
  }, 2.6);
}

export function fibrocimentoTex(rx = 1, ry = 1) {
  return tela('jp-fibrocimento', 256, rx, ry, (x, s, r) => {
    x.fillStyle = COR.fibrocimento; x.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 16) {
      const g = x.createLinearGradient(i, 0, i + 16, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.30)'); g.addColorStop(0.5, 'rgba(255,255,255,0.16)');
      g.addColorStop(1, 'rgba(0,0,0,0.30)');
      x.fillStyle = g; x.fillRect(i, 0, 16, s);
    }
    x.globalAlpha = 0.22;
    for (let i = 0; i < 14; i++) { x.fillStyle = '#5f6a4e'; x.beginPath(); x.ellipse(r() * s, r() * s, 8 + r() * 18, 5 + r() * 12, 0, 0, 6.283); x.fill(); }
    x.globalAlpha = 1;
  }, 2.8);
}

export function zincoTex(rx = 1, ry = 1) {
  return tela('jp-zinco', 256, rx, ry, (x, s, r) => {
    x.fillStyle = '#8a8276'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 10) { x.fillStyle = i % 20 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.10)'; x.fillRect(i, 0, 10, s); }
    for (let i = 0; i < 24; i++) {
      x.globalAlpha = 0.25 + r() * 0.5; x.fillStyle = COR.zinco;
      x.beginPath(); x.ellipse(r() * s, r() * s, 6 + r() * 26, 5 + r() * 20, r() * 3, 0, 6.283); x.fill();
    }
    x.globalAlpha = 1;
  }, 2.4);
}

export function terraTex(rx = 1, ry = 1) {
  return tela('jp-terra', 256, rx, ry, (x, s, r) => {
    x.fillStyle = COR.terra; x.fillRect(0, 0, s, s);
    grao(x, s, 3000, ['#4b423a', '#6b6053', '#3f372f'], 0.6, r);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = '#726758'; x.beginPath();
      x.ellipse(r() * s, r() * s, 2 + r() * 5, 2 + r() * 4, r() * 3, 0, 6.283); x.fill();
    }
    x.strokeStyle = '#453d35'; x.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(r() * s, r() * s); x.lineTo(r() * s, r() * s); x.stroke(); }
  }, 2.0);
}

export function gramaTex(rx = 1, ry = 1) {
  return tela('jp-grama', 256, rx, ry, (x, s, r) => {
    x.fillStyle = '#35421f'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const v = r();
      x.strokeStyle = v > 0.72 ? COR.matoSeco : v > 0.35 ? '#46562a' : '#2a3618';
      x.lineWidth = 1 + r();
      const px = r() * s, py = r() * s;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 5, py - 3 - r() * 7); x.stroke();
    }
    for (let i = 0; i < 16; i++) {
      x.globalAlpha = 0.3; x.fillStyle = '#20290f';
      x.beginPath(); x.ellipse(r() * s, r() * s, 14 + r() * 40, 10 + r() * 30, 0, 0, 6.283); x.fill();
    }
    x.globalAlpha = 1;
  }, 1.4);
}

export function folhagemTex(cor, semente = 1, rx = 1, ry = 1) {
  return tela(`jp-folhagem-${semente}`, 128, rx, ry, (x, s, r) => {
    x.fillStyle = cor; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 420; i++) {
      const v = 0.7 + r() * 0.7;
      x.fillStyle = `rgba(${(60 * v) | 0},${(92 * v) | 0},${(44 * v) | 0},0.75)`;
      x.beginPath();
      x.ellipse(r() * s, r() * s, 2 + r() * 7, 1 + r() * 3, r() * 3.14, 0, 6.283); x.fill();
    }
    x.globalAlpha = 0.35;
    for (let i = 0; i < 24; i++) { x.fillStyle = '#0d150c'; x.beginPath(); x.ellipse(r() * s, r() * s, 6 + r() * 18, 5 + r() * 14, 0, 0, 6.283); x.fill(); }
    x.globalAlpha = 1;
  }, 1.1);
}

export function cascaTex(rx = 1, ry = 1) {
  return tela('jp-casca', 128, rx, ry, (x, s, r) => {
    x.fillStyle = COR.casca; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 160; i++) {
      x.strokeStyle = r() > 0.5 ? '#3a2e24' : '#5f4d3b';
      x.lineWidth = 1 + r() * 3;
      const px = r() * s;
      x.beginPath(); x.moveTo(px, 0);
      for (let y = 0; y < s; y += 16) x.lineTo(px + (r() - 0.5) * 7, y);
      x.stroke();
    }
    x.globalAlpha = 0.3;
    for (let i = 0; i < 18; i++) { x.fillStyle = '#5d6b43'; x.beginPath(); x.ellipse(r() * s, r() * s, 4 + r() * 10, 3 + r() * 8, 0, 0, 6.283); x.fill(); }
    x.globalAlpha = 1;
  }, 3.0);
}

export function madeiraTex(rx = 1, ry = 1) {
  return tela('jp-madeira', 128, rx, ry, (x, s, r) => {
    x.fillStyle = '#7b5a3c'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      x.strokeStyle = r() > 0.5 ? '#6a4c32' : '#8d6b49'; x.lineWidth = 1 + r() * 2;
      const py = r() * s;
      x.beginPath(); x.moveTo(0, py);
      for (let u = 0; u < s; u += 16) x.lineTo(u, py + (r() - 0.5) * 4);
      x.stroke();
    }
    for (let i = 0; i < 4; i++) { x.fillStyle = '#5a4028'; x.beginPath(); x.ellipse(r() * s, r() * s, 3 + r() * 4, 2 + r() * 3, 0, 0, 6.283); x.fill(); }
  }, 2.2);
}

export function ceramicaTex(rx = 1, ry = 1) {
  return tela('jp-ceramica', 256, rx, ry, (x, s, r) => {
    x.fillStyle = '#8f8c85'; x.fillRect(0, 0, s, s);
    for (let linha = 0; linha < 8; linha++) for (let col = 0; col < 8; col++) {
      const v = 0.93 + r() * 0.14;
      x.fillStyle = `rgb(${(158 * v) | 0},${(155 * v) | 0},${(149 * v) | 0})`;
      x.fillRect(col * 32 + 2, linha * 32 + 2, 28, 28);
    }
    x.globalAlpha = 0.25;
    for (let i = 0; i < 24; i++) { x.fillStyle = '#5b574f'; x.beginPath(); x.ellipse(r() * s, r() * s, 3 + r() * 10, 3 + r() * 8, 0, 0, 6.283); x.fill(); }
    x.globalAlpha = 1;
  });
}

export function toldoTex(cor, semente = 1, rx = 1, ry = 1) {
  return tela(`jp-toldo-${semente}`, 128, rx, ry, (x, s, r) => {
    for (let i = 0; i < s; i += 16) { x.fillStyle = (i / 16) % 2 ? cor : COR.toldoListra; x.fillRect(i, 0, 16, s); }
    x.globalAlpha = 0.22;
    for (let i = 0; i < 12; i++) { x.fillStyle = '#3a3128'; x.beginPath(); x.ellipse(r() * s, r() * s, 5 + r() * 14, 4 + r() * 10, 0, 0, 6.283); x.fill(); }
    x.globalAlpha = 1;
  }, 1.0);
}

export function lataTex(cor, semente = 1, rx = 1, ry = 1) {
  return tela(`jp-lata-${semente}`, 128, rx, ry, (x, s, r) => {
    x.fillStyle = cor; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 28; i++) {
      x.globalAlpha = 0.2 + r() * 0.45; x.fillStyle = r() > 0.5 ? '#6b4a32' : '#2b2622';
      x.beginPath(); x.ellipse(r() * s, r() * s, 3 + r() * 14, 2 + r() * 11, r() * 3, 0, 6.283); x.fill();
    }
    x.globalAlpha = 1;
    x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 2;
    for (let i = 16; i < s; i += 32) { x.beginPath(); x.moveTo(0, i); x.lineTo(s, i); x.stroke(); }
  }, 2.0);
}

/* Tufo de capim em QUAD com alpha: sem recorte o plano vira retângulo de papelão em pé,
   que é exatamente a leitura de "lowpoly" que o dono reprovou. */
export function capimTex(rx = 1, ry = 1) {
  return tela('jp-capim', 128, rx, ry, (x, s, r) => {
    x.clearRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      const base = 8 + r() * (s - 16), alt = s * (0.45 + r() * 0.5);
      const curva = (r() - 0.5) * 22;
      x.strokeStyle = r() > 0.68 ? COR.matoSeco : r() > 0.3 ? '#4a5c29' : '#32401b';
      x.lineWidth = 1.5 + r() * 2.5;
      x.beginPath();
      x.moveTo(base, s);
      x.quadraticCurveTo(base + curva * 0.5, s - alt * 0.55, base + curva, s - alt);
      x.stroke();
    }
  }, 0.8);
}

/* Chão do pasto: braquiária verde com manchas secas, touceira escura e terra exposta. A
   variação grande vem da cor por vértice da malha; aqui é a escala de palmo. */
export function pastoTex(rx = 1, ry = 1) {
  return tela('jp-pasto', 512, rx, ry, (x, s, r) => {
    x.fillStyle = '#3d4a22'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      x.globalAlpha = 0.18 + r() * 0.2; x.fillStyle = r() > 0.5 ? '#6b6a2e' : '#26331a';
      x.beginPath(); x.ellipse(r() * s, r() * s, 20 + r() * 70, 14 + r() * 50, r() * 3, 0, 6.283); x.fill();
    }
    for (let i = 0; i < 9; i++) {
      x.globalAlpha = 0.35; x.fillStyle = '#5a4a36';
      x.beginPath(); x.ellipse(r() * s, r() * s, 4 + r() * 12, 3 + r() * 9, r() * 3, 0, 6.283); x.fill();
    }
    x.globalAlpha = 1;
    for (let i = 0; i < 9000; i++) {
      const v = r();
      x.strokeStyle = v > 0.8 ? '#8c7a42' : v > 0.55 ? '#5d6b2c' : v > 0.25 ? '#46561f' : '#2b3a17';
      x.lineWidth = 0.8 + r() * 1.2;
      const px = r() * s, py = r() * s;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 6, py - 2 - r() * 6); x.stroke();
    }
  }, 1.5);
}

/* Lâmina de pasto em cartão: muitas folhas finas, curvas, com ponta seca. */
export function capimPastoTex(rx = 1, ry = 1) {
  return tela('jp-capim-pasto', 256, rx, ry, (x, s, r) => {
    x.clearRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      const base = 4 + r() * (s - 8), alt = s * (0.35 + r() * 0.62);
      const curva = (r() - 0.5) * 60;
      const v = r();
      x.strokeStyle = v > 0.78 ? '#c4b46e' : v > 0.45 ? '#86a243' : v > 0.18 ? '#6a8a33' : '#55722a';
      x.lineWidth = 1 + r() * 2.2;
      x.beginPath(); x.moveTo(base, s);
      x.quadraticCurveTo(base + curva * 0.3, s - alt * 0.6, base + curva, s - alt); x.stroke();
    }
  }, 0.8);
}

/* Touceira de capim-colonião: folha longa arqueada e a panícula de semente no topo. */
export function capimAltoTex(rx = 1, ry = 1) {
  return tela('jp-capim-alto', 256, rx, ry, (x, s, r) => {
    x.clearRect(0, 0, s, s);
    const meio = s / 2;
    for (let i = 0; i < 150; i++) {
      const base = meio + (r() - 0.5) * s * 0.35, alt = s * (0.55 + r() * 0.43);
      const curva = (r() - 0.5) * s * 0.8;
      const v = r();
      x.strokeStyle = v > 0.7 ? '#c9b47a' : v > 0.35 ? '#8aa648' : '#62822f';
      x.lineWidth = 1.5 + r() * 2.5;
      x.beginPath(); x.moveTo(base, s);
      x.quadraticCurveTo(base + curva * 0.2, s - alt * 0.7, base + curva, s - alt * (0.8 + r() * 0.2)); x.stroke();
    }
    for (let i = 0; i < 14; i++) {
      const px = meio + (r() - 0.5) * s * 0.6, py = s * (0.04 + r() * 0.2);
      x.strokeStyle = '#b39a66'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(px, py + s * 0.18); x.lineTo(px + (r() - 0.5) * 8, py); x.stroke();
      for (let k = 0; k < 10; k++) {
        x.fillStyle = r() > 0.5 ? '#c4ad78' : '#8f7a4c';
        x.fillRect(px + (r() - 0.5) * 10, py + r() * s * 0.16, 2, 3);
      }
    }
  }, 0.8);
}

/* Reboco de fundo de casa: a pintura descasca em ilhas e mostra o tijolo, a base fica
   preta de umidade e a chuva escorre do beiral. É a parede do beco da referência. */
export function rebocoDescascadoTex(cor, semente = 1, rx = 1, ry = 1) {
  return tela(`jp-reboco-desc-${semente}`, 512, rx, ry, (x, s, r) => {
    x.fillStyle = cor; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 14; i++) {
      x.globalAlpha = 0.08 + r() * 0.14; x.fillStyle = i % 3 ? '#2e2a22' : '#ffffff';
      x.beginPath(); x.ellipse(r() * s, r() * s, 30 + r() * 90, 20 + r() * 70, r() * 3, 0, 6.283); x.fill();
    }
    x.globalAlpha = 1;
    for (let i = 0; i < 7; i++) {
      const px = r() * s, py = r() * s, rw = 30 + r() * 70, rh = 20 + r() * 50;
      x.save(); x.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * 6.283, f = 0.6 + r() * 0.5;
        x.lineTo(px + Math.cos(a) * rw * f, py + Math.sin(a) * rh * f);
      }
      x.closePath(); x.fillStyle = '#8f8574'; x.fill(); x.clip();
      for (let ly = py - rh; ly < py + rh; ly += 11) for (let lx = px - rw - ((ly / 11) % 2) * 12; lx < px + rw; lx += 24) {
        const v = 0.8 + r() * 0.35;
        x.fillStyle = `rgb(${(150 * v) | 0},${(82 * v) | 0},${(56 * v) | 0})`;
        x.fillRect(lx, ly, 21, 8);
      }
      x.restore();
      x.strokeStyle = 'rgba(40,34,28,0.55)'; x.lineWidth = 1.5; x.stroke();
    }
    const umidade = x.createLinearGradient(0, s, 0, s * 0.7);
    umidade.addColorStop(0, 'rgba(34,36,26,0.7)'); umidade.addColorStop(1, 'rgba(34,36,26,0)');
    x.fillStyle = umidade; x.fillRect(0, s * 0.7, s, s * 0.3);
    for (let i = 0; i < 22; i++) {
      const px = r() * s, comp = s * (0.15 + r() * 0.5);
      const g = x.createLinearGradient(0, 0, 0, comp);
      g.addColorStop(0, 'rgba(40,36,30,0.32)'); g.addColorStop(1, 'rgba(40,36,30,0)');
      x.fillStyle = g; x.fillRect(px, 0, 2 + r() * 7, comp);
    }
    grao(x, s, 2200, ['#ffffff', '#000000', '#6b5d48'], 0.08, r);
  }, 2.0);
}

/* Cimentado de beco: junta de dilatação a cada metro, rachadura ramificada, mancha de
   umidade em polígono irregular (nada de elipse) e agregado aparente. */
export function cimentoTex(rx = 1, ry = 1) {
  return tela('jp-cimento', 512, rx, ry, (x, s, r) => {
    x.fillStyle = '#7d786f'; x.fillRect(0, 0, s, s);
    grao(x, s, 9000, ['#6a665e', '#8e8a81', '#5c5851', '#9a958a'], 0.45, r);
    for (let i = 0; i < 9; i++) {
      const cx = r() * s, cy = r() * s, raio = 30 + r() * 90;
      for (let camada = 0; camada < 4; camada++) {
        x.globalAlpha = 0.07 + r() * 0.06; x.fillStyle = r() > 0.4 ? '#3c3a34' : '#56584a';
        x.beginPath();
        for (let k = 0; k < 14; k++) { const a = (k / 14) * 6.283, f = (0.55 + r() * 0.6) * (1 - camada * 0.18); x.lineTo(cx + Math.cos(a) * raio * f, cy + Math.sin(a) * raio * f * 0.7); }
        x.closePath(); x.fill();
      }
    }
    x.globalAlpha = 1;
    for (const p of [0, s / 2]) {
      x.fillStyle = 'rgba(40,38,34,0.75)'; x.fillRect(p, 0, 3, s); x.fillRect(0, p, s, 3);
      for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(48,45,40,0.6)'; x.fillRect(p - 2 + r() * 4, r() * s, 2 + r() * 4, 2 + r() * 6); x.fillRect(r() * s, p - 2 + r() * 4, 2 + r() * 6, 2 + r() * 4); }
    }
    const racha = (px, py, n, w) => {
      x.lineWidth = w; x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < n; k++) {
        px += (r() - 0.5) * 40; py += (r() - 0.5) * 40; x.lineTo(px, py);
        if (w > 0.8 && r() < 0.25) { x.stroke(); racha(px, py, 3, w * 0.6); x.beginPath(); x.moveTo(px, py); x.lineWidth = w; }
      }
      x.stroke();
    };
    x.strokeStyle = '#2e2b27';
    for (let i = 0; i < 7; i++) racha(r() * s, r() * s, 8, 1.6);
    x.strokeStyle = 'rgba(200,194,182,0.25)';
    for (let i = 0; i < 5; i++) racha(r() * s, r() * s, 5, 1);
  }, 2.6);
}

/* Tecido de roupa no varal: trama clara; a cor de cada peça vem da instância. */
export function tecidoTex(rx = 1, ry = 1) {
  return tela('jp-tecido', 64, rx, ry, (x, s, r) => {
    x.fillStyle = '#e6e2da'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 2) { x.fillStyle = 'rgba(0,0,0,0.05)'; x.fillRect(0, i, s, 1); x.fillRect(i, 0, 1, s); }
    for (let i = 0; i < 6; i++) { x.globalAlpha = 0.12; x.fillStyle = '#3a3128'; x.fillRect(0, r() * s, s, 2 + r() * 4); }
    x.globalAlpha = 1;
  }, 0.6);
}

/* Interior da janela atrás do vidro: cortina franzida (cor vem da instância), fresta do
   cômodo, bandô no alto e um reflexo diagonal. Sem ele o vidro lia buraco preto (L* 6). */
let _janela = null;
export function janelaTex() {
  if (_janela) return _janela;
  const s = 256, c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d'), r = lcg(0x1a7e1a);
  const fundo = x.createRadialGradient(s * 0.5, s * 0.45, 8, s * 0.5, s * 0.5, s * 0.7);
  fundo.addColorStop(0, '#9a8c7c'); fundo.addColorStop(1, '#4a423a');
  x.fillStyle = fundo; x.fillRect(0, 0, s, s);
  // dobra de largura sorteada a cada volta: com passo fixo (~57 px) o franzido casava com a grade
  const painel = (x0, x1, franzido) => {
    let fase = 0, passo = franzido * (0.55 + 0.9 * r());
    for (let px = x0; px < x1; px += 2) {
      const volta = Math.floor(fase / 6.283);
      fase += 2 * passo;
      if (Math.floor(fase / 6.283) !== volta) passo = franzido * (0.55 + 0.9 * r());
      const dobra = 0.5 + 0.5 * Math.sin(fase);
      const v = 120 + dobra * 22 + r() * 6;
      x.fillStyle = `rgb(${v | 0},${(v * 0.97) | 0},${(v * 0.92) | 0})`;
      x.fillRect(px, s * 0.12, 2, s * (0.86 + 0.03 * Math.sin(px * 0.07)));
    }
  };
  painel(0, s * (0.34 + r() * 0.08), 0.11);
  painel(s * (0.6 + r() * 0.08), s, 0.09);
  x.fillStyle = '#8a8276'; x.fillRect(0, 0, s, s * 0.13);
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(40,34,28,0.35)'; x.fillRect(0, s * 0.02 + i * 5, s, 1.5); }
  x.globalAlpha = 0.16; x.fillStyle = '#ffffff';
  x.beginPath(); x.moveTo(s * 0.1, s); x.lineTo(s * 0.45, 0); x.lineTo(s * 0.62, 0); x.lineTo(s * 0.27, s); x.fill();
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.name = 'jp-janela-interior'; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (_janela = t);
}

/* Recorte de mancha (alpha com borda rasgada) para o pisoteio da trilha não ler quadrado. */
export function manchaAlphaTex() {
  const s = 128, c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d'), r = lcg(0x51a7);
  const g = x.createRadialGradient(s / 2, s / 2, s * 0.12, s / 2, s / 2, s * 0.5);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#9a9a9a'); g.addColorStop(1, '#000000');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    x.fillStyle = r() > 0.5 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.35)';
    x.beginPath(); x.arc(r() * s, r() * s, 1 + r() * 6, 0, 6.283); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.name = 'jp-mancha-alpha';
  return t;
}

/* PBR do Poly Haven (cor/normal/rugosidade) só no navegador; em node fica a procedural.
   `metros` finge o tamanho da imagem antes do load: a UV por mundo das caixas (vao.js) usa. */
const NAVEGADOR = typeof location !== 'undefined' && /^https?:/.test(location.protocol || '');
export function pbr(id, { repeat = 1, metros = 0 } = {}) {
  if (!NAVEGADOR) return null;
  const canal = (nome, srgb) => {
    const t = new THREE.TextureLoader().load(`/img/textures/pbr_${id}_${nome}.webp`);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 8;
    t.name = `pbr-${id}-${nome}`;
    if (metros) t.image = { width: metros * 128, height: metros * 128 };
    return t;
  };
  return { map: canal('color', true), normalMap: canal('normal', false), roughnessMap: canal('rough', false) };
}

/* Atlas de decalque 4×4 (célula 256): poça, óleo, papel, lata, comida, folha, sacola, barro,
   faixa branca, faixa amarela, remendo, rachadura e duas pichações de parede. */
export const DECAL_CELULAS = 14;
export function decalAtlasTex() {
  const W = 1024, H = 1024, C = 256;
  const cor = document.createElement('canvas'), rug = document.createElement('canvas');
  cor.width = rug.width = W; cor.height = rug.height = H;
  const x = cor.getContext('2d'), g = rug.getContext('2d'), r = lcg(0xdeca1);
  g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, W, H);
  const mancha = (cx, cy, raio, pontas, f = 0.35) => {
    x.beginPath();
    for (let k = 0; k <= pontas; k++) {
      const a = (k / pontas) * 6.283, rr = raio * (1 - f / 2 + r() * f);
      x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8);
    }
    x.closePath();
  };
  const papel = (cx, cy, w, h, c) => {
    x.save(); x.translate(cx, cy); x.rotate(r() * 6.283); x.fillStyle = c;
    x.beginPath(); x.moveTo(-w / 2, -h / 2);
    for (let k = 0; k < 6; k++) x.lineTo(-w / 2 + (k / 5) * w + (r() - 0.5) * 4, -h / 2 + (r() - 0.5) * 5);
    x.lineTo(w / 2, h / 2); x.lineTo(-w / 2 + (r() - 0.5) * 6, h / 2 + (r() - 0.5) * 5); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 1; x.stroke(); x.restore();
  };
  for (let k = 0; k < DECAL_CELULAS; k++) {
    const ox = (k % 4) * C, oy = ((k / 4) | 0) * C, cx = ox + C / 2, cy = oy + C / 2;
    x.save(); x.beginPath(); x.rect(ox + 4, oy + 4, C - 8, C - 8); x.clip();
    if (k === 0) {
      const gr = x.createRadialGradient(cx, cy, 10, cx, cy, 112);
      gr.addColorStop(0, 'rgba(58,60,62,0.8)'); gr.addColorStop(0.75, 'rgba(52,50,46,0.6)'); gr.addColorStop(1, 'rgba(52,50,46,0)');
      x.fillStyle = gr; mancha(cx, cy, 108, 22, 0.45); x.fill();
      g.fillStyle = '#141414'; g.fillRect(ox, oy, C, C);
    } else if (k === 1) {
      for (let i = 0; i < 5; i++) { x.fillStyle = `rgba(30,27,24,${0.12 + i * 0.07})`; mancha(cx + (r() - 0.5) * 20, cy + (r() - 0.5) * 20, 100 - i * 17, 18, 0.5); x.fill(); }
      g.fillStyle = '#6a6a6a'; g.fillRect(ox, oy, C, C);
    } else if (k === 2) {
      for (let i = 0; i < 9; i++) papel(ox + 40 + r() * 176, oy + 40 + r() * 176, 30 + r() * 46, 22 + r() * 34, ['#a29b8a', '#948c7a', '#8a9096', '#9c8e5a', '#968078', '#aca698'][(r() * 6) | 0]);
    } else if (k === 3) {
      for (let i = 0; i < 4; i++) {
        const px = ox + 50 + r() * 156, py = oy + 50 + r() * 156, a = r() * 6.283;
        x.save(); x.translate(px, py); x.rotate(a);
        x.fillStyle = ['#8a3a30', '#9e9b94', '#38563c', '#a88a3a'][i]; x.fillRect(-22, -11, 44, 22);
        x.fillStyle = 'rgba(255,255,255,0.3)'; x.fillRect(-22, -6, 44, 3);
        x.fillStyle = 'rgba(30,26,22,0.45)'; x.fillRect(-22, 5, 44, 6);
        x.fillStyle = '#7e7c76'; x.fillRect(18, -11, 5, 22); x.restore();
      }
      x.save(); x.translate(cx, cy + 40); x.rotate(r() * 3);
      x.fillStyle = 'rgba(140,160,150,0.7)'; x.fillRect(-55, -14, 95, 28); x.fillRect(40, -6, 18, 12);
      x.fillStyle = '#8e3a2e'; x.fillRect(-20, -14, 30, 28); x.restore();
      g.fillStyle = '#707070'; g.fillRect(ox, oy, C, C);
    } else if (k === 4) {
      for (let i = 0; i < 26; i++) {
        x.fillStyle = ['#5e6a2a', '#9a6a32', '#a8944e', '#4a3422', '#7e3a2a', '#b0a888'][(r() * 6) | 0];
        x.beginPath(); x.ellipse(ox + 30 + r() * 196, oy + 30 + r() * 196, 5 + r() * 16, 3 + r() * 8, r() * 3, 0, 6.283); x.fill();
      }
      x.fillStyle = '#b89a3a'; x.beginPath(); x.ellipse(cx, cy, 46, 12, 0.6, 0, 6.283); x.fill();
    } else if (k === 5) {
      for (let i = 0; i < 30; i++) {
        x.save(); x.translate(ox + 24 + r() * 208, oy + 24 + r() * 208); x.rotate(r() * 6.283);
        x.fillStyle = ['#6a4a26', '#8a6232', '#4a3a22', '#7a7030'][(r() * 4) | 0];
        x.beginPath(); x.ellipse(0, 0, 14 + r() * 10, 6 + r() * 4, 0, 0, 6.283); x.fill();
        x.strokeStyle = 'rgba(30,20,10,0.6)'; x.beginPath(); x.moveTo(-16, 0); x.lineTo(16, 0); x.stroke(); x.restore();
      }
    } else if (k === 6) {
      x.fillStyle = 'rgba(200,198,190,0.85)'; mancha(cx - 20, cy, 70, 14, 0.7); x.fill();
      x.fillStyle = 'rgba(70,96,130,0.85)'; mancha(cx + 50, cy + 40, 46, 12, 0.7); x.fill();
      x.strokeStyle = 'rgba(120,120,120,0.6)'; x.lineWidth = 2;
      for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(cx - 70 + r() * 80, cy - 40 + r() * 80); x.lineTo(cx - 40 + r() * 90, cy - 30 + r() * 70); x.stroke(); }
      g.fillStyle = '#909090'; g.fillRect(ox, oy, C, C);
    } else if (k === 7) {
      for (let i = 0; i < 4; i++) { x.fillStyle = `rgba(78,62,44,${0.15 + i * 0.12})`; mancha(cx, cy, 104 - i * 20, 26, 0.6); x.fill(); }
      for (let i = 0; i < 120; i++) { x.fillStyle = r() > 0.5 ? 'rgba(50,40,30,0.7)' : 'rgba(110,92,70,0.7)'; x.fillRect(ox + 30 + r() * 196, oy + 30 + r() * 196, 2 + r() * 5, 2 + r() * 5); }
    } else if (k === 8 || k === 9) {
      x.fillStyle = k === 8 ? 'rgba(236,234,226,0.9)' : 'rgba(206,168,62,0.85)'; x.fillRect(ox + 6, oy + 6, C - 12, C - 12);
      x.globalCompositeOperation = 'destination-out';
      /* A célula estica ~5× no comprimento da faixa: lasca e desgaste nascem achatados
         no V (eixo comprido), senão viram veio de tábua (desvio 4,0 × 7,0 medido). */
      for (let i = 0; i < 140; i++) { const a = 2 + r() * 10; x.globalAlpha = 0.25 + r() * 0.6; x.beginPath(); x.ellipse(ox + r() * C, oy + r() * C, a, a * (0.15 + r() * 0.15), 0, 0, 6.283); x.fill(); }
      for (let i = 0; i < 40; i++) { x.globalAlpha = 0.5; x.fillRect(ox + r() * C, oy + r() * C, 10 + r() * 30, 2 + r() * 4); }
      x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      g.fillStyle = '#a0a0a0'; g.fillRect(ox, oy, C, C);
    } else if (k === 10) {
      x.fillStyle = 'rgba(48,47,45,0.75)'; x.beginPath();
      for (let q = 0; q < 16; q++) { const a = (q / 16) * 6.283; x.lineTo(cx + Math.cos(a) * (96 + r() * 18), cy + Math.sin(a) * (90 + r() * 18)); }
      x.closePath(); x.fill();
      for (let i = 0; i < 160; i++) { x.fillStyle = r() > 0.5 ? 'rgba(30,30,30,0.5)' : 'rgba(110,108,104,0.45)'; x.fillRect(ox + 40 + r() * 176, oy + 40 + r() * 176, 2 + r() * 3, 2 + r() * 3); }
    } else if (k === 11) {
      x.strokeStyle = 'rgba(26,24,22,0.85)';
      for (let i = 0; i < 3; i++) {
        let px = ox + 20 + r() * 40, py = oy + 30 + r() * 190; x.lineWidth = 2 + r() * 2;
        x.beginPath(); x.moveTo(px, py);
        while (px < ox + C - 20) { px += 10 + r() * 20; py += (r() - 0.5) * 26; x.lineTo(px, py); }
        x.stroke();
      }
      for (let i = 0; i < 18; i++) { x.fillStyle = r() > 0.5 ? 'rgba(84,104,48,0.9)' : 'rgba(110,120,60,0.85)'; x.fillRect(ox + 30 + r() * 196, oy + 30 + r() * 196, 2, 6 + r() * 10); }
    } else {
      // pichação de spray: tag com contorno, escorrido e um risco por cima (célula 2:1 na parede)
      const [tag, tinta, borda] = k === 12 ? ['JVP', '#1d1d1f', '#c8c2b4'] : ['VILA', '#b0281e', '#1a1a1a'];
      x.font = `italic 900 ${k === 12 ? 150 : 118}px Impact, 'Arial Black', sans-serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.save(); x.translate(cx, cy); x.rotate(-0.12); x.scale(0.6, 1);
      x.lineWidth = 9; x.strokeStyle = borda; x.strokeText(tag, 0, 0);
      x.fillStyle = tinta; x.fillText(tag, 0, 0); x.restore();
      x.fillStyle = tinta;
      for (let i = 0; i < 9; i++) x.fillRect(ox + 40 + r() * 176, cy + 10 + r() * 12, 2 + r() * 2, 12 + r() * 40);
      x.strokeStyle = tinta; x.lineWidth = 4; x.beginPath(); x.moveTo(ox + 30, cy + 48); x.quadraticCurveTo(cx, cy + 30 + r() * 30, ox + C - 30, cy + 40); x.stroke();
    }
    x.restore();
  }
  const fazer = (c, nome, srgb) => {
    const t = new THREE.CanvasTexture(c); t.name = nome;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return { map: fazer(cor, 'jp-decal-atlas', true), roughnessMap: fazer(rug, 'jp-decal-rug', false) };
}

/* Letreiro pintado à mão: atlas 2×7 de 512×146 (3,5:1). Índice = posição em LETREIROS. */
export const LETREIROS = [
  ['PADARIA ESTRELA', 'pães • bolos • salgados', '#e9dcb8', '#8a2a1e'],
  ['MERCADINHO SÃO LUIZ', 'secos e molhados', '#2f5d8a', '#f1e6c8'],
  ['BAR DO ZÉ', 'cerveja gelada', '#b8322a', '#f4e9cf'],
  ['ARMAZÉM DA RAÇÃO', 'agropecuária', '#e2b83a', '#2d3a20'],
  ['AÇOUGUE BOM CORTE', 'carnes em geral', '#f0ece2', '#a0281e'],
  ['FARMÁCIA SÃO JOSÉ', 'aberta até as 22h', '#e8efe6', '#1e6a3a'],
  ['CERVEJA GELADA', '', '#2e6a8a', '#f2d54a'],
  ['FEIJÃO • ARROZ', 'óleo • açúcar', '#d9c99a', '#7a2a20'],
  ['BOLOS E SALGADOS', 'encomendas', '#f2e2c4', '#5a3a8a'],
  ['GÁS E ÁGUA', 'entrega rápida', '#c43a2a', '#ffffff'],
];
export function letreiroAtlasTex() {
  const W = 1024, H = 1024, LW = 512, LH = 146;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d'), r = lcg(0x1e7e);
  LETREIROS.forEach(([titulo, sub, fundo, tinta], i) => {
    const ox = (i % 2) * LW, oy = ((i / 2) | 0) * LH;
    x.fillStyle = fundo; x.fillRect(ox, oy, LW, LH);
    x.strokeStyle = tinta; x.lineWidth = 5; x.strokeRect(ox + 8, oy + 8, LW - 16, LH - 16);
    x.fillStyle = tinta; x.textAlign = 'center'; x.textBaseline = 'middle';
    let tam = 62;
    x.font = `900 ${tam}px Impact, 'Arial Black', sans-serif`;
    while (x.measureText(titulo).width > LW - 50 && tam > 24) { tam -= 2; x.font = `900 ${tam}px Impact, 'Arial Black', sans-serif`; }
    x.fillText(titulo, ox + LW / 2, oy + (sub ? LH * 0.42 : LH / 2));
    if (sub) { x.font = `italic 700 26px Georgia, serif`; x.fillText(sub, ox + LW / 2, oy + LH * 0.78); }
    for (let k = 0; k < 40; k++) {
      x.globalAlpha = 0.08 + r() * 0.2; x.fillStyle = r() > 0.4 ? '#3a2e22' : '#ffffff';
      x.beginPath(); x.ellipse(ox + r() * LW, oy + r() * LH, 3 + r() * 30, 2 + r() * 14, r() * 3, 0, 6.283); x.fill();
    }
    const escorre = x.createLinearGradient(0, oy + LH * 0.55, 0, oy + LH);
    escorre.addColorStop(0, 'rgba(40,32,24,0)'); escorre.addColorStop(1, 'rgba(40,32,24,0.4)');
    x.globalAlpha = 1; x.fillStyle = escorre; x.fillRect(ox, oy + LH * 0.55, LW, LH * 0.45);
  });
  const t = new THREE.CanvasTexture(c);
  t.name = 'jp-letreiros'; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export const LETREIRO_UV = (i) => {
  const u0 = (i % 2) * 0.5, v1 = 1 - ((i / 2) | 0) * (146 / 1024);
  return [u0, v1 - 146 / 1024, u0 + 0.5, v1];
};
