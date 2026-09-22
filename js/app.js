// app.js — arranque, router y ajustes.

import * as S from './store.js?v=13';
import { $, $$, esc, num, toast, abrirSheet, cerrarSheet, confirmar, pedir } from './ui.js?v=13';
import * as Onb from './onboarding.js?v=13';
import * as Hoy from './view-hoy.js?v=13';
import * as Entreno from './view-entreno.js?v=13';
import * as Comida from './view-comida.js?v=13';
import * as Progreso from './view-progreso.js?v=13';
import * as Pique from './view-pique.js?v=13';
import * as Ayuda from './view-ayuda.js?v=13';
import * as Exp from './exportar.js?v=13';
import * as Nube from './nube.js?v=13';

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
  $$('[data-grupo]', app).forEach(b => b.onclick = sheetGrupo);

  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.route === ruta));
  pintarPerfil();
}

function pintarPerfil() {
  const p = S.perfil();
  $('#whoName').textContent = p.nombre;
  $('#whoAvatar').textContent = S.avatar(p);
  $('#whoAvatar').style.background = p.color;
  $('#whoAvatar').style.color = p.color === '#60a5fa' ? '#06182b' : '#08120d';
}

// ------------------------------------------------------------------ perfiles

function sheetPerfiles() {
  const s = S.state();
  abrirSheet('¿Quién eres?', `
    <div class="stack">
      <div class="list">
        ${s.perfiles.map(p => `
          <div class="item ${p.id === s.perfilActivo ? 'on' : ''}" style="padding-right:8px">
            <button data-p="${p.id}" style="flex:1;min-width:0;display:flex;align-items:center;gap:11px;
              background:none;border:0;padding:0;text-align:left;cursor:pointer">
              <span style="width:32px;height:32px;border-radius:99px;display:grid;place-items:center;flex:none;
                background:${p.color};color:#07130c;font-weight:800">${esc(S.avatar(p))}</span>
              <span style="flex:1;min-width:0">
                <span class="item-t" style="display:block">${esc(p.nombre)}</span>
                <span class="item-s">${p.onboarding ? `${p.sesiones.length} entrenos · ${S.racha(p)} d de racha` : 'sin configurar'}</span>
              </span>
            </button>
            <button class="btn ghost sm" data-editar="${p.id}" aria-label="Editar ${esc(p.nombre)}">&#9998;</button>
            ${s.perfiles.length > 1 ? `<button class="btn ghost sm" data-quitar="${p.id}">&#10005;</button>` : ''}
          </div>`).join('')}
      </div>
      <button class="btn pri full" id="nuevaPersona">+ Añadir otra persona</button>
      <p class="tiny dim" style="margin:0">
        No hace falta que seáis solo dos: el gimnasio entero puede sumarse aquí y competir junto.
        Por ahora todos los perfiles viven en este móvil; cuando conectemos Drive, cada uno tendrá
        el suyo en su teléfono y se verán entre sí.
      </p>
    </div>`, (b) => {
    const enlazar = () => {
      b.querySelectorAll('[data-p]').forEach(x => x.onclick = () => {
        S.cambiarPerfil(x.dataset.p);
        cerrarSheet();
        const p = S.perfil();
        if (!p.onboarding) return arrancarOnboarding();
        enOnboarding = false; // por si veníamos de un asistente a medias de otra persona
        ruta = 'hoy';
        pintar();
      });
      b.querySelectorAll('[data-quitar]').forEach(x => x.onclick = async (e) => {
        e.stopPropagation();
        const objetivo = s.perfiles.find(p => p.id === x.dataset.quitar);
        if (!await confirmar('Quitar persona',
          `Se borran todos los datos de ${objetivo.nombre} de este móvil.`, 'Quitar')) return;
        S.eliminarPerfil(x.dataset.quitar);
        cerrarSheet();
        if (!S.perfil().onboarding) return arrancarOnboarding();
        enOnboarding = false;
        pintar();
      });
      b.querySelectorAll('[data-editar]').forEach(x => x.onclick = (e) => {
        e.stopPropagation();
        sheetEditarPersona(s.perfiles.find(p => p.id === x.dataset.editar));
      });
    };
    enlazar();

    b.querySelector('#nuevaPersona').onclick = () => sheetEditarPersona(null);
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

function sheetGrupo() {
  const p = S.perfil();

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
        </div>
        <p class="tiny dim" style="margin:0">
          Todos los que escriban <b>${esc(S.grupoCodigo())}</b> se ven entre sí. Pásaselo a los
          demás para que se sumen. Lo que hagas (gym, comida, creatina) les aparece a ellos.
        </p>
        <button class="btn ghost full sm" id="grProbar">Probar conexión</button>
        <button class="btn danger full sm" id="grSalir">Salir del grupo</button>
      </div>`, (b) => {
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

  let emoji = p.emoji || '';
  abrirSheet('Unirme a un grupo', `
    <div class="stack">
      <p class="small muted" style="margin:0">
        Escribe el <b>mismo código</b> que tus amigos (ej: <i>primos</i>) y di quién eres.
        Desde ahí se ven todos y no tienes que crear a nadie a mano.
      </p>
      <div class="field">
        <label class="label">Código del grupo</label>
        <input class="input" id="grCodigo" placeholder="primos" autocomplete="off" autocapitalize="none">
      </div>
      <div class="field">
        <label class="label">Tu nombre</label>
        <input class="input" id="grNombre" value="${esc(p.nombre)}" placeholder="Tu nombre">
      </div>
      <div class="field">
        <label class="label">Tu avatar</label>
        <div class="chips" id="grEmojis">
          <button class="chip ${!emoji ? 'on' : ''}" data-emoji="" style="font-weight:800">Aa</button>
          ${EMOJIS_AVATAR.map(e => `<button class="chip ${emoji === e ? 'on' : ''}" data-emoji="${e}"
            style="font-size:18px">${e}</button>`).join('')}
        </div>
      </div>
      <p class="tiny dim" style="margin:0">
        Al entrar, los perfiles de práctica de este móvil se quitan y aparecen las personas
        reales del grupo.
      </p>
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

      // Fijo mi identidad en el perfil activo antes de subirlo.
      const yo = S.perfil();
      yo.nombre = nombre;
      yo.emoji = emoji;
      S.save();

      try {
        await Nube.unirse(codigo, () => { if (!enOnboarding) pintar(); });
        cerrarSheet();
        toast('¡Dentro del grupo! Ya se ven entre ustedes');
        ruta = 'pique';
        pintar();
      } catch (e) {
        btn.textContent = 'Unirme al grupo'; btn.disabled = false;
        toast('No pude conectar. Revisa internet o que la base de datos esté creada.');
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

      <div class="sec-title" style="margin-left:0">Foto del plato (IA)</div>
      <p class="tiny dim" style="margin:0">
        Estima las calorías con una foto. Recomendado: un <b>Worker de Cloudflare</b>
        (open source, gratis, sin exponer claves). Pega aquí la URL que te dé al desplegarlo.
      </p>
      <div class="field">
        <label class="label">URL del Worker de Cloudflare</label>
        <input class="input" id="ajWorker" value="${esc(S.workerUrl())}" placeholder="https://pique-plato.tucuenta.workers.dev" autocomplete="off">
      </div>
      <div class="grid2">
        <button class="btn sm" id="ajWorkerGuardar">Guardar Worker</button>
        <button class="btn ghost sm" id="ajWorkerProbar">Probar</button>
      </div>

      <details style="margin-top:2px">
        <summary class="tiny dim" style="cursor:pointer">Alternativa: usar Gemini con tu clave</summary>
        <div class="stack" style="margin-top:9px">
          <p class="tiny dim" style="margin:0">
            Clave gratis en <b>aistudio.google.com/apikey</b>. Se usa solo si no hay Worker.
          </p>
          <div class="field">
            <input class="input" id="ajGemKey" value="${esc(S.geminiKey())}" placeholder="AIza..." autocomplete="off">
          </div>
          <div class="grid2">
            <button class="btn sm" id="ajGemGuardar">Guardar clave</button>
            <button class="btn ghost sm" id="ajGemProbar">Probar</button>
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
        const Gem = await import('./gemini.js?v=13');
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
        const Gem = await import('./gemini.js?v=13');
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
    if (VISTAS[n] && n !== ruta && !enOnboarding) { ruta = n; pintar(); }
  });

  if (!S.perfil().onboarding) arrancarOnboarding();
  else pintar();

  // Si este teléfono ya está en un grupo, arranca la sincronización con la nube.
  if (S.enGrupo()) Nube.iniciar(() => { if (!enOnboarding) pintar(); }).catch(() => {});

  setTimeout(() => {
    $('#splash').classList.add('gone');
    setTimeout(() => $('#splash').remove(), 400);
  }, 420);

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
