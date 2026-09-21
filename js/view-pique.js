// view-pique.js — la comparativa. Con 2 personas es un cara a cara; con más, un ranking.

import * as S from './store.js?v=7';
import { esc, num, anillo } from './ui.js?v=7';

// Comparamos en % del objetivo, no en kilos: si uno pesa 95 y otro 78, los kilos no son justos.
const METRICAS = [
  {
    k: 'semana', n: 'Entrenos esta semana', suf: '',
    val: (p) => S.entrenosEstaSemana(p),
    sub: (p) => `de ${S.objetivoSemanal(p) || '—'} previstos`,
  },
  {
    k: 'racha', n: 'Racha', suf: ' d',
    val: (p) => S.racha(p),
    sub: () => 'días seguidos cumpliendo',
  },
  {
    k: 'objetivo', n: 'Objetivo recorrido', suf: '%',
    val: (p) => { const x = S.progresoObjetivo(p); return x == null ? null : Math.round(x * 100); },
    sub: (p) => {
      const a = S.pesoActual(p);
      return a != null && p.pesoObjetivo != null
        ? `faltan ${num(Math.max(0, a - p.pesoObjetivo), 1)} kg` : 'sin objetivo';
    },
  },
  {
    k: 'minuta', n: 'Minuta cumplida (7 d)', suf: '%',
    val: (p) => { const x = S.adherencia(p); return x == null ? null : Math.round(x * 100); },
    sub: () => 'comidas marcadas',
  },
  {
    k: 'volumen', n: 'Kg movidos esta semana', suf: '',
    val: (p) => {
      const lun = S.addDays(S.todayISO(), -S.dayOfWeek(S.todayISO()));
      return Math.round(p.sesiones.filter(s => s.fecha >= lun)
        .reduce((t, s) => t + S.volumenSesion(s), 0));
    },
    sub: () => 'suma de peso × reps',
  },
];

const NOTA_PUNTUACION = `
  El objetivo se mide en <b>porcentaje recorrido</b>, no en kilos: así el que empieza más pesado
  no gana por defecto. Los días de descanso programados no rompen la racha.`;

const AVISO_SIN_CONFIGURAR = (s) => s.perfiles.some(p => !p.onboarding) ? `
  <div class="card" style="border-color:#5c4712">
    <div class="item-t" style="color:var(--w)">Falta configurar a alguien</div>
    <div class="item-s" style="margin-top:4px">
      ${esc(s.perfiles.filter(p => !p.onboarding).map(p => p.nombre).join(', '))}
      todavía no ha rellenado sus datos, así que algunas métricas salen vacías.
    </div>
  </div>` : '';

export function render() {
  const s = S.state();
  if (s.perfiles.length < 2) return renderSolo(s.perfiles[0]);
  if (s.perfiles.length === 2) return renderDuelo(s.perfiles[0], s.perfiles[1], s);
  return renderRanking(s);
}

export function mount() { /* solo lectura */ }

// ------------------------------------------------------------------ solo (1 persona)

function renderSolo(p) {
  return `
  <div class="stack">
    <div class="card">
      <div class="empty" style="padding:22px 8px">
        <span class="big">&#9876;</span>
        <h3 style="font-size:16px;color:var(--tx);margin-bottom:7px">Todavía compites solo</h3>
        <p class="small" style="margin:0 auto;max-width:34ch">
          El pique de verdad empieza cuando se suma alguien más. Tócate el nombre arriba a la
          izquierda y añade a quien quieras: no hace falta que sean solo dos.
        </p>
      </div>
    </div>
  </div>`;
}

// ------------------------------------------------------------------ duelo (2 personas)

function renderDuelo(a, b, s) {
  let ga = 0, gb = 0;
  METRICAS.forEach(m => {
    const va = m.val(a), vb = m.val(b);
    if (va == null || vb == null) return;
    if (va > vb) ga++; else if (vb > va) gb++;
  });
  const lider = ga === gb ? null : (ga > gb ? a : b);

  return `
  <div class="stack">

    <div class="card hero">
      <div class="center" style="padding:4px 0 2px">
        <div class="tiny dim" style="font-weight:700;letter-spacing:.08em;text-transform:uppercase">Marcador</div>
        <div class="row" style="justify-content:center;gap:18px;margin-top:11px">
          <div class="center" style="flex:1">
            <div style="width:46px;height:46px;border-radius:99px;margin:0 auto 7px;display:grid;place-items:center;
              background:${a.color};color:#07130c;font-weight:800;font-size:19px">${esc(S.avatar(a))}</div>
            <div class="small" style="font-weight:650">${esc(a.nombre)}</div>
          </div>
          <div class="center" style="flex:none">
            <div style="font-size:34px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums">
              ${ga}<span style="color:var(--tx-3);font-size:20px;margin:0 4px">·</span>${gb}
            </div>
          </div>
          <div class="center" style="flex:1">
            <div style="width:46px;height:46px;border-radius:99px;margin:0 auto 7px;display:grid;place-items:center;
              background:${b.color};color:#06182b;font-weight:800;font-size:19px">${esc(S.avatar(b))}</div>
            <div class="small" style="font-weight:650">${esc(b.nombre)}</div>
          </div>
        </div>
        <div class="small muted" style="margin-top:13px">
          ${lider ? `<b style="color:${lider.color}">${esc(lider.nombre)}</b> va por delante`
            : 'Empate técnico. Se decide esta semana.'}
        </div>
      </div>
    </div>

    ${METRICAS.map(m => {
      const va = m.val(a), vb = m.val(b);
      const max = Math.max(va || 0, vb || 0, 1);
      const barra = (v, color) => `
        <div class="bar" style="height:9px"><i style="width:${((v || 0) / max) * 100}%;background:${color}"></i></div>`;
      const gana = (x, y) => x != null && y != null && x > y;
      return `
      <div class="card tight">
        <div class="tiny dim" style="font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:9px">
          ${m.n}
        </div>
        ${[[a, va, vb], [b, vb, va]].map(([p, v, o]) => `
          <div style="margin-bottom:9px">
            <div class="row-b" style="margin-bottom:4px">
              <span class="small" style="font-weight:${gana(v, o) ? 700 : 500};color:${gana(v, o) ? p.color : 'var(--tx-2)'}">
                ${gana(v, o) ? '&#9733; ' : ''}${esc(p.nombre)}
              </span>
              <span style="font-weight:750;font-variant-numeric:tabular-nums;font-size:15px">
                ${v == null ? '—' : num(v) + m.suf}
              </span>
            </div>
            ${barra(v, p.color)}
          </div>`).join('')}
        <div class="tiny dim" style="margin-top:2px">${m.sub(a)}</div>
      </div>`;
    }).join('')}

    <div class="card flat">
      <h4 class="small" style="margin-bottom:8px">Cómo se puntúa</h4>
      <p class="tiny muted" style="margin:0">${NOTA_PUNTUACION}</p>
    </div>

    ${AVISO_SIN_CONFIGURAR(s)}

  </div>`;
}

// ------------------------------------------------------------------ ranking (3 o más)

function renderRanking(s) {
  const gente = s.perfiles;

  // 1 punto por métrica ganada en solitario (si hay empate en el máximo, esa métrica no da punto)
  const puntos = new Map(gente.map(p => [p.id, 0]));
  METRICAS.forEach(m => {
    const vals = gente.map(p => ({ p, v: m.val(p) })).filter(x => x.v != null);
    if (!vals.length) return;
    const max = Math.max(...vals.map(x => x.v));
    const ganadores = vals.filter(x => x.v === max);
    if (ganadores.length === 1) puntos.set(ganadores[0].p.id, puntos.get(ganadores[0].p.id) + 1);
  });

  const ranking = [...gente].sort((x, y) => puntos.get(y.id) - puntos.get(x.id));
  const medalla = ['&#129351;', '&#129352;', '&#129353;'];

  return `
  <div class="stack">

    <div class="card hero">
      <div class="tiny dim" style="font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-align:center">
        Ranking
      </div>
      <div class="list" style="margin-top:13px">
        ${ranking.map((p, i) => `
          <div class="row" style="gap:11px">
            <span style="width:26px;text-align:center;font-size:${i < 3 ? '19px' : '13px'};flex:none">
              ${i < 3 ? medalla[i] : `<b class="dim">${i + 1}</b>`}
            </span>
            <span style="width:36px;height:36px;border-radius:99px;display:grid;place-items:center;flex:none;
              background:${p.color};color:#07130c;font-weight:800">${esc(S.avatar(p))}</span>
            <span style="flex:1;min-width:0;font-weight:650">${esc(p.nombre)}</span>
            <span style="font-weight:800;font-size:17px;font-variant-numeric:tabular-nums">${puntos.get(p.id)}</span>
          </div>`).join('')}
      </div>
      <div class="tiny dim center" style="margin-top:12px">un punto por cada métrica ganada en solitario</div>
    </div>

    ${METRICAS.map(m => {
      const vals = gente.map(p => ({ p, v: m.val(p) }));
      const conocidos = vals.filter(x => x.v != null);
      const max = Math.max(...conocidos.map(x => x.v), 1);
      const ordenado = [...vals].sort((x, y) => (y.v ?? -1) - (x.v ?? -1));
      const ganadores = conocidos.length ? conocidos.filter(x => x.v === Math.max(...conocidos.map(c => c.v))) : [];
      const esGanadorSolo = (id) => ganadores.length === 1 && ganadores[0].p.id === id;
      return `
      <div class="card tight">
        <div class="tiny dim" style="font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:9px">
          ${m.n}
        </div>
        ${ordenado.map(({ p, v }) => `
          <div style="margin-bottom:9px">
            <div class="row-b" style="margin-bottom:4px">
              <span class="small" style="font-weight:${esGanadorSolo(p.id) ? 700 : 500};
                color:${esGanadorSolo(p.id) ? p.color : 'var(--tx-2)'}">
                ${esGanadorSolo(p.id) ? '&#9733; ' : ''}${esc(p.nombre)}
              </span>
              <span style="font-weight:750;font-variant-numeric:tabular-nums;font-size:15px">
                ${v == null ? '—' : num(v) + m.suf}
              </span>
            </div>
            <div class="bar" style="height:9px"><i style="width:${((v || 0) / max) * 100}%;background:${p.color}"></i></div>
          </div>`).join('')}
        <div class="tiny dim" style="margin-top:2px">${m.sub(gente[0])}</div>
      </div>`;
    }).join('')}

    <div class="card flat">
      <h4 class="small" style="margin-bottom:8px">Cómo se puntúa</h4>
      <p class="tiny muted" style="margin:0">${NOTA_PUNTUACION}</p>
    </div>

    ${AVISO_SIN_CONFIGURAR(s)}

  </div>`;
}
