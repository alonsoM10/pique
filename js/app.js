// app.js — arranque, router y ajustes.

import * as S from './store.js?v=35';
import { $, $$, esc, num, toast, abrirSheet, cerrarSheet, confirmar, pedir } from './ui.js?v=35';
import * as Onb from './onboarding.js?v=35';
import * as Hoy from './view-hoy.js?v=35';
import * as Entreno from './view-entreno.js?v=35';
import * as Comida from './view-comida.js?v=35';
import * as Progreso from './view-progreso.js?v=35';
import * as Pique from './view-pique.js?v=35';
import * as Ayuda from './view-ayuda.js?v=35';
import * as Exp from './exportar.js?v=35';
import * as Nube from './nube.js?v=35';

const VISTAS = {
  hoy: { t: 'Hoy', v: Hoy },
  entreno: { t: 'Entreno', v: Entreno },
  comida: { t: 'Comida', v: Comida },
  progreso: { t: 'Progreso', v: Progreso },
  pique: { t: 'Pique', v: Pique },
  ayuda: { t: 'Ayuda', v: Ayuda },
};

let ruta = 'hoy';
let enOnboarding = false;
let invitacionPendiente = '';   // código de grupo que llegó por link (?grupo=...)

// Si alguien abrió un link de invitación, le mostramos la ventana de unirse con el código puesto.
function abrirInvitacionSiHay() {
  if (!invitacionPendiente || enOnboarding) return;
  const code = invitacionPendiente;
  invitacionPendiente = '';
  if (S.enGrupo()) { toast('Ya estás en el grupo ' + S.grupoCodigo()); return; }
  sheetGrupo(code);
}

// ------------------------------------------------------------------ sesión (login obligatorio)
//
// Para usar Pique hay que entrar con Google. Así cada persona queda ligada a su cuenta,
// no hay muñecos de relleno y en el pique solo salen los que entraron de verdad.

let enLogin = false;
let sesionUser = null;
let sesionAplicada = false;

function quitarSplash() {
  const sp = $('#splash');
  if (sp && !sp.classList.contains('gone')) {
    sp.classList.add('gone');
    setTimeout(() => sp.remove(), 400);
  }
}

// Arranca la sesión de Google. Si hay una guardada, entra directo; si no, muestra el login.
async function arrancarSesion() {
  // Red de seguridad: si la carga se cuelga, igual mostramos la pantalla de entrada.
  const seguro = setTimeout(() => { if (!sesionAplicada) aplicarSesion(null); }, 12000);
  try {
    await Nube.prepararAuth(alCambiarSesion);   // el oyente corre con el primer estado
  } catch (e) {
    // Firebase no cargó (sin internet / CDN bloqueada): mostramos el login igual.
  }
  clearTimeout(seguro);
  if (!sesionAplicada) aplicarSesion(Nube.usuarioActual());
}

// Se llama en cada cambio de sesión: login, logout y el primer estado conocido.
function alCambiarSesion(user) { aplicarSesion(user); }

function aplicarSesion(user) {
  sesionAplicada = true;
  sesionUser = user;

  if (!user) { mostrarLogin(); return; }   // no logueado → puerta de entrada

  // Logueado: ligamos el teléfono a la cuenta y limpiamos los muñecos de relleno.
  enLogin = false;
  S.ligarCuenta(user);

  const repintar = () => { if (!enOnboarding && !enLogin) pintar(); };

  // Si ya estaba en un grupo, retomamos la sincronización (migra el id viejo si hace falta).
  if (S.enGrupo()) {
    if (S.miPerfilId() && S.miPerfilId() !== user.uid) Nube.unirse(S.grupoCodigo(), repintar).catch(() => {});
    else Nube.iniciar(repintar).catch(() => {});
  }

  // Entrar a la app: onboarding si falta configurarse, si no la vista normal.
  if (!S.perfil().onboarding) { if (!enOnboarding) arrancarOnboarding(); }
  else if (!enOnboarding) {
    const h = location.hash.replace('#', '');
    if (VISTAS[h]) ruta = h;
    pintar();
  }

  quitarSplash();

  // ¿Llegó por link de invitación o dejó un "unirse" a medias? Lo abrimos ya logueado.
  try {
    const pend = localStorage.getItem('pique.pendingJoin');
    if (pend !== null && !S.enGrupo() && !enOnboarding) {
      localStorage.removeItem('pique.pendingJoin');
      sheetGrupo(pend);
      return;
    }
  } catch (e) { /* noop */ }
  abrirInvitacionSiHay();
}

// Pantalla de entrada: logo de Pique + "Entrar con Google". Sin login no se entra.
function pantallaLoginHtml() {
  return `
  <div style="min-height:calc(100vh - 150px);display:flex;flex-direction:column;align-items:center;
    justify-content:center;text-align:center;padding:30px 24px">
    <div style="display:flex;align-items:center;gap:13px;margin-bottom:24px">
      <svg width="52" height="42" viewBox="0 0 56 44" fill="none" stroke-linejoin="miter" aria-hidden="true">
        <path d="M4 41 L28 5 L52 41" stroke="var(--a)" stroke-width="9"/>
        <path d="M17 41 L28 24 L39 41" stroke="#ffffff" stroke-width="9"/>
      </svg>
      <div style="font-family:var(--font-head);font-weight:600;font-size:42px;letter-spacing:.05em;line-height:1">PIQUE</div>
    </div>
    <p style="color:var(--tx-2);font-size:15px;line-height:1.55;max-width:272px;margin:0 0 28px">
      Bajen juntos, compitan y <b style="color:var(--tx)">no queden últimos</b>.
      Entra con tu cuenta y aparece en el pique.
    </p>
    <button class="btn pri full xl" id="loginGoogle" style="max-width:300px">Entrar con Google</button>
    <p style="color:var(--tx-3);font-size:12px;line-height:1.5;margin:14px 0 0;max-width:286px">
      Un toque, sin contraseñas. Tus datos quedan ligados a tu cuenta y los tienes en cualquier teléfono.
    </p>
    <p style="color:var(--tx-3);font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;margin:34px 0 0;font-weight:600">
      Gratis para siempre · Sin anuncios
    </p>
  </div>`;
}

function mostrarLogin() {
  enLogin = true;
  enOnboarding = false;
  $('#tabbar').style.display = 'none';
  $('#topbar').style.display = 'none';
  $('#viewTitle').textContent = '';
  const app = $('#app');
  app.innerHTML = pantallaLoginHtml();
  const btn = $('#loginGoogle');
  if (btn) btn.onclick = async () => {
    btn.disabled = true; btn.textContent = 'Abriendo Google…';
    try {
      // Guardamos una invitación pendiente por si el login se va por redirección (iPhone).
      if (invitacionPendiente) { try { localStorage.setItem('pique.pendingJoin', invitacionPendiente); } catch (e) {} }
      const u = await Nube.entrarConGoogle();
      // popup ok → el oyente alCambiarSesion renderiza la app.
      // redirect → la página se recarga y vuelve logueada.
      if (!u) return;
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Entrar con Google';
      toast(e.message || 'No pude entrar con Google. Revisa tu internet.');
    }
  };
  quitarSplash();
}

// ------------------------------------------------------------------ router

function ir(nueva) {
  if (nueva === ruta) return;
  if (ruta === 'comida') Comida.limpiar();
  ruta = nueva;
  location.hash = nueva;
  pintar();
  window.scrollTo({ top: 0 });
}

function pintar() {
  const app = $('#app');
  $('#topbar').style.display = '';   // puede venir oculto desde la pantalla de login

  if (enOnboarding) {
    $('#viewTitle').textContent = 'Bienvenido';
    $('#tabbar').style.display = 'none';
    app.innerHTML = Onb.render();
    Onb.mount(app, pintar);
    return;
  }

  $('#tabbar').style.display = '';
  const { t, v } = VISTAS[ruta] || VISTAS.hoy;
  $('#viewTitle').textContent = t;
  app.innerHTML = v.render();
  v.mount(app, ir, pintar);

  // La guía de un ejercicio se abre desde cualquier vista.
  $$('[data-guia]', app).forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    Ayuda.abrirEjercicio(b.dataset.guia);
  });

  // Cualquier botón "unirme al grupo" abre la misma hoja.
  $$('[data-grupo]', app).forEach(b => b.onclick = () => sheetGrupo());

  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.route === ruta));
  pintarPerfil();
}

function pintarPerfil() {
  const p = S.perfil();
  $('#whoName').textContent = p.nombre;
  $('#whoAvatar').textContent = S.avatar(p);
  $('#whoAvatar').style.background = S.colorPersona(p);
  $('#whoAvatar').style.color = '#0a0a0b';
}

// ------------------------------------------------------------------ perfiles

// Con login, SOLO existes tú (tu cuenta de Google). Aquí ves y editas tu propio perfil;
// a los demás NO se los puede abrir ni editar — ellos aparecen desde su teléfono en el Pique.
function sheetPerfiles() {
  const yo = S.perfil();
  abrirSheet('Tu perfil', `
    <div class="stack">
      <div class="item on" style="padding-right:8px">
        <span style="width:38px;height:38px;border-radius:99px;display:grid;place-items:center;flex:none;
          background:${S.colorPersona(yo)};color:#0a0a0b;font-weight:800;font-size:17px">${esc(S.avatar(yo))}</span>
        <span style="flex:1;min-width:0">
          <span class="item-t" style="display:block">${esc(yo.nombre)}</span>
          <span class="item-s">${yo.onboarding ? `${yo.sesiones.length} entrenos · ${S.racha(yo)} d de racha` : 'sin configurar'}</span>
        </span>
        <button class="btn ghost sm" id="editarYo" aria-label="Editar tu perfil">&#9998;</button>
      </div>
      <p class="tiny dim" style="margin:0">
        Eres tú, ligado a tu cuenta de Google. A los demás los ves en la pestaña <b>Pique</b>:
        cada uno aparece desde su propio teléfono.
      </p>
    </div>`, (b) => {
    b.querySelector('#editarYo').onclick = () => sheetEditarPersona(yo);
  });
}

// Emojis disponibles para el avatar (tú puedes elegir otro cualquiera desde el teclado).
const EMOJIS_AVATAR = ['💪', '🔥', '😎', '👱‍♀️', '🦁', '🐺', '🐉', '⚡', '🚀', '🏆', '🥇', '🦾', '🧔', '👑', '🎯', '🐻'];

function sheetEditarPersona(perfil) {
  const esNueva = !perfil;
  let emoji = perfil ? (perfil.emoji || '') : '';

  abrirSheet(esNueva ? 'Nueva persona' : `Editar ${perfil.nombre}`, `
    <div class="stack">
      <div class="field">
        <label class="label">Nombre</label>
        <input class="input" id="pnNombre" value="${esc(perfil ? perfil.nombre : '')}" placeholder="Nombre">
      </div>
      <div class="field">
        <label class="label">Avatar</label>
        <div class="chips" id="pnEmojis">
          <button class="chip ${!emoji ? 'on' : ''}" data-emoji="" style="font-weight:800">Aa</button>
          ${EMOJIS_AVATAR.map(e => `<button class="chip ${emoji === e ? 'on' : ''}" data-emoji="${e}"
            style="font-size:18px">${e}</button>`).join('')}
        </div>
        <p class="tiny dim" style="margin:6px 0 0">"Aa" usa la inicial del nombre.</p>
      </div>
      <button class="btn pri full" id="pnOk">${esNueva ? 'Añadir' : 'Guardar'}</button>
    </div>`, (b) => {
    b.querySelectorAll('[data-emoji]').forEach(x => x.onclick = () => {
      emoji = x.dataset.emoji;
      b.querySelectorAll('[data-emoji]').forEach(y => y.classList.toggle('on', y === x));
    });

    b.querySelector('#pnOk').onclick = () => {
      const nombre = b.querySelector('#pnNombre').value.trim();
      if (!nombre) return toast('Ponle un nombre');
      if (esNueva) {
        S.crearPerfil(nombre, emoji);
        cerrarSheet();
        arrancarOnboarding();
      } else {
        perfil.nombre = nombre;
        perfil.emoji = emoji;
        S.save();
        cerrarSheet();
        pintar();
        sheetPerfiles();
      }
    };
  });
}

// ------------------------------------------------------------------ grupo (nube)
//
// Aquí cada uno entra a un grupo compartido: escribe un código (el mismo para todos,
// se lo pasan por WhatsApp), dice quién es, y desde ese momento ve a los demás y ellos
// a él. No hay que crear rivales a mano: aparecen solos.

function linkInvitacion(codigo) {
  return location.origin + location.pathname + '?grupo=' + encodeURIComponent(codigo);
}

async function sheetGrupo(codigoInicial = '') {
  const p = S.perfil();
  try { await Nube.prepararAuth(); } catch (e) { /* seguimos igual */ }
  const user = Nube.usuarioActual();

  // --- Ya estás en un grupo: vista del grupo ---
  if (S.enGrupo()) {
    const yo = S.miPerfil();
    abrirSheet('Tu grupo', `
      <div class="stack">
        <div class="card flat">
          <div class="row-b"><span class="small muted">Código del grupo</span>
            <b class="small">${esc(S.grupoCodigo())}</b></div>
          <div class="divider"></div>
          <div class="row-b"><span class="small muted">Eres</span>
            <b class="small">${esc(S.avatar(yo))} ${esc(yo.nombre)}</b></div>
          ${user ? `<div class="divider"></div>
          <div class="row-b"><span class="small muted">Cuenta</span>
            <b class="small">${esc(user.email || user.nombre)}</b></div>` : ''}
        </div>
        <p class="tiny dim" style="margin:0">
          Comparte el link o el código <b>${esc(S.grupoCodigo())}</b> y los demás se suman solos.
        </p>
        <button class="btn blue full" id="grInvitar">&#128279; Compartir link de invitación</button>
        <button class="btn ghost full sm" id="grProbar">Probar conexión</button>
        <button class="btn danger full sm" id="grSalir">Salir del grupo</button>
      </div>`, (b) => {
      b.querySelector('#grInvitar').onclick = async () => {
        const link = linkInvitacion(S.grupoCodigo());
        const texto = `Únete a mi grupo "${S.grupoCodigo()}" en Pique 💪`;
        try {
          if (navigator.share) await navigator.share({ title: 'Pique', text: texto, url: link });
          else { await navigator.clipboard.writeText(link); toast('Link copiado — mándalo por WhatsApp'); }
        } catch (e) { /* cancelado */ }
      };
      b.querySelector('#grProbar').onclick = async () => {
        const btn = b.querySelector('#grProbar');
        btn.textContent = 'Probando…'; btn.disabled = true;
        try { await Nube.probar(); toast('¡Conectado! La sync funciona'); }
        catch (e) { toast('No conecté con la nube. ¿Creaste la base de datos?'); }
        finally { btn.textContent = 'Probar conexión'; btn.disabled = false; }
      };
      b.querySelector('#grSalir').onclick = async () => {
        if (!await confirmar('Salir del grupo',
          'Dejarás de ver a los demás y ellos a ti. Tus datos siguen en este móvil.', 'Salir')) return;
        Nube.salir();
        cerrarSheet();
        pintar();
      };
    });
    return;
  }

  // --- No has entrado con Google: pedir login primero ---
  if (!user) {
    abrirSheet('Unirme a un grupo', `
      <div class="stack">
        <p class="small muted" style="margin:0">
          Para verte con los demás, entra con tu cuenta de <b>Google</b> (un toque, sin contraseñas).
        </p>
        <button class="btn pri full" id="grGoogle">Entrar con Google</button>
        <p class="tiny dim" style="margin:0">
          Tus datos quedan ligados a tu cuenta: nunca se duplican y los tienes en cualquier teléfono.
        </p>
      </div>`, (b) => {
      b.querySelector('#grGoogle').onclick = async () => {
        const btn = b.querySelector('#grGoogle');
        btn.textContent = 'Abriendo Google…'; btn.disabled = true;
        try { localStorage.setItem('pique.pendingJoin', codigoInicial || ''); } catch (e) {}
        try {
          const u = await Nube.entrarConGoogle();
          if (u) sheetGrupo(codigoInicial);   // popup ok → mostramos el formulario
          // si u == null → se fue por redirección y volverá ya logueado
        } catch (e) {
          btn.textContent = 'Entrar con Google'; btn.disabled = false;
          toast(e.message || 'No pude entrar con Google');
        }
      };
    });
    return;
  }

  // --- Logueado: formulario para unirse ---
  let emoji = p.emoji || '';
  const nombreSug = (p.nombre && p.nombre !== 'Alonso') ? p.nombre : (user.nombre || p.nombre);
  abrirSheet('Unirme a un grupo', `
    <div class="stack">
      <div class="card flat"><div class="row" style="gap:10px;align-items:center">
        ${user.foto ? `<img src="${esc(user.foto)}" referrerpolicy="no-referrer" style="width:26px;height:26px;border-radius:99px">` : ''}
        <span class="small" style="flex:1;min-width:0">Conectado como <b>${esc(user.email || user.nombre)}</b></span>
      </div></div>
      <p class="small muted" style="margin:0">
        ${codigoInicial
          ? `Te invitaron al grupo <b>${esc(codigoInicial)}</b>. Solo confirma tu nombre y únete.`
          : `Escribe el <b>mismo código</b> que tus amigos (ej: <i>familia</i>) y únete.`}
      </p>
      <div class="field">
        <label class="label">Código del grupo</label>
        <input class="input" id="grCodigo" value="${esc(codigoInicial)}" placeholder="familia" autocomplete="off" autocapitalize="none">
      </div>
      <div class="field">
        <label class="label">Tu nombre</label>
        <input class="input" id="grNombre" value="${esc(nombreSug)}" placeholder="Tu nombre">
      </div>
      <div class="field">
        <label class="label">Tu avatar</label>
        <div class="chips" id="grEmojis">
          <button class="chip ${!emoji ? 'on' : ''}" data-emoji="" style="font-weight:800">Aa</button>
          ${EMOJIS_AVATAR.map(e => `<button class="chip ${emoji === e ? 'on' : ''}" data-emoji="${e}"
            style="font-size:18px">${e}</button>`).join('')}
        </div>
      </div>
      <button class="btn pri full" id="grOk">Unirme al grupo</button>
    </div>`, (b) => {
    b.querySelectorAll('[data-emoji]').forEach(x => x.onclick = () => {
      emoji = x.dataset.emoji;
      b.querySelectorAll('[data-emoji]').forEach(y => y.classList.toggle('on', y === x));
    });

    b.querySelector('#grOk').onclick = async () => {
      const codigo = b.querySelector('#grCodigo').value.trim();
      const nombre = b.querySelector('#grNombre').value.trim();
      if (!codigo) return toast('Escribe el código del grupo');
      if (!nombre) return toast('Escribe tu nombre');

      const btn = b.querySelector('#grOk');
      btn.textContent = 'Conectando…'; btn.disabled = true;

      const yo = S.perfil();
      yo.nombre = nombre;
      yo.emoji = emoji;
      S.save();

      try {
        await Nube.unirse(codigo, () => { if (!enOnboarding) pintar(); });
        try { localStorage.removeItem('pique.pendingJoin'); } catch (e) {}
        cerrarSheet();
        toast('¡Dentro del grupo! Ya se ven entre ustedes');
        ruta = 'pique';
        pintar();
      } catch (e) {
        btn.textContent = 'Unirme al grupo'; btn.disabled = false;
        toast(e.message || 'No pude conectar. Revisa tu internet e inténtalo de nuevo.');
      }
    };
  });
}

// ------------------------------------------------------------------ ajustes

function sheetAjustes() {
  const p = S.perfil();
  abrirSheet('Ajustes', `
    <div class="stack">

      <div class="sec-title" style="margin-left:0">Tus datos</div>
      <div class="card flat">
        <div class="row-b"><span class="small muted">Nombre</span><b class="small">${esc(p.nombre)}</b></div>
        <div class="divider"></div>
        <div class="row-b"><span class="small muted">Altura</span><b class="small">${p.alturaCm ? p.alturaCm + ' cm' : '—'}</b></div>
        <div class="divider"></div>
        <div class="row-b"><span class="small muted">Peso objetivo</span><b class="small">${p.pesoObjetivo ? num(p.pesoObjetivo, 1) + ' kg' : '—'}</b></div>
        <div class="divider"></div>
        <div class="row-b"><span class="small muted">Kcal objetivo</span><b class="small">${p.kcalObjetivo || '—'}</b></div>
        <div class="divider"></div>
        <div class="row-b"><span class="small muted">Proteína</span><b class="small">${p.proteinaObjetivo ? p.proteinaObjetivo + ' g' : '—'}</b></div>
        ${S.metabolismoBasal(p) ? `
          <div class="divider"></div>
          <div class="row-b"><span class="small muted">Gasto estimado</span><b class="small">${num(S.gastoDiario(p))} kcal/día</b></div>` : ''}
      </div>
      <button class="btn ghost full sm" id="ajRehacer">Rehacer el cuestionario inicial</button>
      <button class="btn ghost full sm" id="ajKcal">Cambiar calorías objetivo a mano</button>

      <div class="sec-title" style="margin-left:0">Grupo (ver a los demás)</div>
      ${S.enGrupo() ? `
        <div class="card flat">
          <div class="row-b"><span class="small muted">Grupo</span><b class="small">${esc(S.grupoCodigo())}</b></div>
          <div class="divider"></div>
          <div class="row-b"><span class="small muted">Eres</span><b class="small">${esc(S.avatar(S.miPerfil()))} ${esc(S.miPerfil().nombre)}</b></div>
        </div>
        <button class="btn ghost full sm" data-grupo="1">Ver / salir del grupo</button>
      ` : `
        <p class="tiny dim" style="margin:0">
          Conéctate con tu grupo y verás lo que hacen los demás (gym, comida) y ellos lo tuyo.
        </p>
        <button class="btn blue full" data-grupo="1">Unirme a un grupo</button>
      `}

      <div class="sec-title" style="margin-left:0">Cuenta</div>
      ${sesionUser ? `
        <div class="card flat">
          <div class="row-b"><span class="small muted">Conectado como</span>
            <b class="small">${esc(sesionUser.email || sesionUser.nombre || '')}</b></div>
        </div>
        <button class="btn ghost full sm" id="ajLogout">Cerrar sesión</button>
      ` : `
        <p class="tiny dim" style="margin:0">No has entrado con tu cuenta.</p>
      `}

      <div class="sec-title" style="margin-left:0">Foto del plato (IA)</div>
      <p class="tiny dim" style="margin:0">
        Le sacas una foto a tu plato y la IA estima las calorías. Necesitas una
        <b>clave gratis de Gemini</b>: entra a <b>aistudio.google.com/apikey</b>, crea una y pégala aquí.
      </p>
      <div class="field">
        <label class="label">Clave de Gemini</label>
        <input class="input" id="ajGemKey" value="${esc(S.geminiKey())}" placeholder="AIza..." autocomplete="off">
      </div>
      <div class="grid2">
        <button class="btn sm" id="ajGemGuardar">Guardar clave</button>
        <button class="btn ghost sm" id="ajGemProbar">Probar</button>
      </div>

      <details style="margin-top:2px">
        <summary class="tiny dim" style="cursor:pointer">Opción avanzada: Worker de Cloudflare (open source)</summary>
        <div class="stack" style="margin-top:9px">
          <p class="tiny dim" style="margin:0">
            Sin exponer claves, pero hay que desplegarlo. Si pones una URL aquí, se usa esta en vez de Gemini.
          </p>
          <div class="field">
            <input class="input" id="ajWorker" value="${esc(S.workerUrl())}" placeholder="https://pique-plato.tucuenta.workers.dev" autocomplete="off">
          </div>
          <div class="grid2">
            <button class="btn sm" id="ajWorkerGuardar">Guardar Worker</button>
            <button class="btn ghost sm" id="ajWorkerProbar">Probar</button>
          </div>
        </div>
      </details>

      <div class="sec-title" style="margin-left:0">Ayuda</div>
      <button class="btn ghost full sm" id="ajGuia">Guía de ejercicios y conceptos</button>

      <div class="sec-title" style="margin-left:0">Copia de seguridad</div>
      <p class="tiny dim" style="margin:0">
        Ahora mismo los datos viven sólo en este móvil. Descarga el respaldo de vez en cuando
        y déjalo en tu carpeta de Drive.
      </p>
      <button class="btn blue full" id="ajExcel">Exportar a Excel (.xlsx)</button>
      <button class="btn full" id="ajJson">Descargar respaldo (.json)</button>
      <div class="grid2">
        <button class="btn ghost sm" id="ajCopiar">Copiar datos</button>
        <button class="btn ghost sm" id="ajImportar">Restaurar</button>
      </div>

      <div class="sec-title" style="margin-left:0">Zona peligrosa</div>
      <button class="btn danger full sm" id="ajBorrar">Borrar todo y empezar de cero</button>

      <p class="tiny dim center" style="margin:10px 0 0">
        Pique · datos de alimentos por Open Food Facts
      </p>
    </div>`, (b) => {
    b.querySelectorAll('[data-grupo]').forEach(x => x.onclick = () => { cerrarSheet(); sheetGrupo(); });

    const logout = b.querySelector('#ajLogout');
    if (logout) logout.onclick = async () => {
      if (!await confirmar('Cerrar sesión',
        'Volverás a la pantalla de entrada. Tus datos quedan guardados en tu cuenta.', 'Cerrar sesión')) return;
      cerrarSheet();
      await Nube.cerrarSesion();   // signOut → el oyente te lleva a la pantalla de login
    };

    b.querySelector('#ajRehacer').onclick = () => { cerrarSheet(); arrancarOnboarding(); };

    b.querySelector('#ajKcal').onclick = async () => {
      const v = await pedir({
        titulo: 'Calorías objetivo', label: 'Kcal al día', tipo: 'number',
        valor: p.kcalObjetivo || '', placeholder: '1800',
      });
      if (v) { p.kcalObjetivo = Number(v); p.kcalFuente = 'nutricionista'; S.save(); toast('Guardado'); pintar(); }
    };

    b.querySelector('#ajWorkerGuardar').onclick = () => {
      S.setWorkerUrl(b.querySelector('#ajWorker').value);
      toast('Worker guardado en este móvil');
    };
    b.querySelector('#ajWorkerProbar').onclick = async () => {
      S.setWorkerUrl(b.querySelector('#ajWorker').value);
      const btn = b.querySelector('#ajWorkerProbar');
      btn.textContent = 'Probando…'; btn.disabled = true;
      try {
        const Gem = await import('./gemini.js?v=35');
        await Gem.probarWorker();
        toast('¡Worker funciona! Ya puedes usar la foto del plato');
      } catch (e) {
        toast(e.message || 'El Worker no respondió');
      } finally {
        btn.textContent = 'Probar'; btn.disabled = false;
      }
    };

    b.querySelector('#ajGemGuardar').onclick = () => {
      S.setGeminiKey(b.querySelector('#ajGemKey').value);
      toast('Clave guardada en este móvil');
    };
    b.querySelector('#ajGemProbar').onclick = async () => {
      S.setGeminiKey(b.querySelector('#ajGemKey').value);
      const btn = b.querySelector('#ajGemProbar');
      btn.textContent = 'Probando…'; btn.disabled = true;
      try {
        const Gem = await import('./gemini.js?v=35');
        await Gem.probarClave();
        toast('¡Clave correcta! Ya puedes usar la foto del plato');
      } catch (e) {
        toast(e.message || 'No pude validar la clave');
      } finally {
        btn.textContent = 'Probar'; btn.disabled = false;
      }
    };

    b.querySelector('#ajGuia').onclick = () => { cerrarSheet(); ir('ayuda'); };

    b.querySelector('#ajExcel').onclick = () => Exp.excel();
    b.querySelector('#ajJson').onclick = () => Exp.respaldoJSON();
    b.querySelector('#ajCopiar').onclick = () => Exp.copiarJSON();
    b.querySelector('#ajImportar').onclick = () => Exp.importarDesdeArchivo(() => { cerrarSheet(); pintar(); });

    b.querySelector('#ajBorrar').onclick = async () => {
      if (!await confirmar('Borrar todo',
        'Se pierden entrenos, pesos, medidas y comidas de los dos perfiles. Descarga antes el respaldo.',
        'Borrar todo')) return;
      S.reiniciar();
      cerrarSheet();
      arrancarOnboarding();
    };
  });
}

// ------------------------------------------------------------------ onboarding

function arrancarOnboarding() {
  enOnboarding = true;
  Onb.empezar(() => {
    enOnboarding = false;
    ruta = 'hoy';
    pintar();
    // si venía de un link de invitación, ahora sí le mostramos la ventana de unirse
    if (invitacionPendiente) { abrirInvitacionSiHay(); return; }
    const p = S.perfil();
    // si pidió plantilla y no tiene rutina, se la dejamos puesta
    if (!S.rutinaActiva(p)) {
      toast(`Listo, ${p.nombre.split(' ')[0]}. Ahora monta tu rutina.`);
      setTimeout(() => ir('entreno'), 900);
    } else {
      toast(`Todo listo, ${p.nombre.split(' ')[0]}`);
    }
  });
  pintar();
  window.scrollTo({ top: 0 });
}

// ------------------------------------------------------------------ arranque

let arrancado = false;
function iniciar() {
  if (arrancado) return;   // los módulos van diferidos: evitamos el doble arranque
  arrancado = true;
  S.load();

  $$('.tab').forEach(b => b.onclick = () => ir(b.dataset.route));
  $('#whoBtn').onclick = sheetPerfiles;
  $('#settingsBtn').onclick = sheetAjustes;

  $$('#sheet [data-close]').forEach(x => x.onclick = cerrarSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarSheet(); });

  const h = location.hash.replace('#', '');
  if (VISTAS[h]) ruta = h;
  window.addEventListener('hashchange', () => {
    const n = location.hash.replace('#', '');
    if (VISTAS[n] && n !== ruta && !enOnboarding && !enLogin) { ruta = n; pintar(); }
  });

  // ¿Vino un link de invitación? (?grupo=familia) Guardamos el código y limpiamos la URL.
  try {
    const invit = new URLSearchParams(location.search).get('grupo');
    if (invit) {
      invitacionPendiente = invit;
      history.replaceState(null, '', location.pathname + location.hash);
    }
  } catch (e) { /* noop */ }

  // Puerta de entrada: sin login no se renderiza la app. arrancarSesion() decide si
  // mostrar la pantalla de "Entrar con Google" o, si ya había sesión, entrar directo.
  // El splash se quita cuando la sesión queda resuelta.
  arrancarSesion();

  // Aviso si el navegador va a borrar los datos por falta de espacio.
  navigator.storage?.persist?.().catch(() => {});
}

// Service worker: permite abrirla sin conexión y avisa cuando hay versión nueva.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      // Si ya había una versión nueva esperando de una sesión anterior, avisa.
      if (reg.waiting && navigator.serviceWorker.controller) bannerActualizar(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          // "installed" + ya hay un controller = es una actualización, no la 1ª instalación.
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) bannerActualizar(nuevo);
        });
      });

      // Buscar versión nueva cada vez que la app vuelve al primer plano.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => {});

    // Cuando el worker nuevo toma el control, recargar una sola vez para estrenar la versión.
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recargando) return;
      recargando = true;
      location.reload();
    });
  });
}

function bannerActualizar(worker) {
  if (document.getElementById('bannerUpd')) return;
  const b = document.createElement('div');
  b.id = 'bannerUpd';
  b.innerHTML = `<span>&#10024; Hay una versión nueva de Pique</span>
    <button id="updOk">Actualizar</button>`;
  document.body.appendChild(b);
  b.querySelector('#updOk').onclick = () => {
    b.querySelector('#updOk').textContent = 'Actualizando…';
    worker.postMessage({ type: 'skipWaiting' });
  };
}

document.addEventListener('DOMContentLoaded', iniciar);
if (document.readyState !== 'loading') iniciar();
