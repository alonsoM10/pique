// view-hoy.js — pantalla de inicio: qué toca hoy, de un vistazo.

import * as S from './store.js?v=3';
import { esc, num, anillo, abrirSheet, cerrarSheet, toast } from './ui.js?v=3';

export function render() {
  const p = S.perfil();
  const hoy = S.todayISO();
  const dia = S.diaDeHoy(p);
  const yaEntrenado = p.sesiones.some(s => s.fecha === hoy);
  const r = S.racha(p);
  const peso = S.pesoActual(p);
  const pesos = S.pesosOrdenados(p);
  const prog = S.progresoObjetivo(p);
  const hechas = S.comidasHechas(hoy, p);
  const totalComidas = p.comidas.length;
  const tieneRutina = !!S.rutinaActiva(p);

  const dif = pesos.length > 1 ? pesos[pesos.length - 1].kg - pesos[0].kg : null;

  const hora = new Date().getHours();
  const saludo = hora < 6 ? 'Aún despierto' : hora < 13 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches';

  return `
  <div class="stack">

    <div class="card hero">
      <div class="row-b">
        <div>
          <div class="tiny dim" style="font-weight:650;letter-spacing:.06em;text-transform:uppercase">
            ${esc(saludo)}, ${esc(p.nombre.split(' ')[0])}
          </div>
          <h2 style="font-size:19px;margin-top:3px">${esc(S.fmtFecha(hoy))}</h2>
          <div class="small muted" style="margin-top:5px">
            ${r > 0
              ? `Racha de <b style="color:var(--a)">${r} día${r === 1 ? '' : 's'}</b>`
              : 'Empieza tu racha hoy'}
          </div>
        </div>
        ${prog != null
          ? anillo(prog, { texto: Math.round(prog * 100) + '%' })
          : anillo(0, { texto: '—', color: '#2f4258' })}
      </div>
    </div>

    <!-- ENTRENO DE HOY -->
    ${!tieneRutina ? `
      <div class="card">
        <div class="card-hd"><h3 style="font-size:15px">Todavía no hay rutina</h3></div>
        <p class="small muted" style="margin:0 0 12px">
          Crea tu rutina una vez y la app te dirá cada día exactamente qué toca. Se acabó llegar al gym a improvisar.
        </p>
        <button class="btn pri full" data-go="entreno">Crear mi rutina</button>
      </div>
    ` : yaEntrenado ? `
      <div class="card" style="border-color:#245840;background:var(--a-dim)">
        <div class="row" style="gap:13px">
          <div style="font-size:28px">&#10003;</div>
          <div>
            <div class="item-t" style="color:var(--a)">Entreno hecho</div>
            <div class="item-s">${esc(dia ? dia.nombre : 'Sesión libre')} · buen trabajo</div>
          </div>
        </div>
      </div>
    ` : dia ? `
      <div class="card">
        <div class="card-hd">
          <div>
            <span class="pill b">Hoy toca</span>
            <h3 style="font-size:18px;margin-top:7px">${esc(dia.nombre)}</h3>
          </div>
        </div>
        <div class="list" style="margin-bottom:12px">
          ${dia.ejercicios.slice(0, 4).map(e => {
            const u = S.ultimaVez(e.nombre, p);
            const mej = u && S.mejorSerie(u.series);
            return `<div class="item tight" style="padding:9px 11px">
              <div style="flex:1;min-width:0">
                <div class="item-t" style="font-size:13.5px">${esc(e.nombre)}</div>
                <div class="item-s">${e.series} × ${esc(e.reps)}${mej ? ` · última: ${num(mej.kg, 1)} kg` : ''}</div>
              </div>
            </div>`;
          }).join('')}
          ${dia.ejercicios.length > 4
            ? `<div class="tiny dim center">+ ${dia.ejercicios.length - 4} ejercicio${dia.ejercicios.length - 4 === 1 ? '' : 's'} más</div>`
            : ''}
          ${!dia.ejercicios.length ? '<div class="empty">Este día no tiene ejercicios todavía</div>' : ''}
        </div>
        <button class="btn pri full xl" data-go="entreno" ${!dia.ejercicios.length ? 'disabled' : ''}>
          Empezar entreno
        </button>
      </div>
    ` : `
      <div class="card">
        <div class="row" style="gap:13px">
          <div style="font-size:26px">&#127774;</div>
          <div style="flex:1">
            <div class="item-t">Día de descanso</div>
            <div class="item-s">Descansar también entrena. No rompe la racha.</div>
          </div>
        </div>
        <button class="btn ghost full sm" style="margin-top:11px" data-go="entreno">Entrenar igual</button>
      </div>
    `}

    <!-- ATAJOS -->
    <div class="grid2">
      <button class="stat" id="btnPeso" style="text-align:left;cursor:pointer">
        <div class="v">${peso != null ? num(peso, 1) : '—'}<span style="font-size:13px;color:var(--tx-3)"> kg</span></div>
        <div class="k">Pesarme hoy</div>
        ${dif != null ? `<div class="delta ${dif <= 0 ? 'down' : 'up'}" style="margin-top:4px">
          ${dif <= 0 ? '&#9660;' : '&#9650;'} ${num(Math.abs(dif), 1)} kg</div>` : ''}
      </button>
      <button class="stat" data-go="comida" style="text-align:left;cursor:pointer">
        <div class="v">${hechas}<span style="font-size:13px;color:var(--tx-3)">/${totalComidas}</span></div>
        <div class="k">Comidas de hoy</div>
        <div class="bar" style="margin-top:7px"><i style="width:${totalComidas ? (hechas / totalComidas) * 100 : 0}%"></i></div>
      </button>
    </div>

    <!-- SEMANA -->
    <div class="card">
      <div class="card-hd">
        <h3 style="font-size:14px">Esta semana</h3>
        <span class="small dim">${S.entrenosEstaSemana(p)} de ${S.objetivoSemanal(p) || '—'}</span>
      </div>
      <div class="grid3" style="grid-template-columns:repeat(7,1fr);gap:5px">
        ${S.DIAS.map((d, i) => {
          const iso = S.addDays(hoy, i - S.dayOfWeek(hoy));
          const hecho = p.sesiones.some(s => s.fecha === iso);
          const prog = !!p.calendario[i];
          const esHoy = iso === hoy;
          const bg = hecho ? 'var(--a)' : prog ? 'var(--card-2)' : 'transparent';
          const col = hecho ? '#07130c' : prog ? 'var(--tx-2)' : 'var(--tx-3)';
          return `<div style="text-align:center">
            <div class="tiny dim" style="font-weight:700;margin-bottom:4px">${d}</div>
            <div style="height:30px;border-radius:9px;background:${bg};color:${col};display:grid;place-items:center;
              border:1px solid ${esHoy ? 'var(--b)' : 'var(--line)'};font-size:13px;font-weight:750">
              ${hecho ? '&#10003;' : prog ? '&#183;' : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

  </div>`;
}

export function mount(root, ir) {
  root.querySelectorAll('[data-go]').forEach(b => {
    b.onclick = () => ir(b.dataset.go);
  });
  const bp = root.querySelector('#btnPeso');
  if (bp) bp.onclick = () => sheetPeso();
}

export function sheetPeso(despues) {
  const p = S.perfil();
  const actual = S.pesoActual(p);
  abrirSheet('Registrar peso', `
    <div class="stack">
      <div class="field">
        <label class="label">Peso de hoy (kg)</label>
        <input class="input num" id="wKg" type="number" inputmode="decimal" step="0.1"
          placeholder="${actual != null ? actual : '80.0'}" value="">
      </div>
      <div class="field">
        <label class="label">Cintura (cm) &mdash; opcional</label>
        <input class="input num" id="wCin" type="number" inputmode="decimal" step="0.5" placeholder="—">
      </div>
      <p class="tiny dim" style="margin:0">
        Pésate siempre igual: en ayunas, después del baño y sin ropa. El día a día sube y baja por agua; lo que importa es la línea de la semana.
      </p>
      <button class="btn pri full" id="wOk">Guardar</button>
    </div>`, (b) => {
    const kg = b.querySelector('#wKg');
    setTimeout(() => kg.focus(), 130);
    b.querySelector('#wOk').onclick = () => {
      const v = parseFloat(String(kg.value).replace(',', '.'));
      if (!v || v < 25 || v > 350) return toast('Pon un peso válido');
      const c = parseFloat(String(b.querySelector('#wCin').value).replace(',', '.')) || null;
      S.registrarPeso(v, c);
      cerrarSheet();
      toast('Peso guardado');
      despues?.();
    };
  });
}
