// nube.js — login con Google + sincronización con Firebase (Firestore).
//
// Con login: cada persona es su CUENTA de Google (uid estable). Su perfil vive en
// grupos/<codigo>/perfiles/<uid>. Como el uid es siempre el mismo, no hay duplicados y
// tus datos te siguen en cualquier teléfono. Sin internet, la app sigue con localStorage.

import * as S from './store.js?v=24';

// Config pública del proyecto Firebase de Alonso (no es secreto; protegen las reglas).
const CONFIG = {
  apiKey: 'AIzaSyDORWVqblDMLcDq5p2gTcXWR_cktxR7vHw',
  authDomain: 'pique-8a5d7.firebaseapp.com',
  projectId: 'pique-8a5d7',
  storageBucket: 'pique-8a5d7.firebasestorage.app',
  messagingSenderId: '338010561227',
  appId: '1:338010561227:web:6e09bd3a7adb8f3ecdd94e',
};

const VER = '11.0.0';
const CDN = (f) => `https://www.gstatic.com/firebasejs/${VER}/${f}`;

let appGlobal = null;
let sdk = null;            // firestore
let authSdk = null;        // auth
let auth = null;           // instancia de auth
let usuario = null;        // { uid, nombre, foto, email } o null
let db = null;
let desuscribir = null;
let quitarOyente = null;
let pushTimer = null;
let authListo = null;      // promesa: auth cargado + primer estado conocido
const oyentesAuth = new Set();

const norm = (n) => String(n || '').trim().toLowerCase();
const normCodigo = (c) => String(c || '').trim().toLowerCase().replace(/\s+/g, '-');
const infoUsuario = (u) => u ? {
  uid: u.uid, nombre: u.displayName || '', foto: u.photoURL || '', email: u.email || '',
} : null;

// ------------------------------------------------------------------ carga

async function cargarFirestore() {
  if (sdk) return;
  const appMod = await import(CDN('firebase-app.js'));
  const fs = await import(CDN('firebase-firestore.js'));
  appGlobal = appMod.getApps?.().length ? appMod.getApp() : appMod.initializeApp(CONFIG);
  // long-polling: funciona en redes/teléfonos que bloquean el transporte por defecto.
  try {
    db = fs.initializeFirestore(appGlobal, { experimentalAutoDetectLongPolling: true });
  } catch (e) {
    db = fs.getFirestore(appGlobal);
  }
  sdk = fs;
}

// Carga auth y espera a saber el primer estado (si ya había sesión guardada).
async function cargarAuth() {
  await cargarFirestore();
  if (authSdk) return;
  const am = await import(CDN('firebase-auth.js'));
  authSdk = am;
  auth = am.getAuth(appGlobal);
  await new Promise((resolve) => {
    am.onAuthStateChanged(auth, (u) => {
      usuario = infoUsuario(u);
      oyentesAuth.forEach(f => { try { f(usuario); } catch (e) {} });
      resolve();     // resuelve en la primera llamada; el listener sigue vivo
    });
  });
  // Si volvemos de un login por redirección (iPhone/PWA), completa el proceso.
  try { await am.getRedirectResult(auth); } catch (e) { /* no venía de redirect */ }
}

// Prepara auth al arrancar la app. `alCambiar(usuario)` se llama en cada cambio de sesión.
export function prepararAuth(alCambiar) {
  if (alCambiar) oyentesAuth.add(alCambiar);
  if (!authListo) authListo = cargarAuth();
  return authListo;
}

export const usuarioActual = () => usuario;

// ------------------------------------------------------------------ login

export async function entrarConGoogle() {
  await cargarAuth();
  const prov = new authSdk.GoogleAuthProvider();
  prov.setCustomParameters({ prompt: 'select_account' });
  try {
    const res = await authSdk.signInWithPopup(auth, prov);
    return infoUsuario(res.user);
  } catch (e) {
    const code = String(e.code || e.message || '');
    // En PWA/iPhone el popup suele bloquearse: caemos a redirección.
    if (/popup|cancell|not-supported|blocked/i.test(code)) {
      await authSdk.signInWithRedirect(auth, prov);
      return null; // la app navega fuera y vuelve ya logueada
    }
    throw e;
  }
}

export async function cerrarSesion() {
  if (auth) { try { await authSdk.signOut(auth); } catch (e) {} }
  salir();
}

// ------------------------------------------------------------------ firestore sync

const docMio = (codigo, id) => sdk.doc(db, 'grupos', codigo, 'perfiles', id);
const colGrupo = (codigo) => sdk.collection(db, 'grupos', codigo, 'perfiles');

async function subirMiPerfil() {
  if (!S.enGrupo() || !db) return;
  const yo = S.miPerfil();
  if (!yo) return;
  const limpio = JSON.parse(JSON.stringify(yo));
  limpio._actualizado = Date.now();
  if (usuario) { limpio._uid = usuario.uid; if (usuario.foto) limpio._foto = usuario.foto; }
  await sdk.setDoc(docMio(S.grupoCodigo(), yo.id), limpio);
}

function programarSubida() {
  if (S.estaAplicandoNube()) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => subirMiPerfil().catch(e => console.warn('subir', e)), 700);
}

export async function iniciar(alActualizar) {
  if (!S.enGrupo()) return false;
  await cargarFirestore();
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

function conTimeout(promesa, ms, msg) {
  let t;
  const limite = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); });
  return Promise.race([promesa, limite]).finally(() => clearTimeout(t));
}

// Unirse a un grupo: exige estar logueado. La identidad es el uid de Google, así que
// nunca se duplica (la misma persona escribe siempre sobre su propio documento).
export async function unirse(codigo, alActualizar) {
  await cargarAuth();
  if (!usuario) throw new Error('Primero entra con Google para unirte al grupo');
  const cod = normCodigo(codigo);

  S.unirGrupo(cod, usuario.uid);   // mi id pasa a ser mi uid de Google
  try {
    await conTimeout(subirMiPerfil(), 10000,
      'No pude conectar con la nube. Revisa tu internet e inténtalo de nuevo.');
  } catch (e) {
    S.salirGrupo();
    throw e;
  }
  await iniciar(alActualizar);
}

export function salir() {
  desuscribir?.(); desuscribir = null;
  quitarOyente?.(); quitarOyente = null;
  clearTimeout(pushTimer);
  S.salirGrupo();
}

export async function probar(codigo) {
  await cargarFirestore();
  await sdk.getDocs(colGrupo(normCodigo(codigo || S.grupoCodigo() || 'test')));
  return true;
}
