// app.js — arranque, router y ajustes.

import * as S from './store.js';
import { $, $$, esc, num, toast, abrirSheet, cerrarSheet, confirmar, pedir } from './ui.js';
import * as Onb from './onboarding.js';
import * as Hoy from './view-hoy.js';
import * as Entreno from './view-entreno.js';
import * as Comida from './view-comida.js';
import * as Progreso from './view-progreso.js';
import * as Pique from './view-pique.js';
import * as Ayuda from './view-ayuda.js';
import * as Exp from './exportar.js';

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

  $$('.tab').forEach(b => b.classList.toggle('on', b.dataset.route === ruta));
  pintarPerfil();
}

function pintarPerfil() {
  const p = S.perfil();
  $('#whoName').textContent = p.nombre;
  $('#whoAvatar').textContent = (p.nombre[0] || '?').toUpperCase();
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
                background:${p.color};color:#07130c;font-weight:800">${esc((p.nombre[0] || '?').toUpperCase())}</span>
              <span style="flex:1;min-width:0">
                <span class="item-t" style="display:block">${esc(p.nombre)}</span>
                <span class="item-s">${p.onboarding ? `${p.sesiones.length} entrenos · ${S.racha(p)} d de racha` : 'sin configurar'}</span>
              </span>
            </button>
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
        pintar();
      });
      b.querySelectorAll('[data-quitar]').forEach(x => x.onclick = async (e) => {
        e.stopPropagation();
        const objetivo = s.perfiles.find(p => p.id === x.dataset.quitar);
        if (!await confirmar('Quitar persona',
          `Se borran todos los datos de ${objetivo.nombre} de este móvil.`, 'Quitar')) return;
        S.eliminarPerfil(x.dataset.quitar);
        cerrarSheet();
        pintar();
      });
    };
    enlazar();

    b.querySelector('#nuevaPersona').onclick = async () => {
      const nombre = await pedir({
        titulo: 'Nueva persona', label: '¿Cómo se llama?', placeholder: 'Nombre', ok: 'Añadir',
      });
      if (!nombre) return;
      S.crearPerfil(nombre);
      cerrarSheet();
      arrancarOnboarding();
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
    b.querySelector('#ajRehacer').onclick = () => { cerrarSheet(); arrancarOnboarding(); };

    b.querySelector('#ajKcal').onclick = async () => {
      const v = await pedir({
        titulo: 'Calorías objetivo', label: 'Kcal al día', tipo: 'number',
        valor: p.kcalObjetivo || '', placeholder: '1800',
      });
      if (v) { p.kcalObjetivo = Number(v); p.kcalFuente = 'nutricionista'; S.save(); toast('Guardado'); pintar(); }
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

  setTimeout(() => {
    $('#splash').classList.add('gone');
    setTimeout(() => $('#splash').remove(), 400);
  }, 420);

  // Aviso si el navegador va a borrar los datos por falta de espacio.
  navigator.storage?.persist?.().catch(() => {});
}

// Service worker: permite abrirla sin conexión.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

document.addEventListener('DOMContentLoaded', iniciar);
if (document.readyState !== 'loading') iniciar();
