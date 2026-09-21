// store.js — estado, persistencia y utilidades de datos.
// Todo vive en localStorage. Cuando conectemos Supabase, sólo cambia save()/load().

const KEY = 'pique.v1';

export const uid = () => Math.random().toString(36).slice(2, 10);

export const todayISO = (d = new Date()) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};

export const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return todayISO(d);
};

export const dayOfWeek = (iso) => {
  // 0 = lunes ... 6 = domingo
  const d = new Date(iso + 'T12:00:00').getDay();
  return (d + 6) % 7;
};

export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DIAS_LARGO = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export const fmtFecha = (iso) => {
  const d = new Date(iso + 'T12:00:00');
  return `${DIAS_LARGO[dayOfWeek(iso)]} ${d.getDate()}/${d.getMonth() + 1}`;
};

// ---------------------------------------------------------------- plantillas

const comidasPorDefecto = () => ([
  { id: uid(), nombre: 'Desayuno', hora: '08:00', detalle: '', kcal: 0 },
  { id: uid(), nombre: 'Media mañana', hora: '11:00', detalle: '', kcal: 0 },
  { id: uid(), nombre: 'Almuerzo', hora: '14:00', detalle: '', kcal: 0 },
  { id: uid(), nombre: 'Merienda', hora: '17:30', detalle: '', kcal: 0 },
  { id: uid(), nombre: 'Cena', hora: '21:00', detalle: '', kcal: 0 },
]);

// Medidas con cinta métrica. Nada de fotos.
export const MEDIDAS = [
  { k: 'cuello',  n: 'Cuello',   ayuda: 'Justo debajo de la nuez, cinta horizontal.' },
  { k: 'pecho',   n: 'Pecho',    ayuda: 'A la altura de los pezones, al final de una espiración normal.' },
  { k: 'brazo',   n: 'Brazo',    ayuda: 'Bíceps relajado, punto medio entre hombro y codo.' },
  { k: 'cintura', n: 'Cintura',  ayuda: 'La parte más estrecha, normalmente encima del ombligo.' },
  { k: 'abdomen', n: 'Abdomen',  ayuda: 'A la altura del ombligo, sin meter tripa. Es el que más se mueve.' },
  { k: 'cadera',  n: 'Cadera',   ayuda: 'Por la parte más ancha del glúteo.' },
  { k: 'muslo',   n: 'Muslo',    ayuda: 'Punto medio entre ingle y rodilla, de pie.' },
  { k: 'gemelo',  n: 'Gemelo',   ayuda: 'La parte más gruesa de la pantorrilla.' },
];

const perfilNuevo = (nombre, color) => ({
  id: uid(),
  nombre,
  color,
  emoji: '',             // avatar opcional; si está vacío se usa la inicial
  // --- datos personales (onboarding)
  onboarding: false,
  nacimiento: null,      // 'YYYY-MM-DD' o edad como número
  edad: null,
  sexo: null,            // 'h' | 'm'
  alturaCm: null,
  actividad: 'ligera',   // sedentaria | ligera | activa
  nivel: 'antes',        // nunca | antes | regular
  diasGym: 4,
  prioridad: 'grasa',    // grasa | rapido | fuerza
  evita: '',
  // --- objetivo
  pesoInicial: null,
  pesoObjetivo: null,
  ritmoKgSemana: 0.5,
  desde: todayISO(),
  // --- nutrición
  kcalObjetivo: null,
  kcalFuente: 'calculada', // calculada | nutricionista
  proteinaObjetivo: null,
  // --- entrenamiento
  rutinas: [],
  rutinaActiva: null,
  calendario: [null, null, null, null, null, null, null], // dayId por día de semana
  sesiones: [],   // entrenos completados
  // --- seguimiento
  pesos: [],      // { fecha, kg, nota }
  medidas: [],    // { fecha, cuello, pecho, brazo, cintura, abdomen, cadera, muslo, gemelo }
  comidas: comidasPorDefecto(),
  marcadas: {},   // { 'YYYY-MM-DD': { comidaId: true } }
  registroComida: [], // { id, fecha, nombre, kcal, prot, carb, gras, gramos, codigo }
  creatina: {},   // { 'YYYY-MM-DD': true } — días que se tomó la creatina
});

const estadoInicial = () => {
  const a = perfilNuevo('Alonso', '#4ade80');
  const c = perfilNuevo('Cristóbal', '#60a5fa');
  const v = perfilNuevo('Vicente', '#f472b6');
  const j = perfilNuevo('Julio', '#fbbf24');
  a.emoji = '💪';
  c.emoji = '🔥';
  v.emoji = '👱‍♀️';   // la cara de rubia, como pidió Alonso
  j.emoji = '😎';
  return {
    version: 1,
    perfiles: [a, c, v, j],
    perfilActivo: a.id,
    creado: todayISO(),
    geminiKey: '',   // clave gratis de Google AI Studio; vive solo en este móvil
    workerUrl: '',   // URL del Worker de Cloudflare (open source); si está, se usa esta
    piqueOcultos: [], // ids de personas que NO quiero ver en el Pique
  };
};

// ---------------------------------------------------------------- persistencia

let S = null;
const oyentes = new Set();

export function load() {
  if (S) return S;
  try {
    const raw = localStorage.getItem(KEY);
    S = raw ? JSON.parse(raw) : estadoInicial();
  } catch (e) {
    console.warn('estado corrupto, empezando de cero', e);
    S = estadoInicial();
  }
  // migración defensiva: si faltan campos nuevos, rellenarlos
  S.perfiles.forEach(p => {
    const base = perfilNuevo('x', '#fff');
    for (const k of Object.keys(base)) if (p[k] === undefined) p[k] = base[k];
  });
  return S;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    console.error('no se pudo guardar', e);
  }
  oyentes.forEach(f => f(S));
}

export const onChange = (f) => { oyentes.add(f); return () => oyentes.delete(f); };

export const state = () => load();

// Foto del plato. Por dispositivo, no por perfil. Puede usar un Worker de Cloudflare
// (open source, sin exponer clave) o, como alternativa, una clave de Gemini.
export const geminiKey = () => load().geminiKey || '';
export function setGeminiKey(k) { load().geminiKey = (k || '').trim(); save(); }
export const workerUrl = () => load().workerUrl || '';
export function setWorkerUrl(u) { load().workerUrl = (u || '').trim(); save(); }
// ¿Está configurada alguna forma de analizar la foto?
export const iaFotoLista = () => !!(load().workerUrl || load().geminiKey);

// Pique: a quién NO mostrar en la comparativa (cada uno elige con quién compararse).
export const piqueOcultos = () => load().piqueOcultos || [];
export function togglePiqueOculto(id) {
  const s = load();
  s.piqueOcultos = s.piqueOcultos || [];
  const i = s.piqueOcultos.indexOf(id);
  if (i >= 0) s.piqueOcultos.splice(i, 1); else s.piqueOcultos.push(id);
  save();
}

export const perfil = () => {
  const s = load();
  return s.perfiles.find(p => p.id === s.perfilActivo) || s.perfiles[0];
};
export const otroPerfil = () => {
  const s = load();
  return s.perfiles.find(p => p.id !== s.perfilActivo) || null;
};
export const cambiarPerfil = (id) => { load().perfilActivo = id; save(); };

// La app arranca con 2 perfiles (el pique clásico), pero cualquiera puede sumarse:
// un grupo de gym, la familia, quien sea. No hay límite.
const PALETA = ['#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c', '#2dd4bf', '#f87171'];

export function crearPerfil(nombre, emoji = '') {
  const s = load();
  const color = PALETA[s.perfiles.length % PALETA.length];
  const p = perfilNuevo(String(nombre).trim() || 'Nuevo', color);
  p.emoji = emoji || '';
  s.perfiles.push(p);
  s.perfilActivo = p.id;
  save();
  return p;
}

// Lo que se muestra en el círculo del avatar: el emoji si lo eligió, si no la inicial.
export const avatar = (p) => (p && p.emoji) ? p.emoji : ((p?.nombre?.[0] || '?').toUpperCase());

export function eliminarPerfil(id) {
  const s = load();
  if (s.perfiles.length <= 1) return false; // siempre queda al menos uno
  s.perfiles = s.perfiles.filter(p => p.id !== id);
  if (s.perfilActivo === id) s.perfilActivo = s.perfiles[0].id;
  save();
  return true;
}

// ---------------------------------------------------------------- rutinas

export function rutinaActiva(p = perfil()) {
  return p.rutinas.find(r => r.id === p.rutinaActiva) || p.rutinas[0] || null;
}

export function diaDeHoy(p = perfil(), iso = todayISO()) {
  const r = rutinaActiva(p);
  if (!r) return null;
  const dayId = p.calendario[dayOfWeek(iso)];
  return r.dias.find(d => d.id === dayId) || null;
}

export function crearRutina(nombre) {
  const p = perfil();
  const r = { id: uid(), nombre: nombre || 'Mi rutina', dias: [] };
  p.rutinas.push(r);
  p.rutinaActiva = r.id;
  save();
  return r;
}

export function crearDia(rutinaId, nombre) {
  const p = perfil();
  const r = p.rutinas.find(x => x.id === rutinaId);
  if (!r) return null;
  const d = { id: uid(), nombre: nombre || `Día ${r.dias.length + 1}`, ejercicios: [] };
  r.dias.push(d);
  save();
  return d;
}

export function crearEjercicio(rutinaId, diaId, datos) {
  const p = perfil();
  const r = p.rutinas.find(x => x.id === rutinaId);
  const d = r && r.dias.find(x => x.id === diaId);
  if (!d) return null;
  const e = {
    id: uid(),
    nombre: datos.nombre || 'Ejercicio',
    series: Number(datos.series) || 3,
    reps: datos.reps || '10',
    kg: datos.kg === '' || datos.kg == null ? null : Number(datos.kg),
    descanso: Number(datos.descanso) || 90,
    nota: datos.nota || '',
  };
  d.ejercicios.push(e);
  save();
  return e;
}

// ---------------------------------------------------------------- historial de fuerza

// Última sesión registrada de un ejercicio (por nombre, para que sobreviva a ediciones)
export function ultimaVez(nombreEj, p = perfil()) {
  for (let i = p.sesiones.length - 1; i >= 0; i--) {
    const s = p.sesiones[i];
    const e = s.ejercicios.find(x => x.nombre === nombreEj);
    if (e) {
      const hechas = e.series.filter(x => x.hecha);
      if (hechas.length) return { fecha: s.fecha, series: hechas };
    }
  }
  return null;
}

export const mejorSerie = (series) =>
  series.reduce((b, s) => (s.kg || 0) > (b?.kg || 0) ? s : b, null);

// Volumen total de una sesión (kg movidos)
export const volumenSesion = (s) =>
  s.ejercicios.reduce((t, e) =>
    t + e.series.reduce((v, x) => v + (x.hecha ? (Number(x.kg) || 0) * (Number(x.reps) || 0) : 0), 0), 0);

// ---------------------------------------------------------------- racha

export function racha(p = perfil()) {
  const fechas = new Set(p.sesiones.map(s => s.fecha));
  let n = 0;
  let cur = todayISO();
  // si hoy no hay entreno todavía, la racha puede seguir viva desde ayer
  if (!fechas.has(cur)) cur = addDays(cur, -1);
  const r = rutinaActiva(p);
  let guarda = 0;
  while (guarda++ < 400) {
    if (fechas.has(cur)) { n++; cur = addDays(cur, -1); continue; }
    // los días de descanso programados no rompen la racha
    const esDescanso = r ? !p.calendario[dayOfWeek(cur)] : false;
    if (esDescanso && n > 0) { cur = addDays(cur, -1); continue; }
    break;
  }
  return n;
}

export function entrenosEstaSemana(p = perfil()) {
  const hoy = todayISO();
  const lunes = addDays(hoy, -dayOfWeek(hoy));
  return p.sesiones.filter(s => s.fecha >= lunes && s.fecha <= hoy).length;
}

export const objetivoSemanal = (p = perfil()) => p.calendario.filter(Boolean).length;

// ---------------------------------------------------------------- peso

export const pesoActual = (p = perfil()) => {
  if (!p.pesos.length) return p.pesoInicial ?? null;
  return [...p.pesos].sort((a, b) => a.fecha < b.fecha ? 1 : -1)[0].kg;
};

export function registrarPeso(kg, nota, fecha = todayISO()) {
  const p = perfil();
  const ya = p.pesos.find(x => x.fecha === fecha);
  if (ya) { ya.kg = kg; ya.nota = nota ?? ya.nota; }
  else p.pesos.push({ fecha, kg, nota: nota || '' });
  if (p.pesoInicial == null) { p.pesoInicial = kg; p.desde = fecha; }
  save();
}

export const pesosOrdenados = (p = perfil()) => [...p.pesos].sort((a, b) => a.fecha < b.fecha ? -1 : 1);

// Progreso hacia el objetivo, 0..1
export function progresoObjetivo(p = perfil()) {
  const ini = p.pesoInicial, obj = p.pesoObjetivo, act = pesoActual(p);
  if (ini == null || obj == null || act == null || ini === obj) return null;
  const t = (ini - act) / (ini - obj);
  return Math.max(0, Math.min(1, t));
}

// ---------------------------------------------------------------- medidas

export function registrarMedidas(vals, fecha = todayISO()) {
  const p = perfil();
  const limpio = {};
  MEDIDAS.forEach(m => {
    const v = parseFloat(String(vals[m.k] ?? '').replace(',', '.'));
    if (v > 0) limpio[m.k] = v;
  });
  if (!Object.keys(limpio).length) return false;
  const ya = p.medidas.find(x => x.fecha === fecha);
  if (ya) Object.assign(ya, limpio);
  else p.medidas.push({ fecha, ...limpio });
  save();
  return true;
}

export const medidasOrdenadas = (p = perfil()) =>
  [...p.medidas].sort((a, b) => a.fecha < b.fecha ? -1 : 1);

// Última y primera lectura de cada medida, para ver el cambio real.
export function cambioMedidas(p = perfil()) {
  const ord = medidasOrdenadas(p);
  return MEDIDAS.map(m => {
    const conDato = ord.filter(x => x[m.k] != null);
    if (!conDato.length) return { ...m, actual: null, inicial: null, dif: null };
    const inicial = conDato[0][m.k];
    const actual = conDato[conDato.length - 1][m.k];
    return { ...m, actual, inicial, dif: conDato.length > 1 ? actual - inicial : null };
  });
}

// ---------------------------------------------------------------- cálculo energético

const FACTOR_ACT = { sedentaria: 1.2, ligera: 1.375, activa: 1.55 };

// Mifflin-St Jeor: la fórmula estándar en consulta.
export function metabolismoBasal(p = perfil()) {
  const kg = pesoActual(p), cm = p.alturaCm, edad = p.edad;
  if (!kg || !cm || !edad || !p.sexo) return null;
  const base = 10 * kg + 6.25 * cm - 5 * edad;
  return Math.round(p.sexo === 'h' ? base + 5 : base - 161);
}

// Gasto total: basal × actividad diaria + lo que sumen los entrenos.
export function gastoDiario(p = perfil()) {
  const bmr = metabolismoBasal(p);
  if (!bmr) return null;
  const dias = p.calendario.filter(Boolean).length || p.diasGym || 0;
  const extraGym = Math.round((dias * 300) / 7); // ~300 kcal por sesión, repartido en la semana
  return Math.round(bmr * (FACTOR_ACT[p.actividad] || 1.375)) + extraGym;
}

// Calorías objetivo para el ritmo de pérdida elegido (1 kg graso ≈ 7700 kcal).
export function kcalRecomendadas(p = perfil()) {
  const gasto = gastoDiario(p);
  if (!gasto) return null;
  const deficit = Math.round((p.ritmoKgSemana || 0.5) * 7700 / 7);
  const suelo = p.sexo === 'h' ? 1500 : 1200; // no bajamos de aquí nunca
  return Math.max(suelo, gasto - deficit);
}

export function proteinaRecomendada(p = perfil()) {
  const kg = pesoActual(p);
  if (!kg) return null;
  return Math.round(kg * 1.8); // 1,8 g/kg protege el músculo en déficit
}

// ---------------------------------------------------------------- proyección

// Ritmo real medido con regresión sobre los últimos 28 días (kg por semana).
export function ritmoReal(p = perfil(), dias = 28) {
  const desde = addDays(todayISO(), -dias);
  const pts = pesosOrdenados(p).filter(x => x.fecha >= desde);
  if (pts.length < 3) return null;
  const t0 = new Date(pts[0].fecha + 'T12:00:00').getTime();
  const xs = pts.map(x => (new Date(x.fecha + 'T12:00:00').getTime() - t0) / 86400000);
  const ys = pts.map(x => x.kg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  if (!den) return null;
  const pend = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den;
  return pend * 7; // kg/semana (negativo = bajando)
}

// ¿Cuándo llego al objetivo? Devuelve estimación real y estimación al ritmo planeado.
export function proyeccion(p = perfil()) {
  const act = pesoActual(p), obj = p.pesoObjetivo;
  if (act == null || obj == null) return null;
  const restan = act - obj;
  if (restan <= 0) return { logrado: true, restan: 0 };

  const plan = p.ritmoKgSemana || 0.5;
  const semanasPlan = restan / plan;
  const real = ritmoReal(p);
  const bajando = real != null && real < -0.05;
  const semanasReal = bajando ? restan / Math.abs(real) : null;

  const fechaDe = (sem) => sem == null ? null : addDays(todayISO(), Math.round(sem * 7));

  return {
    logrado: false,
    restan: Math.round(restan * 10) / 10,
    plan,
    semanasPlan: Math.ceil(semanasPlan),
    fechaPlan: fechaDe(semanasPlan),
    ritmoReal: real == null ? null : Math.round(real * 100) / 100,
    semanasReal: semanasReal == null ? null : Math.ceil(semanasReal),
    fechaReal: fechaDe(semanasReal),
    // 4 kg/mes es el techo razonable; por encima se pierde músculo
    ritmoSano: plan <= 1,
  };
}

export const fmtFechaLarga = (iso) => {
  if (!iso) return '—';
  const M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const d = new Date(iso + 'T12:00:00');
  return `${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`;
};

// ---------------------------------------------------------------- adherencia

// % de comidas de la minuta cumplidas en los últimos N días.
export function adherencia(p = perfil(), dias = 7) {
  if (!p.comidas.length) return null;
  let hechas = 0, total = 0;
  for (let i = 0; i < dias; i++) {
    const f = addDays(todayISO(), -i);
    if (f < p.desde) break;
    total += p.comidas.length;
    hechas += Object.keys(p.marcadas[f] || {}).length;
  }
  return total ? hechas / total : null;
}

// ---------------------------------------------------------------- comidas

export function marcarComida(comidaId, fecha = todayISO()) {
  const p = perfil();
  p.marcadas[fecha] = p.marcadas[fecha] || {};
  if (p.marcadas[fecha][comidaId]) delete p.marcadas[fecha][comidaId];
  else p.marcadas[fecha][comidaId] = true;
  save();
}

export const comidasHechas = (fecha = todayISO(), p = perfil()) =>
  Object.keys(p.marcadas[fecha] || {}).length;

// ---------------------------------------------------------------- creatina
// Hábito diario con racha, para no olvidarla. A diferencia del gym, aquí no hay
// "días de descanso": la creatina se toma todos los días.

export const tomoCreatina = (fecha = todayISO(), p = perfil()) => !!(p.creatina && p.creatina[fecha]);

export function marcarCreatina(fecha = todayISO()) {
  const p = perfil();
  p.creatina = p.creatina || {};
  if (p.creatina[fecha]) delete p.creatina[fecha];
  else p.creatina[fecha] = true;
  save();
}

export function rachaCreatina(p = perfil()) {
  const dias = p.creatina || {};
  let n = 0;
  let cur = todayISO();
  // si hoy aún no la marca, la racha sigue viva desde ayer
  if (!dias[cur]) cur = addDays(cur, -1);
  let guarda = 0;
  while (guarda++ < 400 && dias[cur]) { n++; cur = addDays(cur, -1); }
  return n;
}

export function registrarAlimento(a) {
  const p = perfil();
  p.registroComida.push({ id: uid(), fecha: todayISO(), ...a });
  save();
}

export function borrarAlimento(id) {
  const p = perfil();
  p.registroComida = p.registroComida.filter(x => x.id !== id);
  save();
}

export function totalesDelDia(fecha = todayISO(), p = perfil()) {
  const items = p.registroComida.filter(x => x.fecha === fecha);
  const t = { kcal: 0, prot: 0, carb: 0, gras: 0 };
  items.forEach(x => {
    t.kcal += Number(x.kcal) || 0;
    t.prot += Number(x.prot) || 0;
    t.carb += Number(x.carb) || 0;
    t.gras += Number(x.gras) || 0;
  });
  // las comidas de la minuta con kcal declaradas también suman
  const marc = p.marcadas[fecha] || {};
  p.comidas.forEach(c => { if (marc[c.id]) t.kcal += Number(c.kcal) || 0; });
  Object.keys(t).forEach(k => t[k] = Math.round(t[k]));
  return { ...t, items };
}

// ---------------------------------------------------------------- import / export

export function exportar() {
  return JSON.stringify(load(), null, 2);
}

export function importar(texto) {
  const datos = JSON.parse(texto);
  if (!datos.perfiles || !Array.isArray(datos.perfiles)) throw new Error('El archivo no tiene el formato de Pique.');
  S = datos;
  save();
}

export function reiniciar() {
  S = estadoInicial();
  save();
}
