// view-progreso.js — peso, medidas y proyección hacia el objetivo.

import * as S from './store.js?v=11';
import { esc, num, toast, abrirSheet, cerrarSheet, graficoLinea, graficoBarras } from './ui.js?v=11';
import { sheetPeso } from './view-hoy.js?v=11';

let rango = 90; // días visibles en el gráfico

export function render() {
  const p = S.perfil();
  const pesos = S.pesosOrdenados(p);
  const desde = S.addDays(S.todayISO(), -rango);
  const vis = pesos.filter(x => x.fecha >= desde);
  const proy = S.proyeccion(p);
  const real = S.ritmoReal(p);
  const cambios = S.cambioMedidas(p);
  const conMedidas = cambios.filter(c => c.actual != null);

  const act = S.pesoActual(p);
  const dif = pesos.length > 1 ? act - pesos[0].kg : null;

  return `
  <div class="stack">

    <!-- PESO -->
    <div class="card">
      <div class="row-b" style="align-items:flex-start">
        <div>
          <div class="tiny dim" style="font-weight:700;letter-spacing:.06em;text-transform:uppercase">Peso actual</div>
          <div style="font-size:34px;font-weight:750;letter-spacing:-.02em;line-height:1.15;font-variant-numeric:tabular-nums">
            ${act != null ? num(act, 1) : '—'}<span style="font-size:15px;color:var(--tx-3)"> kg</span>
          </div>
          ${dif != null ? `<div class="delta ${dif <= 0 ? 'down' : 'up'}">
            ${dif <= 0 ? '&#9660;' : '&#9650;'} ${num(Math.abs(dif), 1)} kg desde el inicio</div>` : ''}
        </div>
        <button class="btn pri sm" id="pesarme">Pesarme</button>
      </div>

      ${vis.length ? `
        <div style="margin-top:14px">
          ${graficoLinea(vis.map(x => ({ x: x.fecha, y: x.kg })), { objetivo: p.pesoObjetivo })}
        </div>
        <div class="chips" style="margin-top:10px;justify-content:center">
          ${[[30, '30 d'], [90, '3 meses'], [365, '1 año'], [9999, 'Todo']].map(([v, n]) =>
            `<button class="chip ${rango === v ? 'on' : ''}" data-rango="${v}">${n}</button>`).join('')}
        </div>
      ` : `<div class="empty" style="padding:22px 8px">
            <span class="big">&#9878;</span>
            Todavía no te has pesado.<br>Pésate hoy y a partir de ahí todo se calcula solo.
          </div>`}
    </div>

    <!-- PROYECCIÓN -->
    ${p.pesoObjetivo == null ? `
      <div class="card">
        <div class="row-b">
          <div><div class="item-t">Sin objetivo puesto</div>
            <div class="item-s">Pon un peso meta y te digo la fecha</div></div>
          <button class="btn sm" id="ponObjetivo">Poner</button>
        </div>
      </div>
    ` : proy?.logrado ? `
      <div class="card" style="border-color:#245840;background:var(--a-dim)">
        <div class="center" style="padding:8px 0">
          <div style="font-size:30px">&#127942;</div>
          <div class="item-t" style="color:var(--a);margin-top:6px">Objetivo alcanzado</div>
          <div class="item-s">${num(p.pesoObjetivo, 1)} kg. Ahora toca mantenerlo.</div>
        </div>
      </div>
    ` : proy ? `
      <div class="card">
        <div class="card-hd"><h3 style="font-size:15px">Cuánto te queda</h3>
          <button class="btn ghost sm" id="ponObjetivo">Ajustar</button></div>

        <div class="grid2" style="margin-bottom:12px">
          <div class="stat flat">
            <div class="v">${num(proy.restan, 1)}<span style="font-size:12px;color:var(--tx-3)"> kg</span></div>
            <div class="k">Te faltan</div>
          </div>
          <div class="stat flat">
            <div class="v">${proy.plan}<span style="font-size:12px;color:var(--tx-3)"> kg/sem</span></div>
            <div class="k">Ritmo planeado</div>
          </div>
        </div>

        <div class="card flat" style="border-color:#1e4670">
          <div class="tiny dim" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">
            ${proy.ritmoReal != null && proy.fechaReal ? 'A tu ritmo real' : 'Al ritmo planeado'}
          </div>
          <div style="font-size:17px;font-weight:700;margin:5px 0 3px">
            ${S.fmtFechaLarga(proy.fechaReal || proy.fechaPlan)}
          </div>
          <div class="small muted">
            ${proy.semanasReal || proy.semanasPlan} semanas
            ${proy.ritmoReal != null && proy.fechaReal
              ? ` · bajando ${num(Math.abs(proy.ritmoReal), 2)} kg/sem de media`
              : ' · según lo que planeaste'}
          </div>
          ${proy.ritmoReal != null && !proy.fechaReal ? `
            <div class="small" style="color:var(--w);margin-top:9px">
              &#9888; En las últimas 4 semanas no estás bajando. Suele ser calorías: revisa las porciones antes de tocar el entreno.
            </div>` : ''}
          ${proy.fechaReal && proy.semanasReal > proy.semanasPlan * 1.4 ? `
            <div class="small" style="color:var(--w);margin-top:9px">
              Vas más lento de lo planeado. Nada grave &mdash; o ajustas calorías, o mueves la fecha.
            </div>` : ''}
          ${proy.fechaReal && proy.semanasReal < proy.semanasPlan * 0.75 ? `
            <div class="small" style="color:var(--a);margin-top:9px">
              Vas por delante del plan. Si te sientes con fuerza en el gym, mantén; si no, come un poco más.
            </div>` : ''}
        </div>

        ${pesos.length < 3 ? `<p class="tiny dim" style="margin:10px 0 0">
          Con 3 pesajes o más te doy la fecha basada en tu ritmo real, no en el planeado.</p>` : ''}
      </div>
    ` : ''}

    <!-- MEDIDAS -->
    <div class="card">
      <div class="card-hd">
        <h3 style="font-size:15px">Medidas</h3>
        <button class="btn sm" id="tomarMedidas">Tomar medidas</button>
      </div>
      ${conMedidas.length ? `
        <div class="list">
          ${conMedidas.map(c => `
            <div class="item tight" style="padding:9px 11px">
              <div style="flex:1;min-width:0">
                <div class="item-t" style="font-size:13.5px">${c.n}</div>
                ${c.dif != null ? `<div class="item-s">desde ${num(c.inicial, 1)} cm</div>` : ''}
              </div>
              <div class="center" style="min-width:62px">
                <div style="font-weight:750;font-variant-numeric:tabular-nums">${num(c.actual, 1)}<span class="dim" style="font-size:11px"> cm</span></div>
                ${c.dif != null && Math.abs(c.dif) >= 0.1
                  ? `<div class="delta ${c.dif <= 0 ? 'down' : 'up'}" style="font-size:11px">
                      ${c.dif <= 0 ? '&#9660;' : '&#9650;'} ${num(Math.abs(c.dif), 1)}</div>`
                  : '<div class="tiny dim">&mdash;</div>'}
              </div>
            </div>`).join('')}
        </div>
        <p class="tiny dim" style="margin:11px 0 0">
          Tómatelas cada 2 semanas, a la misma hora y sin apretar la cinta.
        </p>
      ` : `<div class="empty" style="padding:20px 8px">
            Sin medidas todavía.<br>Cuello, abdomen y muslo bastan para ver el cambio.
          </div>`}
    </div>

    <!-- ENTRENO -->
    <div class="card">
      <div class="card-hd"><h3 style="font-size:15px">Entrenos por semana</h3></div>
      ${graficoBarras(ultimasSemanas(p, 8))}
      <div class="grid2" style="margin-top:12px">
        <div class="stat flat">
          <div class="v">${p.sesiones.length}</div><div class="k">Entrenos totales</div>
        </div>
        ${(() => {
          const kg = p.sesiones.reduce((t, s) => t + S.volumenSesion(s), 0);
          const [v, u] = kg >= 10000 ? [num(kg / 1000, 1), 't'] : [num(kg), 'kg'];
          return `<div class="stat flat">
            <div class="v">${v}<span style="font-size:12px;color:var(--tx-3)"> ${u}</span></div>
            <div class="k">Peso movido</div>
          </div>`;
        })()}
      </div>
    </div>

  </div>`;
}

function ultimasSemanas(p, n) {
  const hoy = S.todayISO();
  const lunEsta = S.addDays(hoy, -S.dayOfWeek(hoy));
  return Array.from({ length: n }, (_, i) => {
    const lun = S.addDays(lunEsta, -(n - 1 - i) * 7);
    const dom = S.addDays(lun, 6);
    return {
      k: i === n - 1 ? 'Hoy' : `${new Date(lun + 'T12:00:00').getDate()}`,
      v: p.sesiones.filter(s => s.fecha >= lun && s.fecha <= dom).length,
    };
  });
}

export function mount(root, ir, rerender) {
  root.querySelector('#pesarme')?.addEventListener('click', () => sheetPeso(rerender));
  root.querySelectorAll('[data-rango]').forEach(b => b.onclick = () => {
    rango = Number(b.dataset.rango); rerender();
  });
  root.querySelector('#tomarMedidas')?.addEventListener('click', () => sheetMedidas(rerender));
  root.querySelectorAll('#ponObjetivo').forEach(b => b.onclick = () => sheetObjetivo(rerender));
}

// ------------------------------------------------------------------ sheets

export function sheetMedidas(rerender) {
  const p = S.perfil();
  const ult = S.medidasOrdenadas(p).slice(-1)[0] || {};
  abrirSheet('Tomar medidas', `
    <div class="stack">
      <p class="tiny dim" style="margin:0">
        Cinta pegada a la piel pero sin apretar, siempre a la misma hora del día. Rellena solo las que quieras.
      </p>
      ${S.MEDIDAS.map(m => `
        <div class="row" style="gap:9px">
          <div style="flex:1;min-width:0">
            <div class="item-t" style="font-size:13.5px">${m.n}</div>
            <div class="tiny dim">${esc(m.ayuda)}</div>
          </div>
          <input class="input num" data-med="${m.k}" type="number" inputmode="decimal" step="0.5"
            placeholder="${ult[m.k] != null ? num(ult[m.k], 1) : 'cm'}" style="width:80px;flex:none">
        </div>`).join('')}
      <button class="btn pri full" id="mOk">Guardar medidas</button>
    </div>`, (b) => {
    b.querySelector('#mOk').onclick = () => {
      const vals = {};
      b.querySelectorAll('[data-med]').forEach(i => { if (i.value) vals[i.dataset.med] = i.value; });
      if (!S.registrarMedidas(vals)) return toast('No has puesto ninguna medida');
      cerrarSheet(); toast('Medidas guardadas'); rerender();
    };
  });
}

function sheetObjetivo(rerender) {
  const p = S.perfil();
  abrirSheet('Objetivo', `
    <div class="stack">
      <div class="field"><label class="label">Peso objetivo (kg)</label>
        <input class="input num" id="oPeso" type="number" inputmode="decimal" step="0.5"
          value="${p.pesoObjetivo ?? ''}" placeholder="—"></div>
      <div class="field">
        <label class="label">Ritmo</label>
        <div class="chips" id="oRitmo">
          ${[0.25, 0.5, 0.75, 1].map(v =>
            `<button class="chip ${p.ritmoKgSemana === v ? 'on' : ''}" data-r="${v}">${v} kg/sem</button>`).join('')}
        </div>
      </div>
      <div id="oPrev" class="card flat"></div>
      <button class="btn pri full" id="oOk">Guardar</button>
    </div>`, (b) => {
    let r = p.ritmoKgSemana || 0.5;
    const prev = b.querySelector('#oPrev');
    const calc = () => {
      const act = S.pesoActual(p);
      const obj = parseFloat(String(b.querySelector('#oPeso').value).replace(',', '.'));
      if (!act || !obj || obj >= act) {
        prev.innerHTML = '<span class="small dim">Pon un objetivo por debajo de tu peso actual.</span>';
        return;
      }
      const sem = Math.ceil((act - obj) / r);
      prev.innerHTML = `
        <div class="tiny dim" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">Llegarías el</div>
        <div style="font-size:16px;font-weight:700;margin:5px 0 3px">${S.fmtFechaLarga(S.addDays(S.todayISO(), sem * 7))}</div>
        <div class="small muted">${num(act - obj, 1)} kg en ${sem} semanas</div>`;
    };
    b.querySelector('#oPeso').oninput = calc;
    b.querySelectorAll('[data-r]').forEach(x => x.onclick = () => {
      r = Number(x.dataset.r);
      b.querySelectorAll('[data-r]').forEach(y => y.classList.toggle('on', Number(y.dataset.r) === r));
      calc();
    });
    calc();
    b.querySelector('#oOk').onclick = () => {
      const v = parseFloat(String(b.querySelector('#oPeso').value).replace(',', '.'));
      p.pesoObjetivo = v || null;
      p.ritmoKgSemana = r;
      if (p.kcalFuente === 'calculada') {
        p.kcalObjetivo = S.kcalRecomendadas(p) || p.kcalObjetivo;
        p.proteinaObjetivo = S.proteinaRecomendada(p) || p.proteinaObjetivo;
      }
      S.save(); cerrarSheet(); rerender();
    };
  });
}
