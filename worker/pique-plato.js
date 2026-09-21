// pique-plato.js — Cloudflare Worker que estima el plato de una foto (open source).
//
// Usa Workers AI (modelo Llama 3.2 Vision, open source). La app le manda la foto en
// base64 y el Worker devuelve un JSON con la estimación. La clave/cuenta vive en
// Cloudflare, nunca en la app.
//
// ─────────────────────────────────────────────────────────────────────────────
// CÓMO DESPLEGARLO (una sola vez, ~15 min, gratis):
//   1. Entra a dash.cloudflare.com y crea una cuenta gratis si no tienes.
//   2. Menú "Workers & Pages" → "Create" → "Create Worker".
//   3. Ponle un nombre (ej. pique-plato) → "Deploy".
//   4. "Edit code": borra lo que haya y pega TODO este archivo → "Deploy".
//   5. En el Worker: "Settings" → "Bindings" → "Add binding" → "Workers AI".
//      - Variable name: AI    (en mayúsculas, exactamente así)
//      - Guarda y vuelve a "Deploy".
//   6. Copia la URL del Worker (algo como https://pique-plato.tucuenta.workers.dev)
//      y pégala en la app: Ajustes → Foto del plato → URL del Worker → Probar.
//
// Un solo Worker sirve para los cuatro (Alonso, Cris, Vicente, Julio): comparten la
// misma URL. El plan gratis de Workers AI alcanza de sobra para uso personal.
// ─────────────────────────────────────────────────────────────────────────────

const MODELO = '@cf/meta/llama-3.2-11b-vision-instruct';

const PROMPT = `Eres nutricionista. Mira la foto de comida y estima lo que hay en el plato.
Responde SOLO un JSON con esta forma exacta, sin texto extra:
{"nombre":"descripción breve en español","kcal":number,"prot":number,"carb":number,"gras":number}
kcal son las calorías totales aproximadas; prot, carb y gras los gramos aproximados.
Si la foto no es comida: {"nombre":"no es comida","kcal":0,"prot":0,"carb":0,"gras":0}.`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const responder = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return responder({ error: 'Usa POST' }, 405);

    try {
      const { image } = await request.json();
      if (!image) return responder({ error: 'Falta la imagen' }, 400);

      // base64 → array de bytes (lo que espera el modelo de visión)
      const binario = atob(image);
      const bytes = new Uint8Array(binario.length);
      for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);

      const salida = await env.AI.run(MODELO, {
        prompt: PROMPT,
        image: [...bytes],
        max_tokens: 300,
      });

      return responder({ text: salida.response || '' });
    } catch (e) {
      return responder({ error: 'El Worker falló: ' + (e && e.message ? e.message : String(e)) }, 500);
    }
  },
};
