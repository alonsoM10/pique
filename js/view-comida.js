// view-comida.js — minuta del nutricionista, escáner de código de barras y registro de alimentos.
// Base de datos: Open Food Facts (abierta, gratuita, sin API key ni límite de peticiones).

import * as S from './store.js';
import { esc, num, toast, abrirSheet, cerrarSheet, confirmar, alCerrarSheet, vibrar } from './ui.js';

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

    <div class="sec-title">Minuta de hoy</div>
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
      ${!p.comidas.length ? '<div class="empty">Añade las comidas de tu minuta</div>' : ''}
    </div>
    <div class="grid2">
      <button class="btn ghost sm" id="addComida">+ Añadir comida</button>
      <button class="btn ghost sm" id="importarIA">&#129302; Importar con IA</button>
    </div>

    <div class="sec-title">Registrado hoy</div>
    <div class="list">
      ${t.items.length ? t.items.map(x => `
        <div class="item">
          <div style="flex:1;min-width:0">
            <div class="item-t" style="font-size:13.5px">${esc(x.nombre)}</div>
            <div class="item-s">
              ${x.gramos ? `${num(x.gramos)} g · ` : ''}${num(x.kcal)} kcal ·
              P${num(x.prot)} C${num(x.carb)} G${num(x.gras)}
            </div>
          </div>
          <button class="btn danger sm" data-rmali="${x.id}">&#10005;</button>
        </div>`).join('')
        : '<div class="empty"><span class="big">&#9635;</span>Escanea un producto o búscalo por nombre</div>'}
    </div>

  </div>`;
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
  root.querySelector('#importarIA').onclick = () => sheetImportarIA(rerender);
}

// ------------------------------------------------------------------ importar minuta con IA
//
// En vez de guardar el PDF del nutricionista (pesado y localStorage anda corto de sitio),
// el usuario le pide a cualquier IA de texto que se lo resuma en líneas con "|" y pega
// aquí el resultado. Así la minuta ocupa un par de líneas en vez de varios megas de PDF.

const PROMPT_IA = `Tengo el plan de comidas de mi nutricionista en PDF y quiero pasarlo a un formato simple.
Es MI plan personal, así que descríbelo pensando en una sola persona (yo), no en general.

Para cada comida del día, escribe UNA línea así, sin numerar y sin texto de más:

Nombre | Hora | Detalle | Kcal

- Nombre: Desayuno, Media mañana, Almuerzo, Merienda, Cena (o los que tenga mi plan)
- Hora: en formato 24h, ej. 08:00
- Detalle: qué como exactamente, CON CANTIDADES (gramos, unidades, tazas...). Nada de
  "algo de arroz" o "proteína a elección" — quiero las cantidades tal cual las puso el
  nutricionista para mí, comida por comida.
- Kcal: solo el número de calorías aproximadas de esa comida

Ejemplo de cómo quiero la respuesta:
Desayuno | 08:00 | 2 huevos revueltos, 1 tostada integral con aguacate, café solo | 420
Almuerzo | 14:00 | 150 g de pollo a la plancha, 200 g de arroz integral, ensalada | 650

No escribas nada más, solo esas líneas. Aquí está mi plan (te lo pego o adjunto):
`;

// Intenta leer líneas "Nombre | Hora | Detalle | Kcal". Tolera espacios de más,
// que falte la hora o el kcal, y separadores raros como " - " en vez de "|".
function parsearMinutaIA(texto) {
  const lineas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  const comidas = [];
  for (const linea of lineas) {
    const partes = (linea.includes('|') ? linea.split('|') : linea.split(' - ')).map(p => p.trim());
    if (partes.length < 2) continue;

    // el último trozo, si es un número, es el kcal
    let kcal = 0;
    if (/^\d+(\.\d+)?$/.test(partes[partes.length - 1].replace(/[^\d.]/g, '')) &&
        /\d/.test(partes[partes.length - 1])) {
      kcal = parseInt(partes.pop().replace(/[^\d]/g, ''), 10) || 0;
    }

    const [nombre, segundo, ...resto] = partes;
    if (!nombre || /^(nombre|comida)$/i.test(nombre)) continue; // se coló la cabecera

    const esHora = /^\d{1,2}:\d{2}$/.test(segundo || '');
    const hora = esHora ? segundo : '';
    const detalle = (esHora ? resto.join(' | ') : [segundo, ...resto].join(' | ')).trim();

    comidas.push({ id: S.uid(), nombre, hora, detalle, kcal });
  }
  return comidas;
}

function sheetImportarIA(rerender) {
  const p = S.perfil();
  abrirSheet('Importar minuta con IA', `
    <div class="stack">
      <p class="small muted" style="margin:0">
        Pásale tu PDF a cualquier IA (ChatGPT, Claude, Gemini…) con estas instrucciones,
        y pega aquí lo que te responda. Así no guardamos el PDF, solo el texto ya resumido.
      </p>
      <p class="tiny dim" style="margin:0">
        Esto es para <b>tu</b> minuta, la de ${esc(p.nombre)}. ${S.otroPerfil() ? esc(S.otroPerfil().nombre) + ' hace lo mismo desde su perfil' : 'Cada persona la importa desde su propio perfil'},
        con su propio plan — nadie pisa la comida de nadie.
      </p>
      <button class="btn ghost full sm" id="iaCopiar">Copiar instrucciones para la IA</button>
      <div class="field">
        <label class="label">Pega aquí la respuesta de la IA</label>
        <textarea class="input" id="iaTexto" style="min-height:150px"
          placeholder="Desayuno | 08:00 | 2 huevos, tostada integral, café | 420
Almuerzo | 14:00 | Pollo, arroz integral, ensalada | 650
…"></textarea>
      </div>
      <div id="iaPrev"></div>
      <button class="btn pri full" id="iaImportar" disabled>Revisa el texto para importar</button>
      ${p.comidas.length ? `<p class="tiny dim center" style="margin:0">
        Esto reemplaza las ${p.comidas.length} comidas que ya tienes en la minuta.</p>` : ''}
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
      parseadas = parsearMinutaIA(ta.value);
      if (!parseadas.length) {
        prev.innerHTML = ta.value.trim()
          ? '<p class="tiny" style="color:var(--w);margin:0">No reconozco ese formato. Revisa que cada línea tenga Nombre | Hora | Detalle | Kcal.</p>'
          : '';
        btnOk.disabled = true;
        btnOk.textContent = 'Revisa el texto para importar';
        return;
      }
      prev.innerHTML = `
        <div class="card flat">
          <div class="tiny dim" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:7px">
            Se importarán ${parseadas.length} comidas
          </div>
          <div class="list" style="gap:5px">
            ${parseadas.map(c => `<div class="tiny muted">
              <b style="color:var(--tx)">${esc(c.nombre)}</b>${c.hora ? ' · ' + esc(c.hora) : ''}
              ${c.kcal ? ' · ' + c.kcal + ' kcal' : ''}</div>`).join('')}
          </div>
        </div>`;
      btnOk.disabled = false;
      btnOk.textContent = `Importar ${parseadas.length} comidas`;
    };

    btnOk.onclick = async () => {
      if (!parseadas.length) return;
      if (p.comidas.length && !await confirmar('Reemplazar minuta',
        `Se borran las ${p.comidas.length} comidas actuales y se ponen las ${parseadas.length} nuevas.`,
        'Reemplazar', false)) return;
      p.comidas = parseadas;
      S.save();
      cerrarSheet();
      toast(`Minuta importada: ${parseadas.length} comidas`);
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
      <div class="divider"></div>
      <div class="field">
        <label class="label">O escribe el código de barras a mano</label>
        <div class="row">
          <input class="input num" id="manIn" inputmode="numeric" placeholder="8412345678905" style="flex:1">
          <button class="btn blue" id="manOk">Buscar</button>
        </div>
      </div>
    </div>`, (b) => {
    const msg = b.querySelector('#scanMsg');
    b.querySelector('#manOk').onclick = () => {
      const v = b.querySelector('#manIn').value.trim();
      if (v) { pararCamara(); buscarPorCodigo(v, rerender); }
    };
    arrancarCamara(b.querySelector('#vid'), msg, (codigo) => {
      vibrar([60, 40, 60]);
      pararCamara();
      buscarPorCodigo(codigo, rerender);
    });
    alCerrarSheet(pararCamara);
  });
}

async function arrancarCamara(video, msg, onCodigo) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    msg.textContent = 'Apunta al código de barras del producto';
  } catch (e) {
    msg.innerHTML = 'No se pudo abrir la cámara.<br>Comprueba los permisos en Ajustes &rsaquo; Safari, o escribe el código a mano.';
    return;
  }

  // 1) API nativa (Chrome Android): rápida y sin descargas.
  if ('BarcodeDetector' in window) {
    try {
      const det = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
      });
      const tick = async () => {
        if (!stream) return;
        try {
          const cods = await det.detect(video);
          if (cods.length) return onCodigo(cods[0].rawValue);
        } catch (e) { /* frame no listo */ }
        requestAnimationFrame(tick);
      };
      tick();
      return;
    } catch (e) { /* cae al plan B */ }
  }

  // 2) ZXing (Safari iOS y el resto).
  try {
    if (!window.ZXing) {
      await cargarScript('https://cdn.jsdelivr.net/npm/@zxing/library@0.19.1/umd/index.min.js');
    }
    const hints = new Map();
    const F = window.ZXing.BarcodeFormat;
    hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS,
      [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128]);
    lector = new window.ZXing.BrowserMultiFormatReader(hints, 300);
    lector.decodeFromStream(stream, video, (res) => { if (res) onCodigo(res.getText()); });
  } catch (e) {
    console.error(e);
    msg.textContent = 'El lector no cargó. Escribe el código a mano abajo.';
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

function sheetBuscar(rerender) {
  abrirSheet('Buscar alimento', `
    <div class="stack">
      <div class="row">
        <input class="input" id="sq" placeholder="Pechuga de pollo, yogur griego…" style="flex:1" autocomplete="off">
        <button class="btn blue" id="sGo">Ir</button>
      </div>
      <div class="list" id="sl"><div class="empty">Escribe qué comiste</div></div>
    </div>`, (b) => {
    const q = b.querySelector('#sq'), lista = b.querySelector('#sl');
    setTimeout(() => q.focus(), 130);
    const ir = async () => {
      const t = q.value.trim();
      if (t.length < 2) return;
      lista.innerHTML = '<div class="empty">Buscando…</div>';
      try {
        const r = await fetch(`${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(t)}` +
          '&search_simple=1&action=process&json=1&page_size=24' +
          '&fields=code,product_name,brands,nutriments');
        const j = await r.json();
        const items = (j.products || [])
          .map(normaliza)
          .filter(x => x.por100.kcal > 0);
        if (!items.length) {
          lista.innerHTML = '<div class="empty">Nada encontrado. Puedes añadirlo a mano.</div>';
          return;
        }
        lista.innerHTML = items.map((x, i) =>
          `<button class="item" data-i="${i}" style="width:100%;text-align:left;cursor:pointer">
            <div style="flex:1;min-width:0">
              <div class="item-t" style="font-size:13.5px">${esc(x.nombre)}</div>
              <div class="item-s">${x.por100.kcal} kcal / 100 g</div>
            </div>
          </button>`).join('');
        lista.querySelectorAll('[data-i]').forEach(bt =>
          bt.onclick = () => sheetPorcion(items[Number(bt.dataset.i)], rerender));
      } catch (e) {
        lista.innerHTML = '<div class="empty">Sin conexión</div>';
      }
    };
    b.querySelector('#sGo').onclick = ir;
    q.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); ir(); } };
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
      S.registrarAlimento({
        nombre,
        gramos: gr,
        kcal: Math.round(p100.kcal * f),
        prot: Math.round(p100.prot * f * 10) / 10,
        carb: Math.round(p100.carb * f * 10) / 10,
        gras: Math.round(p100.gras * f * 10) / 10,
        codigo: prod.codigo || '',
      });
      cerrarSheet();
      toast('Añadido');
      rerender();
    };
  });
}

export const limpiar = pararCamara;
