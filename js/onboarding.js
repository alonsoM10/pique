// onboarding.js — asistente de primera vez. 6 pantallas, todo saltable.

import * as S from './store.js?v=4';
import { esc, num, toast } from './ui.js?v=4';

let paso = 0;
let d = {};      // borrador de respuestas
let terminar = () => {};

const PASOS = 6;

export function empezar(alTerminar) {
  const p = S.perfil();
  paso = 0;
  d = {
    nombre: p.nombre, edad: p.edad || '', sexo: p.sexo || '', alturaCm: p.alturaCm || '',
    peso: '', sinPeso: false, medidas: {},
    pesoObjetivo: '', ritmo: 0.5, prioridad: 'grasa',
    diasGym: 4, nivel: 'antes', actividad: 'ligera', rutina: 'plantilla',
    minuta: 'luego', kcalFuente: 'calculada', kcal: '', evita: '',
    rival: (S.otroPerfil()?.nombre) || 'Cristóbal',
  };
  terminar = alTerminar;
}

export const activo = () => paso >= 0 && paso < PASOS;

// ------------------------------------------------------------------ render

export function render() {
  return `
  <div class="stack" style="padding-top:6px">
    <div class="row" style="gap:5px">
      ${Array.from({ length: PASOS }, (_, i) =>
        `<div style="flex:1;height:3px;border-radius:9px;background:${i <= paso ? 'var(--a)' : 'var(--line)'}"></div>`).join('')}
    </div>
    <div class="tiny dim" style="letter-spacing:.06em;text-transform:uppercase;font-weight:700">
      Paso ${paso + 1} de ${PASOS}
    </div>
    ${[p0, p1, p2, p3, p4, p5][paso]()}
    <div class="row" style="gap:9px;margin-top:4px">
      ${paso > 0 ? '<button class="btn ghost" id="obAtras">Atrás</button>' : ''}
      <button class="btn pri" id="obSig" style="flex:1">${paso === PASOS - 1 ? 'Empezar' : 'Siguiente'}</button>
    </div>
    ${paso > 0 ? '<button class="btn ghost full sm" id="obSaltar">Saltar el resto y empezar</button>' : ''}
  </div>`;
}

// ---- 1. quién eres
const p0 = () => `
  <div class="card">
    <h2 style="font-size:20px">Empecemos por ti</h2>
    <p class="small muted" style="margin:6px 0 15px">
      Con esto calculo tus calorías reales en vez de darte una cifra genérica de internet.
    </p>
    <div class="stack">
      <div class="field"><label class="label">¿Cómo te llamas?</label>
        <input class="input" data-d="nombre" value="${esc(d.nombre)}"></div>
      <div class="grid2">
        <div class="field"><label class="label">Edad</label>
          <input class="input num" data-d="edad" type="number" inputmode="numeric" value="${esc(d.edad)}" placeholder="30"></div>
        <div class="field"><label class="label">Altura (cm)</label>
          <input class="input num" data-d="alturaCm" type="number" inputmode="numeric" value="${esc(d.alturaCm)}" placeholder="175"></div>
      </div>
      <div class="field">
        <label class="label">Sexo</label>
        <div class="row" style="gap:8px">
          <button class="chip ${d.sexo === 'h' ? 'on' : ''}" data-set="sexo:h" style="flex:1;text-align:center">Hombre</button>
          <button class="chip ${d.sexo === 'm' ? 'on' : ''}" data-set="sexo:m" style="flex:1;text-align:center">Mujer</button>
        </div>
        <span class="tiny dim">Cambia la fórmula del metabolismo basal en unas 160 kcal.</span>
      </div>
    </div>
  </div>`;

// ---- 2. punto de partida
const p1 = () => `
  <div class="card">
    <h2 style="font-size:20px">Punto de partida</h2>
    <p class="small muted" style="margin:6px 0 15px">
      Sin foto ninguna. Solo báscula y cinta métrica, y solo lo que tú quieras.
    </p>
    <div class="stack">
      <div class="field">
        <label class="label">Peso actual (kg)</label>
        <input class="input num" data-d="peso" type="number" inputmode="decimal" step="0.1"
          value="${esc(d.peso)}" placeholder="—" ${d.sinPeso ? 'disabled' : ''}>
      </div>
      <button class="chip ${d.sinPeso ? 'on' : ''}" data-toggle="sinPeso" style="align-self:flex-start">
        ${d.sinPeso ? '&#10003; ' : ''}Aún no me he pesado
      </button>
      ${d.sinPeso ? `<p class="tiny dim" style="margin:0">
        Perfecto. La app arranca igual y el día que te peses, ese será tu punto de partida.</p>` : ''}
    </div>
  </div>

  <div class="card">
    <h3 style="font-size:15px">Medidas con cinta</h3>
    <p class="tiny dim" style="margin:5px 0 13px">
      Opcionales, pero valen más que la báscula: el abdomen sigue bajando en semanas que el peso se atasca.
      Rellena solo las que quieras.
    </p>
    <div class="stack">
      ${S.MEDIDAS.map(m => `
        <div class="row" style="gap:9px">
          <div style="flex:1;min-width:0">
            <div class="item-t" style="font-size:13.5px">${m.n}</div>
            <div class="tiny dim">${esc(m.ayuda)}</div>
          </div>
          <input class="input num" data-med="${m.k}" type="number" inputmode="decimal" step="0.5"
            value="${esc(d.medidas[m.k] ?? '')}" placeholder="cm" style="width:78px;flex:none">
        </div>`).join('')}
    </div>
  </div>`;

// ---- 3. objetivo
const p2 = () => {
  const peso = parseFloat(String(d.peso).replace(',', '.'));
  const obj = parseFloat(String(d.pesoObjetivo).replace(',', '.'));
  const restan = peso && obj && peso > obj ? peso - obj : null;
  const semanas = restan ? Math.ceil(restan / d.ritmo) : null;
  const fecha = semanas ? S.fmtFechaLarga(S.addDays(S.todayISO(), semanas * 7)) : null;

  // Rango de peso "sano" por IMC (18,5-24,9) para tu altura, como referencia — no como límite.
  const alt = parseFloat(String(d.alturaCm).replace(',', '.'));
  const m2 = alt ? (alt / 100) ** 2 : null;
  const imcMin = m2 ? Math.round(18.5 * m2 * 10) / 10 : null;
  const imcMax = m2 ? Math.round(24.9 * m2 * 10) / 10 : null;
  const bajoDelRango = imcMin != null && obj && obj < imcMin;

  return `
  <div class="card">
    <h2 style="font-size:20px">¿A dónde quieres llegar?</h2>
    <div class="stack" style="margin-top:14px">
      <div class="field"><label class="label">Peso objetivo (kg)</label>
        <input class="input num" data-d="pesoObjetivo" type="number" inputmode="decimal" step="0.5"
          value="${esc(d.pesoObjetivo)}" placeholder="${imcMin ? imcMin + '-' + imcMax : '—'}"></div>
      ${imcMin ? `<p class="tiny dim" style="margin:0">
          Para ${alt} cm, el rango de peso saludable (IMC) va de <b>${imcMin}</b> a <b>${imcMax} kg</b>.
          Es solo una referencia estadística, no una regla — tú y tu nutricionista deciden tu meta real.
        </p>` : `<p class="tiny dim" style="margin:0">Pon tu altura en el paso 1 y te muestro un rango de referencia.</p>`}
      ${bajoDelRango ? `<p class="small" style="color:var(--w);margin:0">
          &#9888; ${obj} kg queda por debajo de ese rango. No es necesariamente malo, pero coméntalo
          con tu nutricionista antes de fijarlo como meta — no lo cambies solo por lo que dice la app.
        </p>` : ''}
      <div class="field">
        <label class="label">¿A qué ritmo?</label>
        <div class="chips">
          ${[[0.25, 'Muy suave'], [0.5, 'Recomendado'], [0.75, 'Rápido'], [1, 'Agresivo']].map(([v, n]) =>
            `<button class="chip ${d.ritmo === v ? 'on' : ''}" data-set="ritmo:${v}">
              ${v} kg/sem<br><span style="font-size:9.5px;opacity:.75">${n}</span></button>`).join('')}
        </div>
      </div>
      ${fecha ? `
        <div class="card flat" style="border-color:#245840">
          <div class="tiny dim" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">A ese ritmo</div>
          <div style="font-size:16px;font-weight:700;margin:5px 0 3px">${fecha}</div>
          <div class="small muted">${num(restan, 1)} kg en ${semanas} semanas</div>
          ${d.ritmo >= 1 ? `<div class="small" style="color:var(--w);margin-top:8px">
            &#9888; A 1 kg por semana se pierde bastante músculo. Con vosotros entrenando fuerza, 0,5 rinde mejor.
          </div>` : ''}
        </div>` : `<p class="tiny dim" style="margin:0">Pon el objetivo y te digo la fecha estimada.</p>`}
      <div class="field">
        <label class="label">¿Qué te importa más?</label>
        <div class="chips">
          ${[['grasa', 'Perder grasa sin perder músculo'], ['rapido', 'Bajar rápido'], ['fuerza', 'Ponerme fuerte']]
            .map(([v, n]) => `<button class="chip ${d.prioridad === v ? 'on' : ''}" data-set="prioridad:${v}">${n}</button>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
};

// ---- 4. gym
const p3 = () => `
  <div class="card">
    <h2 style="font-size:20px">El gym</h2>
    <div class="stack" style="margin-top:14px">
      <div class="field">
        <label class="label">¿Cuántos días por semana puedes ir?</label>
        <div class="chips">
          ${[2, 3, 4, 5, 6].map(n =>
            `<button class="chip ${d.diasGym === n ? 'on' : ''}" data-set="diasGym:${n}" style="min-width:46px;text-align:center">${n}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label class="label">Tu nivel</label>
        <div class="chips">
          ${[['nunca', 'Nunca he entrenado'], ['antes', 'He entrenado antes'], ['regular', 'Entreno ya']]
            .map(([v, n]) => `<button class="chip ${d.nivel === v ? 'on' : ''}" data-set="nivel:${v}">${n}</button>`).join('')}
        </div>
      </div>
      <div class="field">
        <label class="label">Fuera del gym, tu día es…</label>
        <div class="chips">
          ${[['sedentaria', 'Sentado casi todo'], ['ligera', 'Algo de movimiento'], ['activa', 'De pie o andando']]
            .map(([v, n]) => `<button class="chip ${d.actividad === v ? 'on' : ''}" data-set="actividad:${v}">${n}</button>`).join('')}
        </div>
        <span class="tiny dim">Puede cambiar tus calorías en 300-400 al día. No es un detalle.</span>
      </div>
      <div class="field">
        <label class="label">¿Rutina?</label>
        <div class="chips">
          ${[['plantilla', 'Dame una plantilla'], ['propia', 'Meto la mía']]
            .map(([v, n]) => `<button class="chip ${d.rutina === v ? 'on' : ''}" data-set="rutina:${v}">${n}</button>`).join('')}
        </div>
      </div>
    </div>
  </div>`;

// ---- 5. comida
const p4 = () => {
  const peso = parseFloat(String(d.peso).replace(',', '.'));
  const edad = Number(d.edad), alt = Number(d.alturaCm);
  let sugerido = null;
  if (peso && edad && alt && d.sexo) {
    const base = 10 * peso + 6.25 * alt - 5 * edad + (d.sexo === 'h' ? 5 : -161);
    const F = { sedentaria: 1.2, ligera: 1.375, activa: 1.55 }[d.actividad] || 1.375;
    const gasto = Math.round(base * F) + Math.round(d.diasGym * 300 / 7);
    sugerido = Math.max(d.sexo === 'h' ? 1500 : 1200, gasto - Math.round(d.ritmo * 7700 / 7));
  }
  return `
  <div class="card">
    <h2 style="font-size:20px">La comida</h2>
    <div class="stack" style="margin-top:14px">
      <div class="field">
        <label class="label">¿Tienes minuta del nutricionista?</label>
        <div class="chips">
          ${[['ahora', 'Sí, la meto ahora'], ['luego', 'Sí, la meto luego'], ['no', 'No tengo']]
            .map(([v, n]) => `<button class="chip ${d.minuta === v ? 'on' : ''}" data-set="minuta:${v}">${n}</button>`).join('')}
        </div>
        ${d.minuta === 'ahora' ? `<p class="tiny dim" style="margin:0">
          No hace falta que escribas comida por comida: en la pestaña Comida, con
          <b>Cargar mi minuta</b>, pegas el plan de tu nutricionista tal cual y la app lo
          entiende y lo recuerda.</p>` : ''}
      </div>
      <div class="field">
        <label class="label">Calorías diarias</label>
        <div class="chips">
          <button class="chip ${d.kcalFuente === 'calculada' ? 'on' : ''}" data-set="kcalFuente:calculada">Calcúlalas tú</button>
          <button class="chip ${d.kcalFuente === 'nutricionista' ? 'on' : ''}" data-set="kcalFuente:nutricionista">Me las dio el nutricionista</button>
        </div>
      </div>
      ${d.kcalFuente === 'nutricionista' ? `
        <div class="field"><label class="label">Kcal que te puso</label>
          <input class="input num" data-d="kcal" type="number" inputmode="numeric" value="${esc(d.kcal)}" placeholder="1800"></div>
        <p class="tiny dim" style="margin:0">Manda su cifra por encima de la mía: él te ha visto, yo no.</p>
      ` : sugerido ? `
        <div class="card flat" style="border-color:#245840">
          <div class="tiny dim" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">Mi cálculo</div>
          <div style="font-size:26px;font-weight:750;margin:4px 0">${num(sugerido)} <span style="font-size:13px;color:var(--tx-3)">kcal/día</span></div>
          <div class="small muted">Con ${num(Math.round(peso * 1.8))} g de proteína para no perder músculo.</div>
        </div>
      ` : `<p class="tiny dim" style="margin:0">Me faltan datos para calcularlas. Podrás verlas cuando te peses.</p>`}
      <div class="field"><label class="label">Cosas que no comes &mdash; opcional</label>
        <input class="input" data-d="evita" value="${esc(d.evita)}" placeholder="Lactosa, mariscos…"></div>
    </div>
  </div>`;
};

// ---- 6. pique
const p5 = () => `
  <div class="card hero">
    <h2 style="font-size:20px">El pique</h2>
    <p class="small muted" style="margin:7px 0 15px">
      Lo que hace que no lo dejéis en tres semanas no es la app. Es que el otro esté mirando.
    </p>
    <div class="field">
      <label class="label">¿Contra quién compites?</label>
      <input class="input" data-d="rival" value="${esc(d.rival)}" placeholder="Cristóbal">
    </div>
  </div>
  <div class="card flat">
    <h4 class="small" style="margin-bottom:8px">Lo que verás en la pestaña Pique</h4>
    <ul class="small muted" style="margin:0;padding-left:18px;line-height:1.7">
      <li>Quién lleva más entrenos esta semana</li>
      <li>Racha de cada uno, en días</li>
      <li>% del objetivo recorrido &mdash; no kilos, así es justo</li>
      <li>Adherencia a la minuta de los últimos 7 días</li>
    </ul>
  </div>`;

// ------------------------------------------------------------------ mount

export function mount(root, rerender) {
  root.querySelectorAll('[data-d]').forEach(inp => {
    inp.oninput = () => { d[inp.dataset.d] = inp.value; };
    inp.onblur = () => { d[inp.dataset.d] = inp.value; rerender(); };
  });

  root.querySelectorAll('[data-med]').forEach(inp => {
    inp.oninput = () => { d.medidas[inp.dataset.med] = inp.value; };
  });

  root.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
    const [k, v] = b.dataset.set.split(':');
    d[k] = isNaN(Number(v)) ? v : Number(v);
    rerender();
  });

  root.querySelectorAll('[data-toggle]').forEach(b => b.onclick = () => {
    d[b.dataset.toggle] = !d[b.dataset.toggle];
    if (d.sinPeso) d.peso = '';
    rerender();
  });

  root.querySelector('#obAtras')?.addEventListener('click', () => { paso--; rerender(); });
  root.querySelector('#obSaltar')?.addEventListener('click', () => guardar());
  root.querySelector('#obSig').onclick = () => {
    if (paso === 0 && !String(d.nombre).trim()) return toast('Dime tu nombre');
    if (paso === PASOS - 1) return guardar();
    paso++;
    rerender();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

// ------------------------------------------------------------------ guardar

function guardar() {
  const p = S.perfil();
  const n = (v) => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : null; };

  p.nombre = String(d.nombre).trim() || p.nombre;
  p.edad = n(d.edad);
  p.sexo = d.sexo || null;
  p.alturaCm = n(d.alturaCm);
  p.actividad = d.actividad;
  p.nivel = d.nivel;
  p.diasGym = d.diasGym;
  p.prioridad = d.prioridad;
  p.evita = String(d.evita).trim();
  p.pesoObjetivo = n(d.pesoObjetivo);
  p.ritmoKgSemana = d.ritmo;
  p.kcalFuente = d.kcalFuente;
  p.onboarding = true;
  p.desde = S.todayISO();

  const otro = S.otroPerfil();
  if (otro && String(d.rival).trim()) otro.nombre = String(d.rival).trim();

  S.save();

  const peso = n(d.peso);
  if (peso) S.registrarPeso(peso);
  S.registrarMedidas(d.medidas);

  // calorías: la cifra del nutricionista manda; si no, la calculada
  if (d.kcalFuente === 'nutricionista' && n(d.kcal)) p.kcalObjetivo = n(d.kcal);
  else p.kcalObjetivo = S.kcalRecomendadas(p) || 2000;
  p.proteinaObjetivo = S.proteinaRecomendada(p) || 130;
  S.save();

  paso = -1;
  terminar(d);
}

export const borrador = () => d;
