// gemini.js — foto del plato con la API de Gemini (Google AI Studio).
// La clave la pone cada persona en Ajustes y vive sólo en su móvil (no en el repo).

import * as S from './store.js?v=24';

// Probamos varios modelos en orden: si uno está saturado ("high demand"), pasamos al
// siguiente. 'gemini-flash-latest' es el más nuevo; los otros son estables de respaldo.
const MODELOS = ['gemini-flash-latest', 'gemini-3.6-flash', 'gemini-flash-lite-latest'];
const URL = (key, modelo) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${encodeURIComponent(key)}`;

const espera = (ms) => new Promise(r => setTimeout(r, ms));
// ¿Es un error temporal de saturación (se puede reintentar / cambiar de modelo)?
const esSobrecarga = (status, msg) =>
  status === 503 || status === 429 || /high demand|overloaded|unavailable|try again/i.test(msg || '');

// Comprime la foto a máx 1024 px y JPEG, para que pese poco y no gaste cupo de más.
export function comprimirImagen(file, max = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL_desde(file);
    img.onload = () => {
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * escala), h = Math.round(img.height * escala);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      URL_revocar(url);
      resolve(cv.toDataURL('image/jpeg', 0.8).split(',')[1]); // solo el base64
    };
    img.onerror = () => { URL_revocar(url); reject(new Error('No pude leer la foto')); };
    img.src = url;
  });
}

const URL_desde = (f) => URL_c().createObjectURL(f);
const URL_revocar = (u) => URL_c().revokeObjectURL(u);
const URL_c = () => window.URL || window.webkitURL;

// Una llamada a un modelo concreto. Marca el error como "sobrecarga" para poder reintentar.
async function llamarModelo(key, modelo, partes) {
  const r = await fetch(URL(key, modelo), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: partes }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!r.ok) {
    let msg = `Error ${r.status}`;
    try { const j = await r.json(); msg = j.error?.message || msg; } catch (e) {}
    const e = new Error(msg);
    e.status = r.status;
    e.sobrecarga = esSobrecarga(r.status, msg);
    throw e;
  }
  const j = await r.json();
  const txt = j.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error('La IA no devolvió respuesta');
  return txt;
}

// Recorre los modelos; reintenta 1 vez cada uno si está saturado, luego pasa al siguiente.
async function llamar(key, partes) {
  let ultimo;
  for (const modelo of MODELOS) {
    for (let intento = 0; intento < 2; intento++) {
      try {
        return await llamarModelo(key, modelo, partes);
      } catch (e) {
        ultimo = e;
        // Errores no recuperables (clave mala, etc.): cortamos con mensaje claro.
        if (e.status === 400 && /API key/i.test(e.message)) throw new Error('La clave no es válida');
        if (!e.sobrecarga) throw e;
        // Saturado: reintenta el mismo modelo una vez; si no, pasa al siguiente.
        if (intento === 0) { await espera(1200); continue; }
        break;
      }
    }
  }
  throw new Error('La IA está saturada ahora mismo. Prueba en un rato, o usa "Plato casero" por gramos mientras tanto.');
}

// Extrae el JSON de la estimación de un texto (venga de Gemini o del Worker).
function leerJson(txt) {
  let dato;
  try { dato = JSON.parse(txt); }
  catch (e) {
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No entendí la respuesta de la IA');
    dato = JSON.parse(m[0]);
  }
  return {
    nombre: String(dato.nombre || 'Plato').slice(0, 80),
    kcal: Math.max(0, Math.round(Number(dato.kcal) || 0)),
    prot: Math.max(0, Math.round(Number(dato.prot) || 0)),
    carb: Math.max(0, Math.round(Number(dato.carb) || 0)),
    gras: Math.max(0, Math.round(Number(dato.gras) || 0)),
  };
}

// Punto de entrada: usa el Worker de Cloudflare si está configurado; si no, Gemini.
// `pista` es una corrección del usuario ("en realidad es pan con queso") para re-estimar.
export async function analizarPlato(base64, pista = '') {
  if (S.workerUrl()) return analizarConWorker(base64, pista);
  return analizarConGemini(base64, pista);
}

// Lee la TABLA NUTRICIONAL de la foto de una etiqueta y devuelve los valores por 100 g.
// Devuelve { nombre, por100: { kcal, prot, carb, gras } }, listo para la hoja de porción.
export async function analizarEtiqueta(base64) {
  const key = S.geminiKey();
  if (!key) throw new Error('Configura la foto del plato en Ajustes');

  const prompt = `Lee la TABLA DE INFORMACIÓN NUTRICIONAL de esta foto de un producto.
Devuelve SOLO un JSON con los valores POR CADA 100 g (o 100 ml) del producto:
{"nombre": "nombre del producto si se ve, si no \\"\\"", "kcal": number, "prot": number, "carb": number, "gras": number}
- Si la tabla solo muestra "por porción", conviértelo a por 100 g usando el tamaño de porción indicado.
- kcal por 100 g (entero); prot, carb, gras en gramos por 100 g.
Si no hay una tabla nutricional en la foto, responde {"nombre":"","kcal":0,"prot":0,"carb":0,"gras":0}.`;

  const txt = await llamar(key, [
    { text: prompt },
    { inline_data: { mime_type: 'image/jpeg', data: base64 } },
  ]);
  const d = leerJson(txt);
  return {
    nombre: d.nombre === 'Plato' ? '' : d.nombre,
    por100: { kcal: d.kcal, prot: d.prot, carb: d.carb, gras: d.gras },
  };
}

// --- Cloudflare Worker (modelo open source, la clave vive en el servidor) ---
async function analizarConWorker(base64, pista = '') {
  const url = S.workerUrl();
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, pista }),
  });
  if (!r.ok) {
    let msg = `Error ${r.status} del Worker`;
    try { const j = await r.json(); msg = j.error || msg; } catch (e) {}
    throw new Error(msg);
  }
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return leerJson(j.text || '');
}

export async function probarWorker() {
  const url = S.workerUrl();
  if (!url) throw new Error('Pega primero la URL del Worker');
  // pixel jpeg mínimo, solo para ver si responde
  const px = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAv/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8AH//Z';
  await analizarConWorker(px);
  return true;
}

// --- Gemini (alternativa directa desde el navegador) ---
async function analizarConGemini(base64, pista = '') {
  const key = S.geminiKey();
  if (!key) throw new Error('Configura la foto del plato en Ajustes');

  const prompt = `Eres nutricionista. Mira la foto de comida y estima lo que hay en el plato.
Devuelve SOLO un JSON con esta forma exacta:
{"nombre": "descripción breve en español", "kcal": number, "prot": number, "carb": number, "gras": number}
- kcal: calorías totales aproximadas del plato (número entero)
- prot, carb, gras: gramos aproximados de proteína, carbohidratos y grasa
Si la foto no es comida, responde {"nombre":"no es comida","kcal":0,"prot":0,"carb":0,"gras":0}.${
  pista ? `\nIMPORTANTE: el usuario dice que en realidad es: "${pista}". Puede que en la foto no se vea todo. Corrige tu estimación usando esa aclaración, y refleja eso en "nombre".` : ''
}`;

  const txt = await llamar(key, [
    { text: prompt },
    { inline_data: { mime_type: 'image/jpeg', data: base64 } },
  ]);
  return leerJson(txt);
}

// Comprueba que la clave sirve, con una petición mínima de texto.
export async function probarClave() {
  const key = S.geminiKey();
  if (!key) throw new Error('Pega primero tu clave');
  await llamar(key, [{ text: 'Responde solo: {"ok":true}' }]);
  return true;
}
