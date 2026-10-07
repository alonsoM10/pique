// ui.js — helpers de render, sheet modal, toast y gráficos SVG.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const num = (v, dec = 0) =>
  v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(dec).replace('.', ',');

// ------------------------------------------------------------------- toast

let toastT = null;
export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { el.hidden = true; }, 2200);
}

// ------------------------------------------------------------------- sheet

let alCerrar = null;

export function abrirSheet(titulo, html, onMount) {
  const s = $('#sheet');
  $('#sheetTitle').textContent = titulo;
  $('#sheetBody').innerHTML = html;
  s.hidden = false;
  document.body.style.overflow = 'hidden';
  if (onMount) onMount($('#sheetBody'));
}

export function cerrarSheet() {
  const s = $('#sheet');
  s.hidden = true;
  $('#sheetBody').innerHTML = '';
  document.body.style.overflow = '';
  if (alCerrar) { const f = alCerrar; alCerrar = null; f(); }
}

export const alCerrarSheet = (f) => { alCerrar = f; };

// Confirmación reutilizable (evita confirm() nativo, que en PWA iOS queda feo)
export function confirmar(titulo, texto, textoOk = 'Confirmar', peligro = true) {
  return new Promise(resolve => {
    abrirSheet(titulo, `
      <div class="stack">
        <p class="muted small" style="margin:0">${esc(texto)}</p>
        <button class="btn ${peligro ? 'danger' : 'pri'} full" id="cfOk">${esc(textoOk)}</button>
        <button class="btn ghost full" id="cfNo">Cancelar</button>
      </div>`, (b) => {
      $('#cfOk', b).onclick = () => { resolve(true); cerrarSheet(); };
      $('#cfNo', b).onclick = () => { resolve(false); cerrarSheet(); };
    });
    alCerrarSheet(() => resolve(false));
  });
}

// Pedir un valor simple
export function pedir({ titulo, label, valor = '', tipo = 'text', placeholder = '', ok = 'Guardar' }) {
  return new Promise(resolve => {
    abrirSheet(titulo, `
      <div class="stack">
        <div class="field">
          <label class="label">${esc(label)}</label>
          <input class="input" id="pdIn" type="${tipo}" value="${esc(valor)}"
            placeholder="${esc(placeholder)}" ${tipo === 'number' ? 'inputmode="decimal" step="any"' : ''}>
        </div>
        <button class="btn pri full" id="pdOk">${esc(ok)}</button>
      </div>`, (b) => {
      const inp = $('#pdIn', b);
      setTimeout(() => inp.focus(), 120);
      const done = () => { const v = inp.value.trim(); resolve(v === '' ? null : v); cerrarSheet(); };
      $('#pdOk', b).onclick = done;
      inp.onkeydown = (e) => { if (e.key === 'Enter') done(); };
    });
    alCerrarSheet(() => resolve(null));
  });
}

// ------------------------------------------------------------------- gráficos

// Línea suave de evolución de peso.
export function graficoLinea(puntos, { alto = 130, color = '#ffd60a', objetivo = null } = {}) {
  if (!puntos.length) return '<div class="empty">Sin datos todavía</div>';
  const W = 320, H = alto, pad = { t: 12, r: 6, b: 18, l: 6 };
  const vals = puntos.map(p => p.y);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (objetivo != null) { min = Math.min(min, objetivo); max = Math.max(max, objetivo); }
  if (max - min < 2) { const m = (max + min) / 2; min = m - 1.5; max = m + 1.5; }
  const rango = max - min;
  const x = (i) => pad.l + (puntos.length === 1 ? (W - pad.l - pad.r) / 2
    : i * (W - pad.l - pad.r) / (puntos.length - 1));
  const y = (v) => pad.t + (1 - (v - min) / rango) * (H - pad.t - pad.b);

  const d = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${x(puntos.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  const gid = 'g' + Math.random().toString(36).slice(2, 7);

  const lineaObj = objetivo != null
    ? `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(objetivo).toFixed(1)}" y2="${y(objetivo).toFixed(1)}"
         stroke="#a1a1aa" stroke-width="1" stroke-dasharray="4 4" opacity=".7"/>
       <text x="${W - pad.r}" y="${(y(objetivo) - 5).toFixed(1)}" text-anchor="end"
         fill="#a1a1aa" font-size="9" font-weight="700">objetivo ${objetivo}</text>` : '';

  const ptos = puntos.map((p, i) =>
    `<circle cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="${i === puntos.length - 1 ? 3.6 : 2}"
       fill="${i === puntos.length - 1 ? color : '#09090b'}" stroke="${color}" stroke-width="1.6"/>`).join('');

  const ultimo = puntos[puntos.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
      aria-label="Evolución: de ${puntos[0].y} a ${ultimo.y}">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity=".28"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#${gid})"/>
    ${lineaObj}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    ${ptos}
  </svg>`;
}

// Barras de volumen semanal / entrenos.
export function graficoBarras(datos, { alto = 96, color = '#ffd60a' } = {}) {
  if (!datos.length) return '<div class="empty">Sin datos todavía</div>';
  const W = 320, H = alto, gap = 5, pad = 16;
  const max = Math.max(...datos.map(d => d.v), 1);
  const bw = (W - pad * 0) / datos.length - gap;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Barras">
    ${datos.map((d, i) => {
      const h = Math.max(2, (d.v / max) * (H - 20));
      const x = i * (bw + gap);
      return `<rect x="${x.toFixed(1)}" y="${(H - 16 - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}"
        rx="3" fill="${d.v ? color : '#29292d'}" opacity="${d.v ? 1 : .6}"/>
      <text x="${(x + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" fill="#6e6e76"
        font-size="9" font-weight="700">${esc(d.k)}</text>`;
    }).join('')}
  </svg>`;
}

// Anillo de progreso.
export function anillo(pct, { size = 74, color = '#ffd60a', texto = '', txt = '#fafafa', track = '#29292d' } = {}) {
  const r = size / 2 - 6, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, pct)));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex:none">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="6"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="6"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" text-anchor="middle" dy="4.5" fill="${txt}" font-size="15"
      font-weight="700">${esc(texto)}</text>
  </svg>`;
}

// ------------------------------------------------------------------- varios

// Íconos de línea (SVG inline, sin depender de internet: andan offline). Heredan el
// color del texto (currentColor) y el tamaño que le pases. Reemplazan a los emojis.
const ICONOS = {
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  escanear: '<path d="M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2"/><path d="M4 12h16"/>',
  camara: '<path d="M4 7h3l2-2h6l2 2h3v12H4z"/><circle cx="12" cy="13" r="3.2"/>',
  etiqueta: '<path d="M3 11V4h7l10 10-7 7L3 11z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  plato: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M12 11V7a3 3 0 0 1 3-3"/>',
  libro: '<path d="M5 4a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h14V4z"/><path d="M19 17v4"/>',
  calendario: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  pastilla: '<rect x="2.5" y="9" width="19" height="6" rx="3"/><path d="M12 9v6"/>',
  descanso: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  campana: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5L20 6"/>',
};
export const ico = (nombre, size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;flex:none">${ICONOS[nombre] || ''}</svg>`;

export const vibrar = (ms = 12) => { try { navigator.vibrate?.(ms); } catch (e) { /* iOS lo ignora */ } };

export function mmss(seg) {
  const m = Math.floor(seg / 60), s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
