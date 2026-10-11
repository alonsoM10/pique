// notis.js — recordatorios de comidas por notificación LOCAL (sin servidor).
//
// Mejor esfuerzo y gratis: usa "Notification Triggers" (showTrigger) donde el navegador
// lo soporta (Chrome/Edge en Android y escritorio, con la app instalada). En iPhone el
// soporte es limitado; por eso el aviso DENTRO de la app (tarjeta en la pantalla Hoy,
// ver store.comidaPendiente) es el respaldo que siempre funciona.

import * as S from './store.js?v=43';

export const soportaNotis = () =>
  typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

// ¿Puede programar avisos aunque la app esté cerrada? (Notification Triggers)
export const soportaProgramar = () =>
  soportaNotis() && 'showTrigger' in Notification.prototype &&
  typeof window.TimestampTrigger !== 'undefined';

export async function activarRecordatorios() {
  if (!soportaNotis()) throw new Error('Este teléfono no permite notificaciones aquí.');
  let permiso = Notification.permission;
  if (permiso === 'denied') throw new Error('Las notificaciones están bloqueadas. Actívalas en los ajustes del teléfono.');
  if (permiso !== 'granted') permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error('No diste permiso de notificaciones.');
  S.setNotisComidas(true);
  await programarRecordatorios();
  return true;
}

export async function desactivarRecordatorios() {
  S.setNotisComidas(false);
  await limpiarProgramadas();
}

async function limpiarProgramadas() {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('getNotifications' in reg) {
      const ns = await reg.getNotifications({ includeTriggered: true });
      ns.filter(n => (n.tag || '').startsWith('comida-')).forEach(n => n.close());
    }
  } catch (e) { /* noop */ }
}

// Programa un aviso por cada comida de la minuta que aún no ha pasado hoy.
export async function programarRecordatorios() {
  if (!S.notisComidas() || !soportaNotis() || Notification.permission !== 'granted') return;
  let reg;
  try { reg = await navigator.serviceWorker.ready; } catch (e) { return; }
  await limpiarProgramadas();
  if (!soportaProgramar()) return; // sin showTrigger no se puede con la app cerrada

  const p = S.perfil();
  const hoy = S.todayISO();
  const ahora = Date.now();
  (p.comidas || []).forEach((c) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(c.hora || '');
    if (!m) return;
    const hh = m[1].padStart(2, '0');
    const t = new Date(`${hoy}T${hh}:${m[2]}:00`).getTime();
    if (Number.isNaN(t) || t <= ahora + 30000) return; // ya pasó o es inminente
    try {
      reg.showNotification('Pique', {
        tag: 'comida-' + c.id,
        body: `¿Anotaste tu ${String(c.nombre || 'comida').toLowerCase()}? Era a las ${c.hora}.`,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        showTrigger: new window.TimestampTrigger(t),
        data: { route: 'comida' },
      });
    } catch (e) { /* algún navegador puede rechazar showTrigger */ }
  });
}
