// gemini.js — foto del plato con la API de Gemini (Google AI Studio).
// La clave la pone cada persona en Ajustes y vive sólo en su móvil (no en el repo).

import * as S from './store.js?v=10';

const MODELO = 'gemini-2.0-flash';
const URL = (key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${encodeURIComponent(key)}`;

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

async function llamar(key, partes) {
  const r = await fetch(URL(key), {
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
    if (r.status === 400 && /API key/i.test(msg)) msg = 'La clave no es válida';
    if (r.status === 429) msg = 'Te pasaste del cupo gratis de hoy. Prueba mañana.';
    throw new Error(msg);
  }
  const j = await r.json();
  const txt = j.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!txt) throw new Error('Gemini no devolvió respuesta');
  return txt;
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
export async function analizarPlato(base64) {
  if (S.workerUrl()) return analizarConWorker(base64);
  return analizarConGemini(base64);
}

// --- Cloudflare Worker (modelo open source, la clave vive en el servidor) ---
async function analizarConWorker(base64) {
  const url = S.workerUrl();
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
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
async function analizarConGemini(base64) {
  const key = S.geminiKey();
  if (!key) throw new Error('Configura la foto del plato en Ajustes');

  const prompt = `Eres nutricionista. Mira la foto de comida y estima lo que hay en el plato.
Devuelve SOLO un JSON con esta forma exacta:
{"nombre": "descripción breve en español", "kcal": number, "prot": number, "carb": number, "gras": number}
- kcal: calorías totales aproximadas del plato (número entero)
- prot, carb, gras: gramos aproximados de proteína, carbohidratos y grasa
Si la foto no es comida, responde {"nombre":"no es comida","kcal":0,"prot":0,"carb":0,"gras":0}.`;

  const txt = await llamar(key, [
    { text: prompt },
    { inline_data: { mime_type: 'image/jpeg', data: base64 } },
  ]);

  let dato;
  try { dato = JSON.parse(txt); }
  catch (e) {
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('No entendí la respuesta de Gemini');
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

// Comprueba que la clave sirve, con una petición mínima de texto.
export async function probarClave() {
  const key = S.geminiKey();
  if (!key) throw new Error('Pega primero tu clave');
  await llamar(key, [{ text: 'Responde solo: {"ok":true}' }]);
  return true;
}
