// view-entreno.js — editor de rutinas y sesión de entreno en vivo.

import * as S from './store.js?v=4';
import { esc, num, toast, abrirSheet, cerrarSheet, confirmar, vibrar, mmss } from './ui.js?v=4';

// Sesión en curso (viva sólo mientras la app está abierta; se persiste al terminar).
let sesion = null;
let descanso = null; // { seg, timer }
let volverARenderizar = () => {};

const LIBRERIA = [
  'Press banca', 'Press inclinado con mancuernas', 'Aperturas en polea', 'Fondos en paralelas',
  'Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo en polea baja', 'Pull-over',
  'Press militar', 'Elevaciones laterales', 'Pájaros', 'Encogimientos de hombros',
  'Curl con barra', 'Curl martillo', 'Curl en banco inclinado',
  'Extensión de tríceps en polea', 'Press francés', 'Fondos en banco',
  'Sentadilla', 'Prensa de piernas', 'Zancadas', 'Peso muerto rumano', 'Peso muerto',
  'Extensión de cuádriceps', 'Curl femoral', 'Elevación de gemelos', 'Hip thrust',
  'Plancha', 'Elevación de piernas', 'Crunch en polea', 'Rueda abdominal',
  'Cinta 20 min', 'Bicicleta estática 20 min', 'Elíptica 20 min', 'Remo ergómetro',
];

// ------------------------------------------------------------------ render

export function render() {
  if (sesion) return renderSesion();
  const p = S.perfil();
  const r = S.rutinaActiva(p);
  if (!r) return renderVacio();
  return renderRutina(p, r);
}

function renderVacio() {
  return `
  <div class="stack">
    <div class="card">
      <div class="empty" style="padding:16px 4px 20px">
        <span class="big">&#9878;</span>
        <h3 style="font-size:16px;color:var(--tx);margin-bottom:7px">Monta tu rutina una vez</h3>
        <p class="small" style="margin:0 auto;max-width:38ch">
          Creas los días que entrenas, metes tus ejercicios y los asignas a los días de la semana.
          A partir de ahí sólo abres la app y sigues la lista.
        </p>
      </div>
      <button class="btn pri full xl" id="nuevaRutina">Crear rutina a mano</button>
    </div>

    <div class="card flat">
      <h4 class="small" style="margin-bottom:7px">&#129302; ¿Ya tienes tu rutina en otro lado?</h4>
      <p class="tiny muted" style="margin:0 0 11px">
        Descríbesela a cualquier IA con estas instrucciones y pega aquí lo que te devuelva.
        Días, ejercicios, series y descanso, todo de una vez.
      </p>
      <button class="btn blue full sm" id="importarRutinaIA">Importar rutina con IA</button>
    </div>

    <div class="card flat">
      <h4 class="small" style="margin-bottom:7px">¿No sabes por dónde empezar?</h4>
      <p class="tiny muted" style="margin:0 0 11px">
        Te dejo montado un torso/pierna de 4 días, que es lo estándar para perder grasa manteniendo músculo.
        Luego lo editas entero.
      </p>
      <button class="btn ghost full sm" id="plantillaTP">Usar plantilla torso/pierna</button>
    </div>
  </div>`;
}

function renderRutina(p, r) {
  const hoy = S.todayISO();
  const diaHoy = S.diaDeHoy(p);
  const yaEntrenado = p.sesiones.some(s => s.fecha === hoy);

  return `
  <div class="stack">

    <div class="card tight">
      <div class="row-b">
        <div style="min-width:0">
          <div class="tiny dim" style="font-weight:700;letter-spacing:.06em;text-transform:uppercase">Rutina activa</div>
          <div class="item-t" style="margin-top:2px">${esc(r.nombre)}</div>
        </div>
        <button class="btn ghost sm" id="editarNombre">Editar</button>
      </div>
    </div>

    ${diaHoy && !yaEntrenado ? `
      <button class="btn pri full xl" data-empezar="${diaHoy.id}">
        Empezar &middot; ${esc(diaHoy.nombre)}
      </button>` : ''}
    ${yaEntrenado ? `<div class="card tight center small" style="color:var(--a);border-color:#245840">
      &#10003; Ya entrenaste hoy</div>` : ''}

    <div class="sec-title">Días de la rutina</div>
    <div class="list">
      ${r.dias.map(d => {
        const asignados = p.calendario.map((x, i) => x === d.id ? S.DIAS[i] : null).filter(Boolean);
        return `<div class="card tight">
          <div class="row-b" style="align-items:flex-start">
            <div style="flex:1;min-width:0">
              <div class="item-t">${esc(d.nombre)}</div>
              <div class="item-s">
                ${d.ejercicios.length} ejercicio${d.ejercicios.length === 1 ? '' : 's'}
                ${asignados.length ? ` · ${asignados.join(', ')}` : ' · sin asignar'}
              </div>
            </div>
            <div class="row" style="gap:6px">
              <button class="btn ghost sm" data-editar="${d.id}">Editar</button>
              ${d.ejercicios.length ? `<button class="btn sm" data-empezar="${d.id}">Ir</button>` : ''}
            </div>
          </div>
        </div>`;
      }).join('')}
      ${!r.dias.length ? '<div class="empty">Añade tu primer día de entreno</div>' : ''}
    </div>
    <div class="grid2">
      <button class="btn ghost sm" id="nuevoDia">+ Añadir día</button>
      <button class="btn ghost sm" id="importarRutinaIA">&#129302; Importar con IA</button>
    </div>

    <button class="btn ghost full sm" id="verGuia">&#9432; ¿Cómo se hace cada ejercicio?</button>

    <div class="sec-title">Calendario semanal</div>
    <div class="card">
      <p class="tiny dim" style="margin:0 0 11px">Toca cada día para asignarle un entreno o dejarlo de descanso.</p>
      <div class="list">
        ${S.DIAS.map((nombre, i) => {
          const dId = p.calendario[i];
          const d = r.dias.find(x => x.id === dId);
          return `<button class="item" data-cal="${i}" style="width:100%;text-align:left;cursor:pointer">
            <span style="width:34px;font-weight:750;font-size:12px;color:var(--tx-3)">${nombre}</span>
            <span style="flex:1" class="${d ? 'item-t' : 'small dim'}">${d ? esc(d.nombre) : 'Descanso'}</span>
            <span class="dim" style="font-size:11px">cambiar</span>
          </button>`;
        }).join('')}
      </div>
    </div>

    ${p.sesiones.length ? `
      <div class="sec-title">Últimos entrenos</div>
      <div class="list">
        ${[...p.sesiones].reverse().slice(0, 5).map(s => `
          <div class="card tight">
            <div class="row-b">
              <div>
                <div class="item-t" style="font-size:13.5px">${esc(s.nombre)}</div>
                <div class="item-s">${esc(S.fmtFecha(s.fecha))} · ${Math.round(s.duracion / 60)} min</div>
              </div>
              <div class="center">
                <div style="font-weight:750;font-variant-numeric:tabular-nums">${num(S.volumenSesion(s))}</div>
                <div class="tiny dim">kg totales</div>
              </div>
            </div>
          </div>`).join('')}
      </div>` : ''}

  </div>`;
}

// ------------------------------------------------------------------ sesión en vivo

function renderSesion() {
  const total = sesion.ejercicios.reduce((t, e) => t + e.series.length, 0);
  const hechas = sesion.ejercicios.reduce((t, e) => t + e.series.filter(s => s.hecha).length, 0);
  const pct = total ? hechas / total : 0;
  const trans = Math.floor((Date.now() - sesion.inicio) / 1000);

  return `
  <div class="stack">
    <div class="card hero">
      <div class="row-b">
        <div>
          <span class="pill a">En curso</span>
          <h2 style="font-size:18px;margin-top:7px">${esc(sesion.nombre)}</h2>
          <div class="small muted" style="margin-top:3px">${mmss(trans)} · ${hechas}/${total} series</div>
        </div>
        <button class="btn ghost sm" id="cancelarSesion">Salir</button>
      </div>
      <div class="bar" style="margin-top:12px"><i style="width:${pct * 100}%"></i></div>
    </div>

    ${sesion.ejercicios.map((e, ei) => {
      const u = S.ultimaVez(e.nombre);
      const mej = u && S.mejorSerie(u.series);
      const listo = e.series.every(s => s.hecha);
      return `
      <div class="card ${listo ? '' : ''}" style="${listo ? 'border-color:#245840' : ''}">
        <div class="card-hd">
          <div style="min-width:0">
            <button class="item-t" data-guia="${esc(e.nombre)}"
              style="background:none;border:0;padding:0;text-align:left;cursor:pointer">
              ${listo ? '<span style="color:var(--a)">&#10003;</span> ' : ''}${esc(e.nombre)}
              <span class="dim" style="font-size:11px;font-weight:600">&#9432;</span>
            </button>
            <div class="item-s">
              ${mej ? `Última vez: ${num(mej.kg, 1)} kg × ${mej.reps}` : 'Primera vez con este ejercicio'}
              ${e.nota ? ` · ${esc(e.nota)}` : ''}
            </div>
          </div>
        </div>

        <div class="sethead"><span></span><span>Kg</span><span>Reps</span><span></span></div>
        <div class="list" style="gap:6px">
          ${e.series.map((s, si) => `
            <div class="setrow ${s.hecha ? 'done' : ''}">
              <span class="n">${si + 1}</span>
              <input class="input num" type="number" inputmode="decimal" step="0.5"
                data-set="${ei}.${si}.kg" value="${s.kg ?? ''}" placeholder="${mej ? num(mej.kg, 1) : '—'}">
              <input class="input num" type="number" inputmode="numeric"
                data-set="${ei}.${si}.reps" value="${s.reps ?? ''}" placeholder="${esc(e.repsObjetivo)}">
              <button class="check ${s.hecha ? 'on' : ''}" data-hecha="${ei}.${si}"
                aria-label="Marcar serie ${si + 1}">&#10003;</button>
            </div>`).join('')}
        </div>

        <div class="row" style="gap:7px;margin-top:10px">
          <button class="btn ghost sm" data-addset="${ei}">+ Serie</button>
          <button class="btn ghost sm" data-delset="${ei}" ${e.series.length <= 1 ? 'disabled' : ''}>&minus; Serie</button>
        </div>
      </div>`;
    }).join('')}

    <button class="btn ghost full sm" id="addEjSesion">+ Añadir ejercicio a esta sesión</button>
    <button class="btn pri full xl" id="terminarSesion">Terminar entreno</button>
  </div>

  ${descanso ? `
    <div class="rest">
      <span>Descanso</span>
      <span class="t" id="restT">${mmss(descanso.seg)}</span>
      <button id="skipRest">Saltar</button>
    </div>` : ''}
  `;
}

// ------------------------------------------------------------------ mount

export function mount(root, ir, rerender) {
  volverARenderizar = rerender;
  if (sesion) return mountSesion(root, rerender);

  const p = S.perfil();
  const r = S.rutinaActiva(p);

  root.querySelector('#nuevaRutina')?.addEventListener('click', async () => {
    S.crearRutina('Mi rutina');
    toast('Rutina creada');
    rerender();
  });

  root.querySelector('#plantillaTP')?.addEventListener('click', () => {
    plantillaTorsoPierna();
    toast('Plantilla cargada — edítala a tu gusto');
    rerender();
  });

  root.querySelector('#verGuia')?.addEventListener('click', () => ir('ayuda'));
  root.querySelector('#importarRutinaIA')?.addEventListener('click', () => sheetImportarRutinaIA(rerender));

  root.querySelector('#editarNombre')?.addEventListener('click', async () => {
    const { pedir } = await import('./ui.js?v=4');
    const v = await pedir({ titulo: 'Nombre de la rutina', label: 'Nombre', valor: r.nombre });
    if (v) { r.nombre = v; S.save(); rerender(); }
  });

  root.querySelector('#nuevoDia')?.addEventListener('click', async () => {
    const { pedir } = await import('./ui.js?v=4');
    const v = await pedir({
      titulo: 'Nuevo día', label: 'Nombre del día',
      placeholder: 'Torso A, Pierna, Push…', ok: 'Crear',
    });
    if (!v) return;
    const d = S.crearDia(r.id, v);
    rerender();
    sheetEditarDia(d.id, rerender);
  });

  root.querySelectorAll('[data-editar]').forEach(b =>
    b.onclick = () => sheetEditarDia(b.dataset.editar, rerender));

  root.querySelectorAll('[data-empezar]').forEach(b =>
    b.onclick = () => empezar(b.dataset.empezar, rerender));

  root.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => {
    const i = Number(b.dataset.cal);
    abrirSheet(`${S.DIAS_LARGO[i][0].toUpperCase()}${S.DIAS_LARGO[i].slice(1)}`, `
      <div class="list">
        ${r.dias.map(d => `<button class="item ${p.calendario[i] === d.id ? 'on' : ''}"
          data-pick="${d.id}" style="width:100%;text-align:left;cursor:pointer">
          <span class="item-t" style="flex:1">${esc(d.nombre)}</span>
        </button>`).join('')}
        <button class="item ${!p.calendario[i] ? 'on' : ''}" data-pick="" style="width:100%;text-align:left;cursor:pointer">
          <span class="item-t" style="flex:1">Descanso</span>
        </button>
      </div>`, (bd) => {
      bd.querySelectorAll('[data-pick]').forEach(x => x.onclick = () => {
        p.calendario[i] = x.dataset.pick || null;
        S.save(); cerrarSheet(); rerender();
      });
    });
  });
}

function mountSesion(root, rerender) {
  root.querySelectorAll('[data-set]').forEach(inp => {
    inp.onchange = () => {
      const [ei, si, campo] = inp.dataset.set.split('.');
      const v = String(inp.value).replace(',', '.');
      sesion.ejercicios[ei].series[si][campo] = v === '' ? null : Number(v);
    };
  });

  root.querySelectorAll('[data-hecha]').forEach(b => b.onclick = () => {
    const [ei, si] = b.dataset.hecha.split('.').map(Number);
    const e = sesion.ejercicios[ei], s = e.series[si];
    // al marcar, si no puso datos, hereda del objetivo o de la serie anterior
    if (!s.hecha) {
      if (s.kg == null) {
        const prev = e.series[si - 1];
        const u = S.ultimaVez(e.nombre);
        const mej = u && S.mejorSerie(u.series);
        s.kg = prev?.kg ?? e.kgObjetivo ?? (mej ? mej.kg : null);
      }
      if (s.reps == null) s.reps = Number(String(e.repsObjetivo).match(/\d+/)?.[0]) || null;
      iniciarDescanso(e.descanso, rerender);
      vibrar(14);
    } else {
      s.hecha = false;
      rerender();
      return;
    }
    s.hecha = true;
    rerender();
  });

  root.querySelectorAll('[data-addset]').forEach(b => b.onclick = () => {
    const e = sesion.ejercicios[Number(b.dataset.addset)];
    const last = e.series[e.series.length - 1];
    e.series.push({ kg: last?.kg ?? null, reps: null, hecha: false });
    rerender();
  });

  root.querySelectorAll('[data-delset]').forEach(b => b.onclick = () => {
    const e = sesion.ejercicios[Number(b.dataset.delset)];
    if (e.series.length > 1) e.series.pop();
    rerender();
  });

  root.querySelector('#addEjSesion').onclick = () => sheetElegirEjercicio((nombre) => {
    sesion.ejercicios.push(nuevoEjSesion({ nombre, series: 3, reps: '10', kg: null, descanso: 90, nota: '' }));
    rerender();
  });

  root.querySelector('#cancelarSesion').onclick = async () => {
    const hechas = sesion.ejercicios.reduce((t, e) => t + e.series.filter(s => s.hecha).length, 0);
    if (hechas && !await confirmar('Salir sin guardar', `Llevas ${hechas} series marcadas. Se perderán.`, 'Salir igual')) return;
    pararDescanso();
    sesion = null;
    rerender();
  };

  root.querySelector('#terminarSesion').onclick = () => terminar(rerender);

  const skip = root.querySelector('#skipRest');
  if (skip) skip.onclick = () => { pararDescanso(); rerender(); };
}

// ------------------------------------------------------------------ acciones

const nuevoEjSesion = (e) => ({
  nombre: e.nombre,
  repsObjetivo: e.reps,
  kgObjetivo: e.kg,
  descanso: e.descanso || 90,
  nota: e.nota || '',
  series: Array.from({ length: e.series || 3 }, () => ({ kg: null, reps: null, hecha: false })),
});

function empezar(diaId, rerender) {
  const p = S.perfil();
  const r = S.rutinaActiva(p);
  const d = r.dias.find(x => x.id === diaId);
  if (!d || !d.ejercicios.length) return toast('Ese día no tiene ejercicios');
  sesion = {
    diaId: d.id,
    nombre: d.nombre,
    inicio: Date.now(),
    ejercicios: d.ejercicios.map(nuevoEjSesion),
  };
  rerender();
}

async function terminar(rerender) {
  const hechas = sesion.ejercicios.reduce((t, e) => t + e.series.filter(s => s.hecha).length, 0);
  if (!hechas) {
    if (!await confirmar('Sin series marcadas', 'No has marcado ninguna serie. ¿Guardar igualmente?', 'Guardar', false)) return;
  }
  const p = S.perfil();
  p.sesiones.push({
    id: S.uid(),
    fecha: S.todayISO(),
    diaId: sesion.diaId,
    nombre: sesion.nombre,
    duracion: Math.floor((Date.now() - sesion.inicio) / 1000),
    ejercicios: sesion.ejercicios.map(e => ({
      nombre: e.nombre,
      series: e.series.map(s => ({ kg: s.kg, reps: s.reps, hecha: s.hecha })),
    })),
  });
  S.save();
  pararDescanso();
  const vol = S.volumenSesion(p.sesiones[p.sesiones.length - 1]);
  sesion = null;
  rerender();
  toast(`Entreno guardado · ${num(vol)} kg movidos`);
}

// ------------------------------------------------------------------ descanso

function iniciarDescanso(seg, rerender) {
  pararDescanso();
  if (!seg) return;
  descanso = { seg, timer: null };
  descanso.timer = setInterval(() => {
    descanso.seg--;
    const el = document.querySelector('#restT');
    if (el) el.textContent = mmss(Math.max(0, descanso.seg));
    if (descanso.seg <= 0) {
      pararDescanso();
      vibrar([100, 60, 100]);
      toast('¡Siguiente serie!');
      rerender();
    }
  }, 1000);
}

function pararDescanso() {
  if (descanso?.timer) clearInterval(descanso.timer);
  descanso = null;
}

// ------------------------------------------------------------------ sheets

function sheetEditarDia(diaId, rerender) {
  const p = S.perfil();
  const r = S.rutinaActiva(p);
  const d = r.dias.find(x => x.id === diaId);
  if (!d) return;

  const pintar = () => {
    abrirSheet(d.nombre, `
      <div class="stack">
        <div class="list">
          ${d.ejercicios.map((e, i) => `
            <div class="card tight">
              <div class="row-b">
                <div style="flex:1;min-width:0">
                  <div class="item-t" style="font-size:13.5px">${esc(e.nombre)}</div>
                  <div class="item-s">${e.series} × ${esc(e.reps)}${e.kg ? ` · ${num(e.kg, 1)} kg` : ''} · ${e.descanso}s</div>
                </div>
                <div class="row" style="gap:5px">
                  <button class="btn ghost sm" data-up="${i}" ${i === 0 ? 'disabled' : ''}>&#9650;</button>
                  <button class="btn ghost sm" data-ed="${i}">&#9998;</button>
                  <button class="btn danger sm" data-rm="${i}">&#10005;</button>
                </div>
              </div>
            </div>`).join('')}
          ${!d.ejercicios.length ? '<div class="empty">Sin ejercicios. Añade el primero.</div>' : ''}
        </div>
        <button class="btn pri full" id="addEj">+ Añadir ejercicio</button>
        <div class="divider"></div>
        <button class="btn ghost full sm" id="renDia">Renombrar día</button>
        <button class="btn danger full sm" id="delDia">Eliminar día</button>
      </div>`, (b) => {
      b.querySelector('#addEj').onclick = () => sheetElegirEjercicio((nombre) => {
        sheetDatosEjercicio({ nombre }, (datos) => {
          S.crearEjercicio(r.id, d.id, datos);
          pintar(); rerender();
        });
      });
      b.querySelectorAll('[data-rm]').forEach(x => x.onclick = () => {
        d.ejercicios.splice(Number(x.dataset.rm), 1); S.save(); pintar(); rerender();
      });
      b.querySelectorAll('[data-up]').forEach(x => x.onclick = () => {
        const i = Number(x.dataset.up);
        [d.ejercicios[i - 1], d.ejercicios[i]] = [d.ejercicios[i], d.ejercicios[i - 1]];
        S.save(); pintar(); rerender();
      });
      b.querySelectorAll('[data-ed]').forEach(x => x.onclick = () => {
        const i = Number(x.dataset.ed);
        sheetDatosEjercicio(d.ejercicios[i], (datos) => {
          Object.assign(d.ejercicios[i], {
            nombre: datos.nombre, series: Number(datos.series) || 3, reps: datos.reps,
            kg: datos.kg === '' || datos.kg == null ? null : Number(datos.kg),
            descanso: Number(datos.descanso) || 90, nota: datos.nota,
          });
          S.save(); pintar(); rerender();
        });
      });
      b.querySelector('#renDia').onclick = async () => {
        const { pedir } = await import('./ui.js?v=4');
        const v = await pedir({ titulo: 'Renombrar día', label: 'Nombre', valor: d.nombre });
        if (v) { d.nombre = v; S.save(); pintar(); rerender(); }
      };
      b.querySelector('#delDia').onclick = async () => {
        if (!await confirmar('Eliminar día', `Se borra "${d.nombre}" y sus ejercicios.`, 'Eliminar')) return pintar();
        r.dias = r.dias.filter(x => x.id !== d.id);
        p.calendario = p.calendario.map(x => x === d.id ? null : x);
        S.save(); cerrarSheet(); rerender();
      };
    });
  };
  pintar();
}

function sheetElegirEjercicio(cb) {
  abrirSheet('Elegir ejercicio', `
    <div class="stack">
      <input class="input" id="bq" placeholder="Buscar o escribir uno nuevo…" autocomplete="off">
      <div class="list" id="bl"></div>
      <button class="btn pri full" id="bNuevo" hidden></button>
    </div>`, (b) => {
    const q = b.querySelector('#bq'), lista = b.querySelector('#bl'), nuevo = b.querySelector('#bNuevo');
    // ejercicios ya usados antes, arriba del todo
    const usados = [...new Set(S.perfil().sesiones.flatMap(s => s.ejercicios.map(e => e.nombre)))];
    const pintar = () => {
      const t = q.value.trim().toLowerCase();
      const pool = [...usados, ...LIBRERIA.filter(x => !usados.includes(x))];
      const res = pool.filter(x => x.toLowerCase().includes(t)).slice(0, 30);
      lista.innerHTML = res.map(x =>
        `<button class="item" data-pick="${esc(x)}" style="width:100%;text-align:left;cursor:pointer">
          <span class="item-t" style="flex:1">${esc(x)}</span>
          ${usados.includes(x) ? '<span class="pill b">usado</span>' : ''}
        </button>`).join('') || '';
      lista.querySelectorAll('[data-pick]').forEach(x =>
        x.onclick = () => { cerrarSheet(); cb(x.dataset.pick); });
      const exacto = pool.some(x => x.toLowerCase() === t);
      nuevo.hidden = !t || exacto;
      nuevo.textContent = `+ Crear "${q.value.trim()}"`;
    };
    nuevo.onclick = () => { const v = q.value.trim(); cerrarSheet(); cb(v); };
    q.oninput = pintar;
    pintar();
  });
}

function sheetDatosEjercicio(e, cb) {
  abrirSheet(e.nombre, `
    <div class="stack">
      <div class="grid2">
        <div class="field"><label class="label">Series</label>
          <input class="input num" id="fS" type="number" inputmode="numeric" value="${e.series ?? 3}"></div>
        <div class="field"><label class="label">Reps</label>
          <input class="input num" id="fR" value="${esc(e.reps ?? '10')}" placeholder="10 o 8-12"></div>
      </div>
      <div class="grid2">
        <div class="field"><label class="label">Peso objetivo (kg)</label>
          <input class="input num" id="fK" type="number" inputmode="decimal" step="0.5"
            value="${e.kg ?? ''}" placeholder="opcional"></div>
        <div class="field"><label class="label">Descanso (seg)</label>
          <input class="input num" id="fD" type="number" inputmode="numeric" value="${e.descanso ?? 90}"></div>
      </div>
      <div class="field"><label class="label">Nota &mdash; opcional</label>
        <input class="input" id="fN" value="${esc(e.nota ?? '')}" placeholder="Agarre cerrado, bajar lento…"></div>
      <button class="btn pri full" id="fOk">Guardar ejercicio</button>
    </div>`, (b) => {
    b.querySelector('#fOk').onclick = () => {
      cb({
        nombre: e.nombre,
        series: b.querySelector('#fS').value,
        reps: b.querySelector('#fR').value.trim() || '10',
        kg: b.querySelector('#fK').value,
        descanso: b.querySelector('#fD').value,
        nota: b.querySelector('#fN').value.trim(),
      });
      cerrarSheet();
    };
  });
}

// ------------------------------------------------------------------ plantilla

function plantillaTorsoPierna() {
  const p = S.perfil();
  const r = S.crearRutina('Torso / Pierna');
  const def = [
    ['Torso A', [
      ['Press banca', 4, '8-10', 90], ['Remo con barra', 4, '8-10', 90],
      ['Press militar', 3, '10-12', 75], ['Jalón al pecho', 3, '10-12', 75],
      ['Curl con barra', 3, '12', 60], ['Extensión de tríceps en polea', 3, '12', 60],
    ]],
    ['Pierna A', [
      ['Sentadilla', 4, '8-10', 120], ['Peso muerto rumano', 3, '10', 90],
      ['Prensa de piernas', 3, '12', 90], ['Curl femoral', 3, '12', 60],
      ['Elevación de gemelos', 4, '15', 45], ['Plancha', 3, '45s', 45],
    ]],
    ['Torso B', [
      ['Press inclinado con mancuernas', 4, '10', 90], ['Dominadas', 4, 'máximas', 90],
      ['Elevaciones laterales', 3, '15', 60], ['Remo en polea baja', 3, '12', 75],
      ['Curl martillo', 3, '12', 60], ['Fondos en banco', 3, '12', 60],
    ]],
    ['Pierna B', [
      ['Hip thrust', 4, '10-12', 90], ['Zancadas', 3, '12 por pierna', 90],
      ['Extensión de cuádriceps', 3, '15', 60], ['Peso muerto rumano', 3, '12', 90],
      ['Elevación de piernas', 3, '15', 45], ['Cinta 20 min', 1, '20 min', 0],
    ]],
  ];
  const ids = def.map(([nombre, ejs]) => {
    const d = S.crearDia(r.id, nombre);
    ejs.forEach(([n, s, reps, desc]) =>
      S.crearEjercicio(r.id, d.id, { nombre: n, series: s, reps, kg: null, descanso: desc }));
    return d.id;
  });
  // Lun, Mar, Jue, Vie
  p.calendario = [ids[0], ids[1], null, ids[2], ids[3], null, null];
  S.save();
}

// ------------------------------------------------------------------ importar rutina con IA
//
// Igual que la minuta: en vez de que el usuario teclee ejercicio por ejercicio, le pide
// a una IA que estructure la rutina que ya tiene (en la cabeza, en una hoja, en otra app)
// y pega el resultado aquí. Se parsea a días y ejercicios de golpe.

const PROMPT_IA_RUTINA = `Quiero organizar mi rutina de gym en un formato simple para importarla en una app.
Es MI rutina personal.

Escribe una línea "Día: <nombre>" por cada día de entreno, y debajo, una línea por cada
ejercicio de ese día así:

Ejercicio | Series | Reps | Descanso en segundos

Deja una línea en blanco entre cada día. Ejemplo de cómo quiero la respuesta:

Día: Torso A
Press banca | 4 | 8-10 | 90
Remo con barra | 4 | 8-10 | 90
Press militar | 3 | 10-12 | 75

Día: Pierna A
Sentadilla | 4 | 8-10 | 120
Peso muerto rumano | 3 | 10 | 90

No escribas nada más, solo esas líneas. Esta es mi rutina (te la describo o pego lo que tengo):
`;

function parsearRutinaIA(texto) {
  const bloques = texto.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const dias = [];
  for (const bloque of bloques) {
    const lineas = bloque.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lineas.length) continue;

    const m = lineas[0].match(/^d[ií]a\s*\d*\s*[:\-|]?\s*(.+)$/i);
    const nombreDia = m ? m[1].trim() : lineas[0].replace(/[:#*-]+$/, '').trim();
    if (!nombreDia) continue;

    const ejercicios = [];
    for (const linea of lineas.slice(m ? 1 : 1)) {
      const partes = (linea.includes('|') ? linea.split('|') : linea.split(' - ')).map(p => p.trim());
      if (!partes[0] || /^ejercicio$/i.test(partes[0])) continue;
      const [nombre, series, reps, descanso] = partes;
      ejercicios.push({
        nombre,
        series: parseInt(series, 10) || 3,
        reps: (reps || '10').trim(),
        descanso: parseInt(descanso, 10) || 90,
      });
    }
    if (ejercicios.length) dias.push({ nombre: nombreDia, ejercicios });
  }
  return dias;
}

function sheetImportarRutinaIA(rerender) {
  const p = S.perfil();
  const yaHay = S.rutinaActiva(p);
  abrirSheet('Importar rutina con IA', `
    <div class="stack">
      <p class="small muted" style="margin:0">
        Descríbele tu rutina a cualquier IA (ChatGPT, Claude, Gemini…) con estas instrucciones
        y pega aquí lo que te devuelva. Días, ejercicios, series y descanso, todo de golpe.
      </p>
      <button class="btn ghost full sm" id="riCopiar">Copiar instrucciones para la IA</button>
      <div class="field">
        <label class="label">Pega aquí la respuesta de la IA</label>
        <textarea class="input" id="riTexto" style="min-height:170px"
          placeholder="Día: Torso A
Press banca | 4 | 8-10 | 90
Remo con barra | 4 | 8-10 | 90

Día: Pierna A
Sentadilla | 4 | 8-10 | 120
…"></textarea>
      </div>
      <div id="riPrev"></div>
      <button class="btn pri full" id="riImportar" disabled>Revisa el texto para importar</button>
      ${yaHay ? `<p class="tiny dim center" style="margin:0">
        Esto reemplaza tu rutina "${esc(yaHay.nombre)}" actual.</p>` : ''}
    </div>`, (b) => {
    const ta = b.querySelector('#riTexto');
    const prev = b.querySelector('#riPrev');
    const btnOk = b.querySelector('#riImportar');

    b.querySelector('#riCopiar').onclick = async () => {
      try { await navigator.clipboard.writeText(PROMPT_IA_RUTINA); toast('Copiado — pégalo en tu IA'); }
      catch (e) { toast('Tu navegador no deja copiar aquí; selecciona el texto a mano'); }
    };

    let parseados = [];
    ta.oninput = () => {
      parseados = parsearRutinaIA(ta.value);
      if (!parseados.length) {
        prev.innerHTML = ta.value.trim()
          ? '<p class="tiny" style="color:var(--w);margin:0">No reconozco ese formato. Cada día empieza con "Día: nombre" y debajo, una línea por ejercicio.</p>'
          : '';
        btnOk.disabled = true;
        btnOk.textContent = 'Revisa el texto para importar';
        return;
      }
      const totalEj = parseados.reduce((t, d) => t + d.ejercicios.length, 0);
      prev.innerHTML = `
        <div class="card flat">
          <div class="tiny dim" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">
            Se importarán ${parseados.length} días · ${totalEj} ejercicios
          </div>
          <div class="list" style="gap:5px">
            ${parseados.map(d => `<div class="tiny muted">
              <b style="color:var(--tx)">${esc(d.nombre)}</b> — ${d.ejercicios.length} ejercicios</div>`).join('')}
          </div>
        </div>`;
      btnOk.disabled = false;
      btnOk.textContent = `Importar ${parseados.length} días`;
    };

    btnOk.onclick = async () => {
      if (!parseados.length) return;
      if (yaHay && !await confirmar('Reemplazar rutina',
        `Se borra "${yaHay.nombre}" y sus días, y se pone la rutina nueva.`, 'Reemplazar', false)) return;

      const r = S.crearRutina('Mi rutina (importada)');
      const ids = parseados.map(dia => {
        const d = S.crearDia(r.id, dia.nombre);
        dia.ejercicios.forEach(e => S.crearEjercicio(r.id, d.id, { ...e, kg: null }));
        return d.id;
      });
      // días de descanso: lo que no se pudo adivinar se deja sin asignar
      p.calendario = p.calendario.map(() => null);
      ids.forEach((id, i) => { if (i < 7) p.calendario[i] = id; });
      S.save();
      cerrarSheet();
      toast(`Rutina importada: ${parseados.length} días`);
      rerender();
    };
  });
}

export const haySesion = () => !!sesion;
