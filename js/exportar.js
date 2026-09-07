// exportar.js — copia de seguridad en JSON y exportación a Excel.
// El .xlsx se arma con SheetJS, que se descarga sólo cuando pulsas el botón.

import * as S from './store.js';
import { toast } from './ui.js';

const CDN_XLSX = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function descargar(nombre, contenido, tipo) {
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const hoy = () => S.todayISO();

// ------------------------------------------------------------------ JSON

export function respaldoJSON() {
  descargar(`pique-respaldo-${hoy()}.json`, S.exportar(), 'application/json');
  toast('Respaldo descargado — súbelo a Drive');
}

export async function copiarJSON() {
  try {
    await navigator.clipboard.writeText(S.exportar());
    toast('Copiado al portapapeles');
  } catch (e) {
    toast('Tu navegador no deja copiar aquí');
  }
}

// ------------------------------------------------------------------ Excel

function cargarScript(src) {
  return new Promise((ok, err) => {
    if (window.XLSX) return ok();
    const s = document.createElement('script');
    s.src = src; s.onload = ok; s.onerror = () => err(new Error('cdn'));
    document.head.appendChild(s);
  });
}

// Convierte el estado en tablas planas, una por pestaña.
function tablas() {
  const s = S.state();
  const pesos = [], medidas = [], entrenos = [], series = [], comidas = [], alimentos = [];

  s.perfiles.forEach(p => {
    p.pesos.forEach(w => pesos.push({ Persona: p.nombre, Fecha: w.fecha, Peso_kg: w.kg, Nota: w.nota || '' }));

    p.medidas.forEach(m => {
      const fila = { Persona: p.nombre, Fecha: m.fecha };
      S.MEDIDAS.forEach(x => { fila[x.n + '_cm'] = m[x.k] ?? ''; });
      medidas.push(fila);
    });

    p.sesiones.forEach(ses => {
      entrenos.push({
        Persona: p.nombre, Fecha: ses.fecha, Entreno: ses.nombre,
        Minutos: Math.round(ses.duracion / 60),
        Volumen_kg: S.volumenSesion(ses),
        Series_hechas: ses.ejercicios.reduce((t, e) => t + e.series.filter(x => x.hecha).length, 0),
      });
      ses.ejercicios.forEach(e => e.series.forEach((x, i) => {
        if (!x.hecha) return;
        series.push({
          Persona: p.nombre, Fecha: ses.fecha, Entreno: ses.nombre, Ejercicio: e.nombre,
          Serie: i + 1, Kg: x.kg ?? '', Reps: x.reps ?? '',
          Volumen_kg: (Number(x.kg) || 0) * (Number(x.reps) || 0),
        });
      }));
    });

    Object.keys(p.marcadas).forEach(f => {
      Object.keys(p.marcadas[f]).forEach(cid => {
        const c = p.comidas.find(x => x.id === cid);
        comidas.push({
          Persona: p.nombre, Fecha: f,
          Comida: c ? c.nombre : '(eliminada)',
          Detalle: c ? c.detalle : '', Kcal: c ? (c.kcal || '') : '',
        });
      });
    });

    p.registroComida.forEach(a => alimentos.push({
      Persona: p.nombre, Fecha: a.fecha, Alimento: a.nombre, Gramos: a.gramos ?? '',
      Kcal: a.kcal, Proteina_g: a.prot, Carbos_g: a.carb, Grasa_g: a.gras, Codigo: a.codigo || '',
    }));
  });

  const resumen = s.perfiles.map(p => ({
    Persona: p.nombre,
    Peso_inicial: p.pesoInicial ?? '',
    Peso_actual: S.pesoActual(p) ?? '',
    Peso_objetivo: p.pesoObjetivo ?? '',
    Perdido_kg: p.pesoInicial && S.pesoActual(p) ? Math.round((p.pesoInicial - S.pesoActual(p)) * 10) / 10 : '',
    Ritmo_real_kg_sem: S.ritmoReal(p) ?? '',
    Entrenos_totales: p.sesiones.length,
    Racha_dias: S.racha(p),
    Kcal_objetivo: p.kcalObjetivo ?? '',
  }));

  return { resumen, pesos, medidas, entrenos, series, comidas, alimentos };
}

export async function excel() {
  toast('Preparando el Excel…');
  try {
    await cargarScript(CDN_XLSX);
  } catch (e) {
    return csv(); // sin conexión, caemos a CSV
  }
  const X = window.XLSX;
  const t = tablas();
  const wb = X.utils.book_new();
  const hojas = [
    ['Resumen', t.resumen], ['Peso', t.pesos], ['Medidas', t.medidas],
    ['Entrenos', t.entrenos], ['Series', t.series],
    ['Minuta', t.comidas], ['Alimentos', t.alimentos],
  ];
  hojas.forEach(([nombre, filas]) => {
    const ws = X.utils.json_to_sheet(filas.length ? filas : [{ ' ': 'Sin datos todavía' }]);
    X.utils.book_append_sheet(wb, ws, nombre);
  });
  const buf = X.write(wb, { bookType: 'xlsx', type: 'array' });
  descargar(`pique-${hoy()}.xlsx`,
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  toast('Excel listo');
}

// Plan B sin internet: un CSV con todo el detalle de series.
export function csv() {
  const t = tablas();
  const filas = t.series.length ? t.series : t.pesos;
  if (!filas.length) return toast('Todavía no hay datos que exportar');
  const cols = Object.keys(filas[0]);
  const linea = (o) => cols.map(c => {
    const v = String(o[c] ?? '');
    return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(';');
  const texto = '﻿' + [cols.join(';'), ...filas.map(linea)].join('\r\n');
  descargar(`pique-${hoy()}.csv`, texto, 'text/csv;charset=utf-8');
  toast('CSV descargado');
}

// ------------------------------------------------------------------ importar

export function importarDesdeArchivo(alTerminar) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.onchange = () => {
    const f = inp.files?.[0];
    if (!f) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        S.importar(String(fr.result));
        toast('Datos restaurados');
        alTerminar?.();
      } catch (e) {
        toast('Ese archivo no vale: ' + e.message);
      }
    };
    fr.readAsText(f);
  };
  inp.click();
}
