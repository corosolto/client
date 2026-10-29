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
