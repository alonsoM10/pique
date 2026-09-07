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
export function graficoLinea(puntos, { alto = 130, color = '#4ade80', objetivo = null } = {}) {
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
         stroke="#fbbf24" stroke-width="1" stroke-dasharray="4 4" opacity=".75"/>
       <text x="${W - pad.r}" y="${(y(objetivo) - 5).toFixed(1)}" text-anchor="end"
         fill="#fbbf24" font-size="9" font-weight="700">objetivo ${objetivo}</text>` : '';

  const ptos = puntos.map((p, i) =>
    `<circle cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="${i === puntos.length - 1 ? 3.6 : 2}"
       fill="${i === puntos.length - 1 ? color : '#0b0f14'}" stroke="${color}" stroke-width="1.6"/>`).join('');

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
export function graficoBarras(datos, { alto = 96, color = '#60a5fa' } = {}) {
  if (!datos.length) return '<div class="empty">Sin datos todavía</div>';
  const W = 320, H = alto, gap = 5, pad = 16;
  const max = Math.max(...datos.map(d => d.v), 1);
  const bw = (W - pad * 0) / datos.length - gap;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Barras">
    ${datos.map((d, i) => {
      const h = Math.max(2, (d.v / max) * (H - 20));
      const x = i * (bw + gap);
      return `<rect x="${x.toFixed(1)}" y="${(H - 16 - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}"
        rx="3" fill="${d.v ? color : '#243244'}" opacity="${d.v ? 1 : .6}"/>
      <text x="${(x + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" fill="#6b7d95"
        font-size="9" font-weight="700">${esc(d.k)}</text>`;
    }).join('')}
  </svg>`;
}

// Anillo de progreso.
export function anillo(pct, { size = 74, color = '#4ade80', texto = '' } = {}) {
  const r = size / 2 - 6, c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, pct)));
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="flex:none">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#243244" stroke-width="6"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="6"
      stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" text-anchor="middle" dy="4.5" fill="#e8eef7" font-size="15"
      font-weight="750">${esc(texto)}</text>
  </svg>`;
}

// ------------------------------------------------------------------- varios

export const vibrar = (ms = 12) => { try { navigator.vibrate?.(ms); } catch (e) { /* iOS lo ignora */ } };

export function mmss(seg) {
  const m = Math.floor(seg / 60), s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
