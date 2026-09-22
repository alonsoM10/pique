// view-comida.js — minuta del nutricionista, escáner de código de barras y registro de alimentos.
// Base de datos: Open Food Facts (abierta, gratuita, sin API key ni límite de peticiones).

import * as S from './store.js?v=13';
import { esc, num, toast, abrirSheet, cerrarSheet, confirmar, alCerrarSheet, vibrar } from './ui.js?v=13';
import { buscarLocal } from './alimentos-cl.js?v=13';

const OFF = 'https://world.openfoodfacts.org';
let lector = null;   // instancia de ZXing
let stream = null;   // MediaStream activo

// ------------------------------------------------------------------ render

export function render() {
  const p = S.perfil();
  const hoy = S.todayISO();
  const marc = p.marcadas[hoy] || {};
  const t = S.totalesDelDia(hoy, p);
  const objK = p.kcalObjetivo || 0;
  const pctK = objK ? Math.min(1, t.kcal / objK) : 0;

  return `
  <div class="stack">

    <div class="card">
      <div class="row-b" style="margin-bottom:11px">
        <div>
          <div class="tiny dim" style="font-weight:700;letter-spacing:.06em;text-transform:uppercase">Hoy</div>
          <div style="font-size:26px;font-weight:750;font-variant-numeric:tabular-nums;line-height:1.2">
            ${num(t.kcal)}<span style="font-size:13px;color:var(--tx-3)"> / ${num(objK)} kcal</span>
          </div>
        </div>
        <div class="center">
          <div style="font-size:19px;font-weight:750;color:${t.kcal > objK && objK ? 'var(--r)' : 'var(--a)'}">
            ${objK ? (objK - t.kcal >= 0 ? num(objK - t.kcal) : '+' + num(t.kcal - objK)) : '—'}
          </div>
          <div class="tiny dim">${objK && objK - t.kcal >= 0 ? 'te quedan' : 'pasado'}</div>
        </div>
      </div>
      <div class="bar"><i style="width:${pctK * 100}%;background:${t.kcal > objK && objK ? 'var(--r)' : 'var(--a)'}"></i></div>
      <div class="macro" style="margin-top:12px">
        <div><b>${num(t.prot)}g</b><span>Proteína</span></div>
        <div><b>${num(t.carb)}g</b><span>Carbos</span></div>
        <div><b>${num(t.gras)}g</b><span>Grasa</span></div>
        <div><b>${Object.keys(marc).length}/${p.comidas.length}</b><span>Comidas</span></div>
      </div>
    </div>

    <div class="grid2">
      <button class="btn blue" id="btnScan">&#9635; Escanear</button>
      <button class="btn" id="btnBuscar">&#128269; Buscar</button>
    </div>
    <button class="btn full sm" id="btnPlato">&#127859; Plato casero (varios ingredientes)</button>
    <button class="btn full sm" id="btnFoto">&#128247; Foto del plato (IA)</button>
    <input type="file" id="fotoPlato" accept="image/*" capture="environment" hidden>

    <div class="sec-title">Registrado hoy</div>
    ${t.items.length ? gruposRegistrado(p, t.items) :
      '<div class="list"><div class="empty"><span class="big">&#9635;</span>Escanea, busca o arma un plato casero</div></div>'}

    <div class="sec-title" style="margin-top:22px">Minuta de hoy</div>
    <div class="list">
      ${p.comidas.map(c => `
        <div class="item ${marc[c.id] ? 'on' : ''}">
          <button class="check ${marc[c.id] ? 'on' : ''}" data-marcar="${c.id}"
            aria-label="Marcar ${esc(c.nombre)}">&#10003;</button>
          <div style="flex:1;min-width:0">
            <div class="item-t">${esc(c.nombre)} <span class="dim tiny" style="font-weight:600">${esc(c.hora || '')}</span></div>
            <div class="item-s">${c.detalle ? esc(c.detalle) : 'Sin detalle'}${c.kcal ? ` · ${num(c.kcal)} kcal` : ''}</div>
          </div>
          <div class="row" style="gap:5px;flex:none">
            <button class="btn ghost sm" data-opciones="${c.id}" aria-label="Otras opciones para ${esc(c.nombre)}">
              &#129302;${c.alternativas?.length ? ` ${c.alternativas.length}` : ''}
            </button>
            <button class="btn ghost sm" data-edcomida="${c.id}">&#9998;</button>
          </div>
        </div>`).join('')}
      ${!p.comidas.length ? '<div class="empty">Toca <b>Cargar mi minuta</b> y pega el plan de tu nutricionista</div>' : ''}
    </div>
    ${p.comidas.length ? `<button class="btn blue full sm" id="opcionesMinuta">
      &#129302; Darme opciones de comida
    </button>` : ''}
    <div class="grid2">
      <button class="btn ghost sm" id="addComida">+ Añadir comida</button>
      <button class="btn ${p.comidas.length ? 'ghost' : 'pri'} sm" id="importarIA">&#128203; Cargar mi minuta</button>
    </div>

  </div>`;
}

// Agrupa lo comido hoy por comida (Desayuno, Almuerzo, Cena…), con subtotal por grupo,
// así puedes meter cosas en "Cena" y al final las ves juntas. Lo sin comida va a "Otros".
function gruposRegistrado(p, items) {
  const orden = p.comidas.map(c => c.nombre);
  const grupos = new Map();
  items.forEach(x => {
    const k = x.comidaNombre || 'Otros';
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(x);
  });
  const clave = (k) => { const i = orden.indexOf(k); return i < 0 ? 999 : i; };
  const ordenadas = [...grupos.entries()].sort((a, b) => clave(a[0]) - clave(b[0]));

  const filaItem = (x) => `
    <div class="item">
      <div style="flex:1;min-width:0">
        <div class="item-t" style="font-size:13.5px">${esc(x.nombre)}</div>
        <div class="item-s">
          ${x.gramos ? `${num(x.gramos)} g · ` : ''}${num(x.kcal)} kcal ·
          P${num(x.prot)} C${num(x.carb)} G${num(x.gras)}
        </div>
      </div>
      <button class="btn danger sm" data-rmali="${x.id}">&#10005;</button>
    </div>`;

  return ordenadas.map(([nombre, arr]) => {
    const kcal = arr.reduce((s, x) => s + (Number(x.kcal) || 0), 0);
    return `
      <div class="row-b" style="margin:12px 2px 5px">
        <span class="tiny dim" style="font-weight:700;letter-spacing:.05em;text-transform:uppercase">${esc(nombre)}</span>
        <span class="tiny dim" style="font-weight:700">${num(kcal)} kcal</span>
      </div>
      <div class="list">${arr.map(filaItem).join('')}</div>`;
  }).join('');
}

// ------------------------------------------------------------------ mount

export function mount(root, ir, rerender) {
  const p = S.perfil();

  root.querySelectorAll('[data-marcar]').forEach(b => b.onclick = () => {
    S.marcarComida(b.dataset.marcar);
    vibrar(10);
    rerender();
  });

  root.querySelectorAll('[data-rmali]').forEach(b => b.onclick = () => {
    S.borrarAlimento(b.dataset.rmali);
    rerender();
  });

  root.querySelectorAll('[data-edcomida]').forEach(b => b.onclick = () => {
    const c = p.comidas.find(x => x.id === b.dataset.edcomida);
    sheetComida(c, rerender);
  });

  root.querySelectorAll('[data-opciones]').forEach(b => b.onclick = () => {
    const c = p.comidas.find(x => x.id === b.dataset.opciones);
    sheetOpciones(c, rerender);
  });

  root.querySelector('#addComida').onclick = () => {
    const c = { id: S.uid(), nombre: '', hora: '', detalle: '', kcal: 0 };
    sheetComida(c, rerender, true);
  };

  root.querySelector('#btnScan').onclick = () => sheetEscaner(rerender);
  root.querySelector('#btnBuscar').onclick = () => sheetBuscar(rerender);
  root.querySelector('#btnPlato').onclick = () => sheetPlatoCasero(rerender);

  const inputFoto = root.querySelector('#fotoPlato');
  root.querySelector('#btnFoto').onclick = () => {
    if (!S.iaFotoLista()) {
      return sheetFotoSinClave();
    }
    inputFoto.value = '';
    inputFoto.click();
  };
  inputFoto.onchange = () => {
    const f = inputFoto.files && inputFoto.files[0];
    if (f) sheetFotoPlato(f, rerender);
  };
  root.querySelector('#importarIA').onclick = () => sheetImportarIA(rerender);
  root.querySelector('#opcionesMinuta')?.addEventListener('click', () => sheetOpcionesMinuta(rerender));
}

// ------------------------------------------------------------------ foto del plato (IA)

function sheetFotoSinClave() {
  abrirSheet('Foto del plato', `
    <div class="stack">
      <p class="small muted" style="margin:0">
        Falta configurar la IA que analiza la foto. Ve a <b>Ajustes → Foto del plato</b>
        y pon una de estas dos (se guarda solo en este móvil):
      </p>
      <div class="card flat">
        <div class="item-t" style="font-size:13.5px">Worker de Cloudflare (recomendado)</div>
        <div class="item-s">Open source y gratis. Se despliega una vez y pegas la URL. La clave no se expone.</div>
      </div>
      <div class="card flat">
        <div class="item-t" style="font-size:13.5px">O una clave de Gemini</div>
        <div class="item-s">Gratis en aistudio.google.com/apikey. Más rápido de poner, pero es de Google.</div>
      </div>
      <button class="btn pri full" id="fscOk">Ir a Ajustes lo hago luego</button>
    </div>`, (b) => {
    b.querySelector('#fscOk').onclick = () => cerrarSheet();
  });
}

function sheetFotoPlato(file, rerender) {
  abrirSheet('Foto del plato', `
    <div class="stack">
      <div id="fpEstado" class="center" style="padding:18px 0">
        <div class="small muted">Analizando la foto con Gemini…</div>
        <div class="tiny dim" style="margin-top:6px">Puede tardar unos segundos</div>
      </div>
    </div>`, async (b) => {
    const estado = b.querySelector('#fpEstado');
    let dato;
    try {
      const Gem = await import('./gemini.js?v=13');
      const base64 = await Gem.comprimirImagen(file);
      dato = await Gem.analizarPlato(base64);
    } catch (e) {
      estado.innerHTML = `<div class="small" style="color:var(--w)">${esc(e.message || 'No pude analizar la foto')}</div>
        <button class="btn ghost full sm" id="fpCerrar" style="margin-top:12px">Cerrar</button>`;
      b.querySelector('#fpCerrar').onclick = () => cerrarSheet();
      return;
    }

    if (!dato.kcal && /no es comida/i.test(dato.nombre)) {
      estado.innerHTML = `<div class="small muted">No parece comida. Prueba con otra foto.</div>
        <button class="btn ghost full sm" id="fpCerrar" style="margin-top:12px">Cerrar</button>`;
      b.querySelector('#fpCerrar').onclick = () => cerrarSheet();
      return;
    }

    // Resultado editable antes de registrar.
    estado.outerHTML = `
      <div class="stack">
        <p class="tiny dim" style="margin:0">Estimación de Gemini. Ajústala si hace falta y guárdala.</p>
        <div class="field"><label class="label">Qué es</label>
          <input class="input" id="fpN" value="${esc(dato.nombre)}"></div>
        <div class="grid2">
          <div class="field"><label class="label">Kcal</label>
            <input class="input num" id="fpK" type="number" inputmode="numeric" value="${dato.kcal}"></div>
          <div class="field"><label class="label">Proteína (g)</label>
            <input class="input num" id="fpP" type="number" inputmode="numeric" value="${dato.prot}"></div>
        </div>
        <div class="grid2">
          <div class="field"><label class="label">Carbos (g)</label>
            <input class="input num" id="fpC" type="number" inputmode="numeric" value="${dato.carb}"></div>
          <div class="field"><label class="label">Grasa (g)</label>
            <input class="input num" id="fpG" type="number" inputmode="numeric" value="${dato.gras}"></div>
        </div>
        <button class="btn pri full" id="fpGuardar">Registrar en hoy</button>
      </div>`;

    b.querySelector('#fpGuardar').onclick = () => {
      S.registrarAlimento({
        nombre: b.querySelector('#fpN').value.trim() || 'Plato',
        gramos: null,
        kcal: Number(b.querySelector('#fpK').value) || 0,
        prot: Number(b.querySelector('#fpP').value) || 0,
        carb: Number(b.querySelector('#fpC').value) || 0,
        gras: Number(b.querySelector('#fpG').value) || 0,
      });
      cerrarSheet();
      toast('Plato registrado');
      rerender();
    };
  });
}

// ------------------------------------------------------------------ cargar minuta
//
// La idea, en simple: pegas la minuta que te dio tu nutricionista (o el texto que te dé una
// IA si la tienes en PDF/foto), la app la entiende y la recuerda, y desde ahí te muestra en
// limpio qué puedes comer cada día. No guardamos el PDF entero — solo el texto ya ordenado.
//
// El parser acepta DOS formatos sin que el usuario tenga que saber cuál:
//   1) con barras:  Desayuno | 08:00 | 2 huevos, tostada, café | 420
//   2) natural:     "Desayuno (08:00): 2 huevos, tostada, café — 420 kcal"
//                   o el nombre de la comida en una línea y los alimentos debajo.

// Nombres de comida que reconocemos como "cabecera" (sin tildes, en minúscula).
const COMIDAS_CONOCIDAS = [
  ['desayuno', 'Desayuno'],
  ['media manana', 'Media mañana'],
  ['colacion', 'Colación'],
  ['almuerzo', 'Almuerzo'],
  ['comida', 'Comida'],
  ['merienda', 'Merienda'],
  ['once', 'Once'],
  ['cena', 'Cena'],
  ['recena', 'Recena'],
  ['snack', 'Snack'],
  ['pre-entreno', 'Pre-entreno'], ['pre entreno', 'Pre-entreno'], ['preentreno', 'Pre-entreno'],
  ['post-entreno', 'Post-entreno'], ['post entreno', 'Post-entreno'], ['postentreno', 'Post-entreno'],
  ['antes de dormir', 'Antes de dormir'],
];

const sinTildes = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Saca "08:00" y "450 kcal" de un texto y devuelve { hora, kcal, resto } ya limpio.
function extraerHoraKcal(txt) {
  let hora = '', kcal = 0, resto = txt;

  const mHora = resto.match(/\b(\d{1,2}:\d{2})\b/);
  if (mHora) { hora = mHora[1]; resto = resto.replace(mHora[0], ' '); }

  // "450 kcal" / "450 cal" / "450 calorías"
  let mKcal = resto.match(/(\d{2,4})\s*(?:kcal|cal\b|calor[ií]as?)/i);
  if (mKcal) { kcal = parseInt(mKcal[1], 10); resto = resto.replace(mKcal[0], ' '); }
  else {
    // un número suelto al final de la línea también cuenta como kcal
    const mFin = resto.match(/[|\-–—:·,]\s*(\d{2,4})\s*$/);
    if (mFin) { kcal = parseInt(mFin[1], 10); resto = resto.slice(0, mFin.index); }
  }

  resto = resto
    .replace(/\(\s*\)/g, ' ')              // paréntesis que quedaron vacíos, ej. la hora
    .replace(/\s*,\s*(?=,)/g, '')          // comas duplicadas: ", ," -> ","
    .replace(/^[\s:|\-–—,.]+/, '')         // separadores sueltos al principio
    .replace(/[\s:|\-–—,.]+$/, '')         // separadores sueltos al final
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { hora, kcal, resto };
}

// Detecta si una línea empieza por el nombre de una comida. Devuelve { nombre, resto } o null.
function cabeceraDeComida(linea) {
  const limpia = linea.replace(/^[\s\-*•–·]+/, '').replace(/^\d+[.)]\s*/, '').trim();
  const norm = sinTildes(limpia);
  for (const [clave, bonito] of COMIDAS_CONOCIDAS) {
    if (norm === clave || norm.startsWith(clave + ' ') || norm.startsWith(clave + ':') ||
        norm.startsWith(clave + ' (') || norm.startsWith(clave + '(') ||
        norm.startsWith(clave + ' -') || norm.startsWith(clave + ',')) {
      return { nombre: bonito, resto: limpia.slice(clave.length) };
    }
  }
  return null;
}

// Formato con barras: Nombre | Hora | Detalle | Kcal (tolera que falte hora o kcal).
function parsearBarras(texto) {
  const comidas = [];
  for (const linea of texto.split('\n').map(l => l.trim()).filter(Boolean)) {
    if (!linea.includes('|')) continue;
    const partes = linea.split('|').map(p => p.trim());
    if (partes.length < 2) continue;

    let kcal = 0;
    const ult = partes[partes.length - 1];
    if (/^\d{2,4}$/.test(ult.replace(/[^\d]/g, '')) && /\d/.test(ult)) {
      kcal = parseInt(partes.pop().replace(/[^\d]/g, ''), 10) || 0;
    }
    const [nombre, segundo, ...resto] = partes;
    if (!nombre || /^(nombre|comida|hora|detalle)$/i.test(nombre)) continue;

    const esHora = /^\d{1,2}:\d{2}$/.test(segundo || '');
    const hora = esHora ? segundo : '';
    const detalle = (esHora ? resto.join(', ') : [segundo, ...resto].join(', '))
      .replace(/\s{2,}/g, ' ').trim();
    comidas.push({ id: S.uid(), nombre, hora, detalle, kcal });
  }
  return comidas;
}

// Formato natural: cabecera de comida + alimentos en la misma línea o en las siguientes.
function parsearNatural(texto) {
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  const comidas = [];
  let actual = null;

  const cerrar = () => {
    if (!actual) return;
    const { hora, kcal, resto } = extraerHoraKcal(actual.buffer);
    comidas.push({ id: S.uid(), nombre: actual.nombre, hora, kcal, detalle: resto });
    actual = null;
  };

  for (const linea of lineas) {
    const cab = cabeceraDeComida(linea);
    if (cab) {
      cerrar();
      actual = { nombre: cab.nombre, buffer: cab.resto };
    } else if (actual) {
      actual.buffer += (actual.buffer ? ', ' : '') + linea;
    }
  }
  cerrar();
  return comidas.filter(c => c.detalle || c.kcal);
}

// Prueba primero barras; si no saca nada, prueba el formato natural.
function parsearMinuta(texto) {
  const conBarras = parsearBarras(texto);
  if (conBarras.length) return conBarras;
  return parsearNatural(texto);
}

const PROMPT_IA = `Tengo la minuta de mi nutricionista en un PDF (o foto) y quiero pasarla a texto simple.
Es MI plan personal. Escribe UNA línea por comida, sin numerar y sin texto de más, así:

Nombre | Hora | Qué como (con cantidades) | Kcal

Ejemplo:
Desayuno | 08:00 | 2 huevos revueltos, 1 tostada integral con aguacate, café solo | 420
Almuerzo | 14:00 | 150 g de pollo a la plancha, 200 g de arroz integral, ensalada | 650

Respeta las cantidades tal cual (gramos, tazas, unidades). Aquí está mi minuta:
`;

function sheetImportarIA(rerender) {
  const p = S.perfil();
  abrirSheet('Cargar mi minuta', `
    <div class="stack">
      <p class="small muted" style="margin:0">
        Pega aquí la minuta que te dio tu nutricionista. La app la recuerda y desde entonces te
        muestra en limpio qué puedes comer cada día. No guardamos el PDF, solo el texto.
      </p>
      <div class="field">
        <label class="label">Tu minuta</label>
        <textarea class="input" id="iaTexto" style="min-height:150px"
          placeholder="Puedes pegarla tal cual, por ejemplo:

Desayuno 08:00
2 huevos revueltos, 1 tostada integral con aguacate, café — 420 kcal

Almuerzo 14:00
150 g de pollo a la plancha, 200 g de arroz integral, ensalada — 650 kcal"></textarea>
      </div>
      <div id="iaPrev"></div>
      <button class="btn pri full" id="iaImportar" disabled>Pega tu minuta arriba</button>

      <details style="margin-top:2px">
        <summary class="small" style="cursor:pointer;color:var(--tx-2)">
          &#128247; ¿Tu minuta es un PDF o una foto?
        </summary>
        <div class="stack" style="margin-top:9px">
          <p class="tiny dim" style="margin:0">
            Pásasela a cualquier IA gratis (ChatGPT, Gemini, Copilot…) junto con estas
            instrucciones y pega aquí arriba lo que te devuelva.
          </p>
          <button class="btn ghost full sm" id="iaCopiar">Copiar instrucciones para la IA</button>
        </div>
      </details>

      <p class="tiny dim" style="margin:0">
        Es la minuta de <b>${esc(p.nombre)}</b>.
        ${S.otroPerfil() ? esc(S.otroPerfil().nombre) + ' carga la suya desde su propio perfil' : 'Cada persona carga la suya en su perfil'}.
      </p>
    </div>`, (b) => {
    const ta = b.querySelector('#iaTexto');
    const prev = b.querySelector('#iaPrev');
    const btnOk = b.querySelector('#iaImportar');

    b.querySelector('#iaCopiar').onclick = async () => {
      try { await navigator.clipboard.writeText(PROMPT_IA); toast('Copiado — pégalo en tu IA junto al PDF'); }
      catch (e) { toast('Tu navegador no deja copiar aquí; selecciona el texto a mano'); }
    };

    let parseadas = [];
    ta.oninput = () => {
      parseadas = parsearMinuta(ta.value);
      if (!parseadas.length) {
        prev.innerHTML = ta.value.trim()
          ? `<p class="tiny" style="color:var(--w);margin:0">
              No logro reconocer las comidas. Prueba a que cada comida empiece por su nombre
              (Desayuno, Almuerzo, Cena…) con los alimentos al lado o debajo.</p>`
          : '';
        btnOk.disabled = true;
        btnOk.textContent = 'Pega tu minuta arriba';
        return;
      }
      prev.innerHTML = `
        <div class="card flat">
          <div class="tiny dim" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:9px">
            Vas a poder comer
          </div>
          <div class="list" style="gap:9px">
            ${parseadas.map(c => `
              <div>
                <div class="small" style="font-weight:650">
                  ${esc(c.nombre)}${c.hora ? ` <span class="dim tiny">${esc(c.hora)}</span>` : ''}
                  ${c.kcal ? ` <span class="dim tiny">· ${c.kcal} kcal</span>` : ''}
                </div>
                <div class="tiny muted">${c.detalle ? esc(c.detalle) : 'sin detalle'}</div>
              </div>`).join('')}
          </div>
        </div>`;
      btnOk.disabled = false;
      btnOk.textContent = `Guardar mi minuta (${parseadas.length} comidas)`;
    };

    btnOk.onclick = async () => {
      if (!parseadas.length) return;
      if (p.comidas.length && !await confirmar('Reemplazar minuta',
        `Ya tienes ${p.comidas.length} comidas guardadas. Se cambian por estas ${parseadas.length}.`,
        'Reemplazar', false)) return;
      p.comidas = parseadas;
      S.save();
      cerrarSheet();
      toast('Minuta guardada — ya te muestro qué comer');
      rerender();
    };
  });
}

// ------------------------------------------------------------------ opciones / sustitutos con IA
//
// Cada comida de la minuta puede acumular "alternativas": otra cosa que comer en su lugar,
// con calorías parecidas, sugerida por una IA a partir de lo que YA come esa persona. Se guardan
// una vez y quedan para siempre — la próxima vez que toque esa comida no hay que volver a pedirla.

const promptAlternativa = (c) => `Este es mi plan para ${c.nombre.toLowerCase()}: ${c.detalle || '(sin detalle todavía)'}${c.kcal ? ` (~${c.kcal} kcal)` : ''}.

Dame UNA alternativa distinta que pueda comer en su lugar ese día, con calorías parecidas
(y macros parecidos si puedes) y que sea igual de fácil de preparar. Que sea algo distinto,
no una versión casi idéntica.

Respóndeme en una sola línea con este formato exacto, sin nada más:

Detalle | Kcal

Ejemplo:
150 g de pavo a la plancha, 200 g de boniato asado, ensalada verde | 480
`;

function parsearAlternativa(texto) {
  const linea = texto.split('\n').map(l => l.trim()).find(Boolean);
  if (!linea) return null;
  const partes = linea.split('|').map(p => p.trim());
  let kcal = 0;
  if (partes.length > 1 && /\d/.test(partes[partes.length - 1])) {
    kcal = parseInt(partes.pop().replace(/[^\d]/g, ''), 10) || 0;
  }
  const detalle = partes.join(' | ').trim();
  if (!detalle) return null;
  return { detalle, kcal };
}

function sheetOpciones(c, rerender) {
  const alternativas = c.alternativas || [];

  const pintar = () => {
    abrirSheet(`Opciones · ${c.nombre}`, `
      <div class="stack">
        <div class="card flat">
          <div class="tiny dim" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px">
            Lo que dice tu minuta
          </div>
          <div class="small" style="font-weight:600">${c.detalle ? esc(c.detalle) : 'Sin detalle todavía'}</div>
          ${c.kcal ? `<div class="tiny dim" style="margin-top:2px">${c.kcal} kcal</div>` : ''}
        </div>

        ${alternativas.length ? `
          <div class="sec-title" style="margin-left:0">Alternativas guardadas</div>
          <div class="list">
            ${alternativas.map((a, i) => `
              <div class="item tight">
                <div style="flex:1;min-width:0">
                  <div class="item-t" style="font-size:13.5px">${esc(a.detalle)}</div>
                  ${a.kcal ? `<div class="item-s">${a.kcal} kcal</div>` : ''}
                </div>
                <button class="btn sm" data-comi="${i}">Comí esto</button>
                <button class="btn ghost sm" data-quitaralt="${i}">&#10005;</button>
              </div>`).join('')}
          </div>` : ''}

        <button class="btn ghost full sm" id="opCopiar">Copiar instrucciones para pedirle una alternativa a la IA</button>
        <div class="field">
          <label class="label">Pega aquí lo que te responda</label>
          <textarea class="input" id="opTexto" style="min-height:70px"
            placeholder="150 g de pavo a la plancha, 200 g de boniato asado, ensalada | 480"></textarea>
        </div>
        <button class="btn pri full" id="opGuardar">Guardar como alternativa</button>
      </div>`, (b) => {
      b.querySelector('#opCopiar').onclick = async () => {
        try { await navigator.clipboard.writeText(promptAlternativa(c)); toast('Copiado — pégalo en tu IA'); }
        catch (e) { toast('Tu navegador no deja copiar aquí; selecciona el texto a mano'); }
      };

      b.querySelectorAll('[data-comi]').forEach(x => x.onclick = () => {
        const a = alternativas[Number(x.dataset.comi)];
        S.registrarAlimento({
          nombre: `${c.nombre}: ${a.detalle}`, gramos: null,
          kcal: a.kcal || 0, prot: 0, carb: 0, gras: 0,
        });
        cerrarSheet();
        toast('Registrado en el día de hoy');
        rerender();
      });

      b.querySelectorAll('[data-quitaralt]').forEach(x => x.onclick = () => {
        alternativas.splice(Number(x.dataset.quitaralt), 1);
        c.alternativas = alternativas;
        S.save();
        pintar();
      });

      b.querySelector('#opGuardar').onclick = () => {
        const parsed = parsearAlternativa(b.querySelector('#opTexto').value);
        if (!parsed) return toast('Pega la respuesta en formato Detalle | Kcal');
        alternativas.push(parsed);
        c.alternativas = alternativas;
        S.save();
        toast('Alternativa guardada');
        pintar();
      };
    });
  };
  pintar();
}

// ------------------------------------------------------------------ opciones de TODA la minuta, de una vez
//
// Lo que pidió Alonso: en vez de preguntarle al nutri por WhatsApp cada vez, la app arma un
// texto con la minuta entera y le pide a una IA gratis varias opciones por comida. Se pegan
// una sola vez y quedan guardadas como alternativas de cada comida — para siempre.

function promptOpcionesMinuta(comidas, n = 3) {
  const minuta = comidas.map(c =>
    `${c.nombre}${c.hora ? ` (${c.hora})` : ''}: ${c.detalle || '—'}${c.kcal ? ` — ${c.kcal} kcal` : ''}`
  ).join('\n');
  return `Esta es la minuta que me dio mi nutricionista:

${minuta}

Para CADA comida dame ${n} opciones distintas que pueda comer en su lugar, con las MISMAS
calorías aproximadas y un equilibrio nutricional parecido. Que sean realistas y fáciles.

Respóndeme EXACTAMENTE con este formato y nada más: el nombre de la comida en su propia línea,
y debajo cada opción en una línea que empiece con "- " y termine con "| kcal".

Ejemplo:
Desayuno
- 3 claras revueltas y avena con fruta | 450
- yogur griego con granola y miel | 450
- tortilla de 2 huevos con pan integral | 450

Ahora hazlo con mis comidas de arriba.`;
}

// Lee "Comida / - opción | kcal" y las asocia a las comidas reales de la minuta.
function parsearOpcionesMinuta(texto, comidas) {
  const res = comidas.map(c => ({ comida: c, opciones: [] }));
  const buscarComida = (norm) => res.find(r =>
    norm === sinTildes(r.comida.nombre) || norm.startsWith(sinTildes(r.comida.nombre)));

  let actual = null;
  for (const raw of texto.split('\n')) {
    const linea = raw.trim();
    if (!linea) continue;

    const esOpcion = /^[\-*•·]/.test(linea) || linea.includes('|');
    if (!esOpcion) {
      const limpio = linea.replace(/^\d+[.)]\s*/, '').replace(/:$/, '').trim();
      const hit = buscarComida(sinTildes(limpio));
      if (hit) { actual = hit; continue; }
    }
    if (!actual) continue;

    const t = linea.replace(/^[\s\-*•·]+/, '').replace(/^\d+[.)]\s*/, '').trim();
    if (!t) continue;
    const { kcal, resto } = extraerHoraKcal(t);
    if (resto) actual.opciones.push({ detalle: resto, kcal });
  }
  return res.filter(r => r.opciones.length);
}

function sheetOpcionesMinuta(rerender) {
  const p = S.perfil();
  if (!p.comidas.length) { toast('Primero carga tu minuta'); return; }
  const prompt = promptOpcionesMinuta(p.comidas);

  abrirSheet('Opciones de comida', `
    <div class="stack">
      <p class="small muted" style="margin:0">
        Copia este texto y pégalo en cualquier IA gratis (ChatGPT, Gemini, Copilot…). Te dará
        varias opciones para cada comida de tu minuta. Traes la respuesta aquí y quedan guardadas:
        así ya no preguntas al nutri cada vez que no sabes qué comer.
      </p>
      <button class="btn blue full" id="omCopiar">&#128203; Copiar el texto para la IA</button>
      <div class="field">
        <label class="label">Pega aquí la respuesta de la IA</label>
        <textarea class="input" id="omTexto" style="min-height:150px"
          placeholder="Desayuno
- 3 claras y avena con fruta | 450
- yogur griego con granola | 450

Almuerzo
- ..."></textarea>
      </div>
      <div id="omPrev"></div>
      <button class="btn pri full" id="omGuardar" disabled>Pega la respuesta arriba</button>
    </div>`, (b) => {
    b.querySelector('#omCopiar').onclick = async () => {
      try { await navigator.clipboard.writeText(prompt); toast('Copiado — pégalo en tu IA'); }
      catch (e) { toast('Tu navegador no deja copiar aquí; selecciona el texto a mano'); }
    };

    let res = [];
    b.querySelector('#omTexto').oninput = (e) => {
      res = parsearOpcionesMinuta(e.target.value, p.comidas);
      const total = res.reduce((t, r) => t + r.opciones.length, 0);
      const prev = b.querySelector('#omPrev');
      const btn = b.querySelector('#omGuardar');
      if (!total) {
        prev.innerHTML = e.target.value.trim()
          ? `<p class="tiny" style="color:var(--w);margin:0">
              No reconozco opciones. Pon cada comida en una línea (Desayuno, Almuerzo…) y sus
              opciones debajo, empezando con "-".</p>` : '';
        btn.disabled = true; btn.textContent = 'Pega la respuesta arriba';
        return;
      }
      prev.innerHTML = `
        <div class="card flat"><div class="list" style="gap:11px">
          ${res.map(r => `
            <div>
              <div class="small" style="font-weight:650">
                ${esc(r.comida.nombre)} <span class="dim tiny">· ${r.opciones.length} opciones</span>
              </div>
              ${r.opciones.map(o => `<div class="tiny muted">• ${esc(o.detalle)}${o.kcal ? ` · ${o.kcal} kcal` : ''}</div>`).join('')}
            </div>`).join('')}
        </div></div>`;
      btn.disabled = false; btn.textContent = `Guardar ${total} opciones`;
    };

    b.querySelector('#omGuardar').onclick = () => {
      if (!res.length) return;
      res.forEach(r => { r.comida.alternativas = r.opciones; });
      S.save();
      cerrarSheet();
      toast('Opciones guardadas para cada comida');
      rerender();
    };
  });
}

// ------------------------------------------------------------------ minuta

function sheetComida(c, rerender, esNueva = false) {
  const p = S.perfil();
  abrirSheet(esNueva ? 'Nueva comida' : c.nombre || 'Comida', `
    <div class="stack">
      <div class="grid2">
        <div class="field"><label class="label">Nombre</label>
          <input class="input" id="cN" value="${esc(c.nombre)}" placeholder="Almuerzo"></div>
        <div class="field"><label class="label">Hora</label>
          <input class="input" id="cH" value="${esc(c.hora)}" placeholder="14:00"></div>
      </div>
      <div class="field"><label class="label">Qué toca (de la minuta)</label>
        <textarea class="input" id="cD" placeholder="150 g pollo a la plancha, 200 g arroz integral, ensalada…">${esc(c.detalle)}</textarea></div>
      <div class="field"><label class="label">Kcal aproximadas &mdash; opcional</label>
        <input class="input num" id="cK" type="number" inputmode="numeric" value="${c.kcal || ''}" placeholder="0"></div>
      <button class="btn pri full" id="cOk">Guardar</button>
      ${esNueva ? '' : '<button class="btn danger full sm" id="cDel">Eliminar comida</button>'}
    </div>`, (b) => {
    b.querySelector('#cOk').onclick = () => {
      c.nombre = b.querySelector('#cN').value.trim() || 'Comida';
      c.hora = b.querySelector('#cH').value.trim();
      c.detalle = b.querySelector('#cD').value.trim();
      c.kcal = Number(b.querySelector('#cK').value) || 0;
      if (esNueva) p.comidas.push(c);
      S.save(); cerrarSheet(); rerender();
    };
    b.querySelector('#cDel')?.addEventListener('click', async () => {
      if (!await confirmar('Eliminar comida', `Se quita "${c.nombre}" de la minuta.`, 'Eliminar')) return;
      p.comidas = p.comidas.filter(x => x.id !== c.id);
      S.save(); cerrarSheet(); rerender();
    });
  });
}

// ------------------------------------------------------------------ escáner

function sheetEscaner(rerender) {
  abrirSheet('Escanear producto', `
    <div class="stack">
      <div id="reader"><video id="vid" playsinline muted autoplay></video></div>
      <p class="tiny dim center" id="scanMsg" style="margin:0">Pidiendo permiso de cámara…</p>
      <button class="btn blue full" id="scanFotoBtn">&#128247; ¿No lee? Toma una foto del código</button>
      <input type="file" id="scanFoto" accept="image/*" capture="environment" hidden>
      <div class="divider"></div>
      <div class="field">
        <label class="label">O escribe el código de barras a mano</label>
        <div class="row">
          <input class="input num" id="manIn" inputmode="numeric" placeholder="7804660620683" style="flex:1">
          <button class="btn" id="manOk">Buscar</button>
        </div>
      </div>
    </div>`, (b) => {
    const msg = b.querySelector('#scanMsg');
    const hallado = (codigo) => { vibrar([60, 40, 60]); pararCamara(); buscarPorCodigo(codigo, rerender); };

    b.querySelector('#manOk').onclick = () => {
      const v = b.querySelector('#manIn').value.trim();
      if (v) { pararCamara(); buscarPorCodigo(v, rerender); }
    };

    // Plan B (el fiable en iPhone): tomar una foto del código y leerla de la imagen.
    const foto = b.querySelector('#scanFoto');
    b.querySelector('#scanFotoBtn').onclick = () => { pararCamara(); foto.value = ''; foto.click(); };
    foto.onchange = () => {
      const f = foto.files && foto.files[0];
      if (f) decodarFoto(f, msg, hallado);
    };

    arrancarCamara(b.querySelector('#vid'), msg, hallado);
    alCerrarSheet(pararCamara);
  });
}

// Lee el código de barras de una FOTO (no del video en vivo). En iPhone es mucho más
// fiable: la cámara nativa enfoca bien y el usuario encuadra el código con calma.
async function decodarFoto(file, msg, onCodigo) {
  msg.textContent = 'Leyendo la foto…';
  msg.style.color = '';
  try {
    if (!window.ZXing) {
      await cargarScript('https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js');
    }
    const hints = new Map();
    const F = window.ZXing.BarcodeFormat;
    hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS,
      [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF]);
    hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);
    const reader = new window.ZXing.BrowserMultiFormatReader(hints);
    const url = URL.createObjectURL(file);
    try {
      const res = await reader.decodeFromImageUrl(url);
      if (res && res.getText) return onCodigo(res.getText());
      throw new Error('sin resultado');
    } finally {
      URL.revokeObjectURL(url);
      try { reader.reset(); } catch (e) { /* noop */ }
    }
  } catch (e) {
    console.error('foto codigo', e);
    msg.innerHTML = 'No encontré el código en esa foto. Prueba otra bien <b>de frente</b>, con el código <b>plano</b> y buena luz — o escríbelo a mano abajo.';
    msg.style.color = 'var(--w)';
  }
}

async function arrancarCamara(video, msg, onCodigo) {
  // Resolución alta + enfoque continuo: clave para que lea el código en iPhone.
  const CONSTRAINTS = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 }, height: { ideal: 1080 },
      advanced: [{ focusMode: 'continuous' }],
    },
    audio: false,
  };
  let usado = false;
  const usar = (codigo) => { if (usado) return; usado = true; onCodigo(codigo); };
  const ok = (t) => {
    msg.textContent = t; msg.style.color = '';
    // Si a los 6 s no leyó nada, damos una pista de encuadre (suele ser enfoque/distancia).
    setTimeout(() => { if (!usado) msg.innerHTML = 'Acerca el código a <b>~15 cm</b>, con buena luz y que se vea <b>nítido</b> (no borroso). Si no, escríbelo a mano abajo.'; }, 6000);
  };
  const fallo = (t) => { msg.innerHTML = t; msg.style.color = 'var(--w)'; };
  // Traduce el error real a algo que se entienda (y que nos diga qué pasa).
  const explicar = (e) => {
    const n = (e && e.name) || '';
    if (n === 'NotAllowedError') return 'La cámara está bloqueada. En iPhone: Ajustes &rsaquo; Apps &rsaquo; Safari &rsaquo; Cámara &rarr; Permitir (o toca “AA” en la barra &rsaquo; Ajustes del sitio). Luego reintenta, o escribe el código a mano.';
    if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No encontré la cámara trasera. Escribe el código a mano.';
    if (n === 'NotReadableError') return 'La cámara está ocupada por otra app. Ciérrala y reintenta.';
    return `No pude abrir la cámara [${n || (e && e.message) || 'desconocido'}]. Prueba abrir la app en Safari (no desde el icono del inicio), o escribe el código a mano.`;
  };

  // 1) API nativa BarcodeDetector (Chrome Android): rápida y sin descargas.
  if ('BarcodeDetector' in window) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
      video.srcObject = stream;
      await video.play();
      ok('Cámara lista — apunta al código de barras');
      const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
      const tick = async () => {
        if (!stream || usado) return;
        try {
          const cods = await det.detect(video);
          if (cods.length && cods[0].rawValue) return usar(cods[0].rawValue);
        } catch (e) { /* frame no listo */ }
        requestAnimationFrame(tick);
      };
      tick();
      return;
    } catch (e) {
      if (e && e.name === 'NotAllowedError') return fallo(explicar(e));
      /* otros errores: cae a ZXing por si acaso */
    }
  }

  // 2) ZXing (Safari iOS y el resto): que ZXing maneje la cámara, es más fiable.
  msg.textContent = 'Abriendo cámara…';
  try {
    if (!window.ZXing) {
      await cargarScript('https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js');
    }
  } catch (e) {
    return fallo('No pude cargar el lector de códigos (¿sin internet?). Escribe el código a mano.');
  }

  try {
    const hints = new Map();
    const F = window.ZXing.BarcodeFormat;
    hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS,
      [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128]);
    hints.set(window.ZXing.DecodeHintType.TRY_HARDER, true);
    lector = new window.ZXing.BrowserMultiFormatReader(hints, 150);
    await lector.decodeFromConstraints(CONSTRAINTS, video, (res, err) => {
      if (res && res.getText) usar(res.getText());
    });
    ok('Cámara lista — apunta al código de barras');
  } catch (e) {
    console.error('escaner', e);
    fallo(explicar(e));
  }
}

function pararCamara() {
  try { lector?.reset(); } catch (e) { /* noop */ }
  lector = null;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

function cargarScript(src) {
  return new Promise((ok, err) => {
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => err(new Error('script'));
    document.head.appendChild(s);
  });
}

// ------------------------------------------------------------------ Open Food Facts

const kcalDe = (n) =>
  Number(n['energy-kcal_100g']) ||
  (Number(n['energy_100g']) ? Number(n['energy_100g']) / 4.184 : 0);

const normaliza = (prod) => ({
  codigo: prod.code || '',
  nombre: [prod.product_name, prod.brands].filter(Boolean).join(' · ') || 'Producto sin nombre',
  por100: {
    kcal: Math.round(kcalDe(prod.nutriments || {})),
    prot: Math.round((Number(prod.nutriments?.proteins_100g) || 0) * 10) / 10,
    carb: Math.round((Number(prod.nutriments?.carbohydrates_100g) || 0) * 10) / 10,
    gras: Math.round((Number(prod.nutriments?.fat_100g) || 0) * 10) / 10,
  },
});

async function buscarPorCodigo(codigo, rerender) {
  abrirSheet('Buscando…', '<div class="empty">Consultando Open Food Facts…</div>');
  try {
    const r = await fetch(`${OFF}/api/v2/product/${encodeURIComponent(codigo)}.json` +
      '?fields=code,product_name,brands,nutriments');
    const j = await r.json();
    if (j.status !== 1 || !j.product) {
      return sheetNoEncontrado(codigo, rerender);
    }
    sheetPorcion(normaliza(j.product), rerender);
  } catch (e) {
    cerrarSheet();
    toast('Sin conexión — inténtalo luego');
  }
}

// ------------------------------------------------------------------ ¿en qué comida?
//
// Al registrar algo, eliges a qué comida va (Desayuno, Almuerzo, Cena…). Por defecto
// sugiere la comida más cercana a la hora actual. Luego "Registrado hoy" las agrupa.

function comidaSugerida(p) {
  const now = new Date();
  const min = now.getHours() * 60 + now.getMinutes();
  let best = null, bd = Infinity;
  for (const c of p.comidas) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(c.hora || '');
    if (!m) continue;
    const cm = (+m[1]) * 60 + (+m[2]);
    const d = Math.abs(cm - min);
    if (d < bd) { bd = d; best = c; }
  }
  return best || p.comidas[0] || null;
}

function selectComida(p, selId = null) {
  if (!p.comidas.length) return '';
  const sug = selId || (comidaSugerida(p) && comidaSugerida(p).id);
  return `
    <div class="field">
      <label class="label">¿En qué comida?</label>
      <select class="input" id="pComida">
        ${p.comidas.map(c => `<option value="${c.id}" ${c.id === sug ? 'selected' : ''}>${esc(c.nombre)}${c.hora ? ` (${esc(c.hora)})` : ''}</option>`).join('')}
        <option value="__otro">Otro / sin comida</option>
      </select>
    </div>`;
}

function leerComidaSel(b, p) {
  const sel = b.querySelector('#pComida');
  if (!sel || sel.value === '__otro' || !sel.value) return { comidaId: '', comidaNombre: '' };
  const c = p.comidas.find(x => x.id === sel.value);
  return c ? { comidaId: c.id, comidaNombre: c.nombre } : { comidaId: '', comidaNombre: '' };
}

// ------------------------------------------------------------------ plato casero
//
// Escribes varios ingredientes con sus gramos y la app calcula las calorías sola con la
// tabla chilena. Si algo no está en la tabla, hay un atajo para pedírselo a una IA (pegar
// respuesta). Lo pediste para comida sin código de barras: feria, JUNAEB, comida de casa.

function parsearIngredientes(texto) {
  return texto.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean).map(tr => {
    const m = /(\d+(?:[.,]\d+)?)\s*(?:kg|g|gr|grs|gramos)?/i.exec(tr);
    let gramos = m ? parseFloat(m[1].replace(',', '.')) : null;
    if (m && /kg/i.test(m[0])) gramos *= 1000;
    if (gramos != null) gramos = Math.round(gramos);
    let nombre = m ? (tr.slice(0, m.index) + ' ' + tr.slice(m.index + m[0].length)) : tr;
    nombre = nombre.replace(/\bde\b/gi, ' ').replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
    return { gramos, nombre, crudo: tr };
  }).filter(i => i.nombre);
}

const promptPlatoIA = (ings) => `Calcula las calorías y los macros TOTALES de este plato, con estas cantidades exactas:
${ings.map(i => `- ${i.gramos ? i.gramos + ' g ' : ''}${i.nombre}`).join('\n')}

Respóndeme SOLO con una línea con este formato, sin nada más:
Kcal | Proteína g | Carbohidratos g | Grasa g
Ejemplo: 520 | 45 | 12 | 30`;

function parsearMacrosIA(txt) {
  const partes = String(txt).split('|').map(s => parseFloat(s.replace(/[^\d.,]/g, '').replace(',', '.')));
  if (!(partes[0] > 0)) return null;
  return {
    kcal: Math.round(partes[0] || 0), prot: Math.round(partes[1] || 0),
    carb: Math.round(partes[2] || 0), gras: Math.round(partes[3] || 0),
  };
}

function sheetPlatoCasero(rerender) {
  const p = S.perfil();
  abrirSheet('Plato casero', `
    <div class="stack">
      <p class="small muted" style="margin:0">
        Escribe lo que comiste con sus <b>gramos</b>, uno por línea. La app calcula las calorías
        sola. Ideal para comida sin código de barras (feria, JUNAEB, casa).
      </p>
      <div class="field">
        <textarea class="input" id="pcTexto" style="min-height:100px" placeholder="200 g bistec de vacuno
100 g cebolla
100 g pimentón
150 g arroz cocido"></textarea>
      </div>
      <div class="field"><label class="label">Nombre del plato &mdash; opcional</label>
        <input class="input" id="pcNombre" placeholder="Bistec a lo pobre"></div>
      ${selectComida(p)}
      <div class="card flat" id="pcResu"><div class="tiny dim">Escribe arriba para calcular…</div></div>
      <button class="btn pri full xl" id="pcOk" disabled>Agregar al día</button>

      <details style="margin-top:2px">
        <summary class="tiny dim" style="cursor:pointer">¿Un alimento no está en la lista? Calcúlalo con una IA</summary>
        <div class="stack" style="margin-top:9px">
          <button class="btn ghost full sm" id="pcCopiar">Copiar texto para pegar en la IA</button>
          <div class="field"><label class="label">Pega la respuesta (Kcal | Prot | Carbo | Grasa)</label>
            <input class="input" id="pcIA" placeholder="520 | 45 | 12 | 30"></div>
          <button class="btn full sm" id="pcUsarIA">Usar ese total de la IA</button>
        </div>
      </details>
    </div>`, (b) => {
    const ta = b.querySelector('#pcTexto');
    const resu = b.querySelector('#pcResu');
    const ok = b.querySelector('#pcOk');
    let total = null, ings = [];

    const calc = () => {
      ings = parsearIngredientes(ta.value);
      if (!ings.length) {
        resu.innerHTML = '<div class="tiny dim">Escribe arriba para calcular…</div>';
        ok.disabled = true; total = null; return;
      }
      let kcal = 0, prot = 0, carb = 0, gras = 0; const faltan = [];
      const detalle = ings.map(i => {
        const hit = buscarLocal(i.nombre)[0];
        if (hit && i.gramos) {
          const f = i.gramos / 100;
          kcal += hit.por100.kcal * f; prot += hit.por100.prot * f;
          carb += hit.por100.carb * f; gras += hit.por100.gras * f;
          return `<div class="tiny"><b>${i.gramos} g</b> ${esc(hit.nombre)} · ${num(hit.por100.kcal * f)} kcal</div>`;
        }
        faltan.push(i);
        return `<div class="tiny" style="color:var(--w)">? ${esc(i.crudo)} — no lo encuentro</div>`;
      }).join('');
      total = { kcal: Math.round(kcal), prot: Math.round(prot), carb: Math.round(carb), gras: Math.round(gras) };
      resu.innerHTML = `${detalle}
        <div class="divider"></div>
        <div class="row-b"><span class="small">Total</span>
          <span style="font-size:19px;font-weight:750">${num(total.kcal)} kcal</span></div>
        <div class="tiny dim">P ${num(total.prot)} · C ${num(total.carb)} · G ${num(total.gras)} g${faltan.length ? ` · ${faltan.length} sin datos (usa la IA abajo)` : ''}</div>`;
      ok.disabled = false;
    };
    ta.oninput = calc;

    b.querySelector('#pcCopiar').onclick = async () => {
      const t = promptPlatoIA(parsearIngredientes(ta.value));
      try { await navigator.clipboard.writeText(t); toast('Copiado — pégalo en tu IA'); }
      catch (e) { toast('No pude copiar; selecciónalo a mano'); }
    };
    b.querySelector('#pcUsarIA').onclick = () => {
      const m = parsearMacrosIA(b.querySelector('#pcIA').value);
      if (!m) return toast('Formato: Kcal | Prot | Carbo | Grasa');
      total = m; ok.disabled = false;
      resu.innerHTML = `<div class="row-b"><span class="small">Total (IA)</span>
          <span style="font-size:19px;font-weight:750">${num(m.kcal)} kcal</span></div>
        <div class="tiny dim">P ${num(m.prot)} · C ${num(m.carb)} · G ${num(m.gras)} g</div>`;
    };

    b.querySelector('#pcOk').onclick = () => {
      if (!total) return;
      const sel = leerComidaSel(b, p);
      const nombre = b.querySelector('#pcNombre').value.trim() ||
        (ings.length ? ings.map(i => i.nombre).slice(0, 3).join(', ') : 'Plato casero');
      S.registrarAlimento({
        nombre, gramos: null,
        kcal: total.kcal, prot: total.prot, carb: total.carb, gras: total.gras,
        comidaId: sel.comidaId, comidaNombre: sel.comidaNombre,
      });
      cerrarSheet();
      toast('Plato agregado');
      rerender();
    };
    calc();
  });
}

function sheetBuscar(rerender) {
  abrirSheet('Buscar alimento', `
    <div class="stack">
      <div class="row">
        <input class="input" id="sq" placeholder="cebolla, queso gauda, pechuga…" style="flex:1"
          autocomplete="off" autocapitalize="none">
        <button class="btn blue" id="sGo">Ir</button>
      </div>
      <div class="list" id="sl"><div class="empty">Escribe qué comiste</div></div>
    </div>`, (b) => {
    const q = b.querySelector('#sq'), lista = b.querySelector('#sl');
    setTimeout(() => q.focus(), 130);

    let resultados = [];   // lo que se muestra (chilenos + marcas de OFF)
    let buscando = false;  // ¿todavía consultando marcas?
    let seq = 0;           // para ignorar respuestas de búsquedas viejas
    let tEscribe = null, tOFF = null;

    const fila = (x, i) => `
      <button class="item" data-i="${i}" style="width:100%;text-align:left;cursor:pointer">
        <div style="flex:1;min-width:0">
          <div class="item-t" style="font-size:13.5px">
            ${esc(x.nombre)}${x.local ? ' <span class="pill b" style="font-size:9px">Chile</span>' : ''}
          </div>
          <div class="item-s">${num(x.por100.kcal)} kcal / 100 g</div>
        </div>
      </button>`;

    const pintar = (vacio = 'Nada encontrado. Puedes añadirlo a mano.') => {
      if (!resultados.length) {
        lista.innerHTML = `<div class="empty">${esc(vacio)}</div>
          <button class="btn ghost full sm" id="sMano">+ Añadir a mano</button>`;
        const bm = lista.querySelector('#sMano');
        if (bm) bm.onclick = () => sheetPorcion(
          { codigo: '', nombre: q.value.trim(), por100: { kcal: 0, prot: 0, carb: 0, gras: 0 } }, rerender, true);
        return;
      }
      lista.innerHTML = resultados.map(fila).join('') +
        (buscando ? '<div class="tiny dim center" style="padding:6px">buscando marcas…</div>' : '');
      lista.querySelectorAll('[data-i]').forEach(bt =>
        bt.onclick = () => sheetPorcion(resultados[Number(bt.dataset.i)], rerender));
    };

    const buscar = () => {
      const t = q.value.trim();
      const mi = ++seq;
      clearTimeout(tOFF);
      if (t.length < 2) { resultados = []; buscando = false; return pintar('Escribe qué comiste'); }

      // 1) Chilenos al instante (offline, sin romperse con espacios).
      resultados = buscarLocal(t);
      buscando = true;
      pintar();

      // 2) Marcas / código de barras desde Open Food Facts, un poco después.
      tOFF = setTimeout(async () => {
        try {
          const r = await fetch(`${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(t)}` +
            '&search_simple=1&action=process&json=1&page_size=20' +
            '&fields=code,product_name,brands,nutriments');
          const j = await r.json();
          if (mi !== seq) return; // ya hay una búsqueda más nueva
          const marcas = (j.products || []).map(normaliza).filter(x => x.por100.kcal > 0);
          resultados = [...buscarLocal(t), ...marcas];
          buscando = false;
          pintar();
        } catch (e) {
          if (mi !== seq) return;
          buscando = false;
          pintar(resultados.length ? '' : 'Sin internet para marcas. Usa un alimento de la lista o añádelo a mano.');
        }
      }, 350);
    };

    q.oninput = () => { clearTimeout(tEscribe); tEscribe = setTimeout(buscar, 220); };
    q.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(tEscribe); buscar(); } };
    b.querySelector('#sGo').onclick = () => { clearTimeout(tEscribe); buscar(); };
  });
}

function sheetNoEncontrado(codigo, rerender) {
  abrirSheet('No está en la base', `
    <div class="stack">
      <p class="small muted" style="margin:0">
        El código <b>${esc(codigo)}</b> no aparece en Open Food Facts. Suele pasar con marcas blancas.
        Métele los datos de la etiqueta y queda guardado.
      </p>
      <button class="btn pri full" id="nfMano">Añadir a mano</button>
      <button class="btn ghost full sm" id="nfCerrar">Cerrar</button>
    </div>`, (b) => {
    b.querySelector('#nfMano').onclick = () =>
      sheetPorcion({ codigo, nombre: '', por100: { kcal: 0, prot: 0, carb: 0, gras: 0 } }, rerender, true);
    b.querySelector('#nfCerrar').onclick = cerrarSheet;
  });
}

// Ajuste de porción: el usuario dice cuántos gramos y calculamos los macros.
function sheetPorcion(prod, rerender, editable = false) {
  const p = S.perfil();
  abrirSheet(prod.nombre || 'Alimento', `
    <div class="stack">
      ${editable || !prod.nombre ? `
        <div class="field"><label class="label">Nombre</label>
          <input class="input" id="pN" value="${esc(prod.nombre)}" placeholder="Pollo a la plancha"></div>` : ''}

      ${editable ? `
        <div class="sec-title" style="margin:2px">Por cada 100 g</div>
        <div class="grid2">
          <div class="field"><label class="label">Kcal</label>
            <input class="input num" id="e100k" type="number" inputmode="numeric" value="${prod.por100.kcal || ''}"></div>
          <div class="field"><label class="label">Proteína (g)</label>
            <input class="input num" id="e100p" type="number" inputmode="decimal" step="0.1" value="${prod.por100.prot || ''}"></div>
        </div>
        <div class="grid2">
          <div class="field"><label class="label">Carbos (g)</label>
            <input class="input num" id="e100c" type="number" inputmode="decimal" step="0.1" value="${prod.por100.carb || ''}"></div>
          <div class="field"><label class="label">Grasa (g)</label>
            <input class="input num" id="e100g" type="number" inputmode="decimal" step="0.1" value="${prod.por100.gras || ''}"></div>
        </div>
      ` : `
        <div class="macro">
          <div><b>${num(prod.por100.kcal)}</b><span>Kcal</span></div>
          <div><b>${num(prod.por100.prot, 1)}</b><span>Prot</span></div>
          <div><b>${num(prod.por100.carb, 1)}</b><span>Carb</span></div>
          <div><b>${num(prod.por100.gras, 1)}</b><span>Gras</span></div>
        </div>
        <p class="tiny dim center" style="margin:-4px 0 0">valores por 100 g</p>
      `}

      <div class="field">
        <label class="label">¿Cuánto has comido? (gramos)</label>
        <input class="input num" id="pG" type="number" inputmode="numeric" value="100" style="font-size:22px;padding:13px">
      </div>
      <div class="chips" style="justify-content:center">
        ${[30, 50, 100, 150, 200, 250, 300].map(g =>
          `<button class="chip" data-g="${g}">${g} g</button>`).join('')}
      </div>

      ${selectComida(p)}
      <div class="card flat" id="resu"></div>
      <button class="btn pri full xl" id="pOk">Añadir al día</button>
    </div>`, (b) => {
    const g = b.querySelector('#pG'), resu = b.querySelector('#resu');
    const leer100 = () => editable ? {
      kcal: Number(b.querySelector('#e100k').value) || 0,
      prot: Number(b.querySelector('#e100p').value) || 0,
      carb: Number(b.querySelector('#e100c').value) || 0,
      gras: Number(b.querySelector('#e100g').value) || 0,
    } : prod.por100;

    const calc = () => {
      const gr = Number(g.value) || 0, f = gr / 100, p100 = leer100();
      resu.innerHTML = `
        <div class="row-b">
          <span class="small muted">Se sumarán</span>
          <span style="font-size:19px;font-weight:750">${num(p100.kcal * f)} kcal</span>
        </div>
        <div class="tiny dim" style="margin-top:4px">
          P ${num(p100.prot * f, 1)} g · C ${num(p100.carb * f, 1)} g · G ${num(p100.gras * f, 1)} g
        </div>`;
    };
    g.oninput = calc;
    b.querySelectorAll('[data-g]').forEach(x => x.onclick = () => { g.value = x.dataset.g; calc(); });
    b.querySelectorAll('#e100k,#e100p,#e100c,#e100g').forEach(x => x.oninput = calc);
    calc();

    b.querySelector('#pOk').onclick = () => {
      const gr = Number(g.value) || 0, f = gr / 100, p100 = leer100();
      const nombre = (b.querySelector('#pN')?.value || prod.nombre || '').trim();
      if (!nombre) return toast('Ponle nombre');
      if (!gr) return toast('¿Cuántos gramos?');
      const sel = leerComidaSel(b, p);
      S.registrarAlimento({
        nombre,
        gramos: gr,
        kcal: Math.round(p100.kcal * f),
        prot: Math.round(p100.prot * f * 10) / 10,
        carb: Math.round(p100.carb * f * 10) / 10,
        gras: Math.round(p100.gras * f * 10) / 10,
        codigo: prod.codigo || '',
        comidaId: sel.comidaId, comidaNombre: sel.comidaNombre,
      });
      cerrarSheet();
      toast('Añadido');
      rerender();
    };
  });
}

export const limpiar = pararCamara;
