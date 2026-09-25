// nube.js — sincronización con Firebase (Firestore).
//
// La idea: cada teléfono es UNA persona ("yo") y sube solo su propio perfil a un
// grupo compartido. La app escucha ese grupo y trae a los demás integrantes en tiempo
// real. Así Alonso ve lo de Vicente y Vicente lo de Alonso, sin crear rivales a mano.
//
// Firebase se carga desde el CDN de Google (gstatic) como módulo ES: no hace falta
// instalar nada ni tener servidor. Si no hay internet, la app sigue con localStorage.

import * as S from './store.js?v=17';

// Config del proyecto de Firebase de Alonso. Es pública a propósito (no es un secreto):
// quien protege los datos son las reglas de Firestore, no esta config.
const CONFIG = {
  apiKey: 'AIzaSyDORWVqblDMLcDq5p2gTcXWR_cktxR7vHw',
  authDomain: 'pique-8a5d7.firebaseapp.com',
  projectId: 'pique-8a5d7',
  storageBucket: 'pique-8a5d7.firebasestorage.app',
  messagingSenderId: '338010561227',
  appId: '1:338010561227:web:6e09bd3a7adb8f3ecdd94e',
};

const VER = '11.0.0'; // versión del SDK de Firebase servida por gstatic

let sdk = null;         // funciones de firestore ya importadas
let db = null;          // instancia de Firestore
let desuscribir = null; // corta el listener del grupo
let quitarOyente = null;// corta el oyente de cambios locales
let pushTimer = null;   // debounce de subidas

// Carga perezosa del SDK (solo la primera vez que se usa el grupo).
async function cargar() {
  if (sdk) return sdk;
  const appMod = await import(`https://www.gstatic.com/firebasejs/${VER}/firebase-app.js`);
  const fs = await import(`https://www.gstatic.com/firebasejs/${VER}/firebase-firestore.js`);
  const app = appMod.getApps?.().length ? appMod.getApp() : appMod.initializeApp(CONFIG);
  // autoDetectLongPolling: hace que Firestore funcione también en redes/teléfonos donde
  // la conexión por defecto (WebChannel) queda bloqueada. Sin esto, a algunos les fallaba
  // la subida en silencio (le pasó al teléfono de Cristóbal).
  try {
    db = fs.initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch (e) {
    db = fs.getFirestore(app); // ya estaba inicializado
  }
  sdk = fs;
  return sdk;
}

const docMio = (codigo, id) => sdk.doc(db, 'grupos', codigo, 'perfiles', id);
const colGrupo = (codigo) => sdk.collection(db, 'grupos', codigo, 'perfiles');

// Sube MI perfil al grupo (limpio de undefined con un round-trip por JSON).
async function subirMiPerfil() {
  if (!S.enGrupo() || !db) return;
  const yo = S.miPerfil();
  if (!yo) return;
  const limpio = JSON.parse(JSON.stringify(yo));
  limpio._actualizado = Date.now();
  await sdk.setDoc(docMio(S.grupoCodigo(), yo.id), limpio);
}

// Cada cambio local dispara una subida, pero con espera para no saturar (debounce).
function programarSubida() {
  if (S.estaAplicandoNube()) return; // no reboto lo que acabo de bajar de la nube
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => subirMiPerfil().catch(e => console.warn('subir', e)), 700);
}

// Arranca la sincronización si el teléfono ya está en un grupo.
// `alActualizar` se llama cada vez que llegan datos nuevos para repintar la pantalla.
export async function iniciar(alActualizar) {
  if (!S.enGrupo()) return false;
  await cargar();
  const codigo = S.grupoCodigo();

  await subirMiPerfil().catch(e => console.warn('subida inicial', e));

  desuscribir?.();
  desuscribir = sdk.onSnapshot(colGrupo(codigo), (snap) => {
    const lista = [];
    snap.forEach(d => lista.push(d.data()));
    S.mergeCloudPerfiles(lista);
    alActualizar?.();
  }, (e) => console.warn('escucha del grupo', e));

  quitarOyente?.();
  quitarOyente = S.onChange(programarSubida);
  return true;
}

// Corre una promesa con límite de tiempo (si la red bloquea, no se queda colgado).
function conTimeout(promesa, ms, msg) {
  let t;
  const limite = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(t));
}

// Unirse a un grupo nuevo y empezar a sincronizar.
export async function unirse(codigo, alActualizar) {
  await cargar();                 // valida que Firebase carga antes de tocar el estado
  S.unirGrupo(codigo);
  try {
    // Subimos SIN atrapar el error: si no logra subir, el usuario tiene que saberlo
    // (antes fallaba en silencio y parecía unido sin estarlo).
    await conTimeout(subirMiPerfil(), 10000,
      'No pude conectar con la nube. Revisa tu internet (o si tu navegador bloquea conexiones) e inténtalo de nuevo.');
  } catch (e) {
    S.salirGrupo();               // deshacemos para no quedar "medio unido"
    throw e;
  }
  await iniciar(alActualizar);
}

// Salir del grupo y cortar la sincronización.
export function salir() {
  desuscribir?.(); desuscribir = null;
  quitarOyente?.(); quitarOyente = null;
  clearTimeout(pushTimer);
  S.salirGrupo();
}

// Prueba de conexión: intenta leer la colección del grupo. Lanza si algo falla
// (config mala, Firestore sin crear, reglas cerradas, sin internet).
export async function probar(codigo) {
  await cargar();
  const cod = String(codigo || S.grupoCodigo() || 'test').trim().toLowerCase().replace(/\s+/g, '-');
  await sdk.getDocs(colGrupo(cod));
  return true;
}
