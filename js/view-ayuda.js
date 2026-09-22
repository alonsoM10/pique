// view-ayuda.js — guía de ejercicios y conceptos.
// Escrita en español y disponible sin conexión. Para lo que no esté,
// se ofrece un enlace de búsqueda fuera (la API de búsqueda de wger ya no existe).

import { esc, abrirSheet, cerrarSheet } from './ui.js?v=10';

const BUSCAR_FUERA = 'https://duckduckgo.com/?q=t%C3%A9cnica+ejercicio+';

// ------------------------------------------------------------------ guía local

export const GUIA = {
  'Press banca': {
    m: 'Pectoral, tríceps, hombro anterior',
    p: ['Omóplatos juntos y hundidos contra el banco; el pecho queda alto.',
        'Pies clavados en el suelo, ligera curva lumbar natural.',
        'Baja la barra a la línea de los pezones en 2 segundos, tocando el pecho sin rebotar.',
        'Empuja pensando en separar el suelo con los pies.'],
    e: ['Rebotar la barra en el pecho', 'Sacar los codos a 90° — ponlos a unos 45°', 'Levantar los glúteos'],
  },
  'Press inclinado con mancuernas': {
    m: 'Pectoral superior, hombro anterior',
    p: ['Banco a 30°, más inclinado ya trabaja hombro en vez de pecho.',
        'Mancuernas a la altura del pecho, muñecas firmes.',
        'Sube en ligera diagonal hacia dentro, sin llegar a chocarlas.',
        'Baja controlado hasta notar estiramiento, sin forzar el hombro.'],
    e: ['Inclinar el banco demasiado', 'Bloquear el codo de golpe arriba'],
  },
  'Aperturas en polea': {
    m: 'Pectoral',
    p: ['Un pie adelante, tronco algo inclinado.',
        'Codos con una flexión fija y constante durante todo el recorrido.',
        'Junta las manos delante del pecho y aprieta un segundo.'],
    e: ['Convertirlo en un press doblando los codos', 'Usar tanto peso que empujes con el cuerpo'],
  },
  'Fondos en paralelas': {
    m: 'Pectoral inferior, tríceps',
    p: ['Tronco algo inclinado adelante para cargar pecho; vertical carga tríceps.',
        'Baja hasta que el hombro quede a la altura del codo.',
        'Sube sin bloquear del todo arriba.'],
    e: ['Bajar más de la cuenta y castigar el hombro', 'Balancear las piernas para coger impulso'],
  },
  'Dominadas': {
    m: 'Dorsal, bíceps, espalda alta',
    p: ['Agarre algo más ancho que los hombros.',
        'Empieza colgado del todo y activa hundiendo los omóplatos.',
        'Sube llevando los codos hacia las costillas, pecho al frente.',
        'Baja lento, 2-3 segundos.'],
    e: ['Balancearse', 'No bajar del todo', 'Encoger los hombros hacia las orejas'],
  },
  'Jalón al pecho': {
    m: 'Dorsal, bíceps',
    p: ['Muslos bien sujetos bajo el rodillo.',
        'Pecho arriba, ligera inclinación atrás y mantenla fija.',
        'Tira de la barra al pecho alto con los codos, no con las manos.'],
    e: ['Llevar la barra detrás de la nuca', 'Echarse atrás con todo el cuerpo cada repetición'],
  },
  'Remo con barra': {
    m: 'Espalda media, dorsal, bíceps',
    p: ['Cadera atrás, espalda recta, tronco a unos 45°.',
        'Barra pegada a las piernas, tira hacia el ombligo.',
        'Aprieta los omóplatos arriba un segundo.'],
    e: ['Redondear la lumbar', 'Subir el tronco al tirar', 'Tirar hacia el pecho en vez del ombligo'],
  },
  'Remo en polea baja': {
    m: 'Espalda media, dorsal',
    p: ['Rodillas algo flexionadas, espalda recta.',
        'Tira al abdomen manteniendo el tronco quieto.',
        'Estira del todo delante para trabajar el rango completo.'],
    e: ['Mecerse adelante y atrás', 'No estirar al final'],
  },
  'Press militar': {
    m: 'Hombro, tríceps, core',
    p: ['Barra a la altura de las clavículas, codos algo por delante.',
        'Aprieta glúteo y abdomen para no arquear la lumbar.',
        'Empuja arriba y mete la cabeza cuando la barra pase la frente.'],
    e: ['Arquear mucho la espalda', 'Empujar hacia delante en vez de recto arriba'],
  },
  'Elevaciones laterales': {
    m: 'Hombro lateral',
    p: ['Peso ligero, muy ligero. Este ejercicio no es de fuerza.',
        'Sube hasta la altura del hombro, codo algo doblado.',
        'Guía el movimiento con el codo, no con la mano.'],
    e: ['Coger impulso con la cadera', 'Subir por encima del hombro'],
  },
  'Curl con barra': {
    m: 'Bíceps',
    p: ['Codos pegados al costado y fijos ahí todo el rato.',
        'Sube controlado, aprieta arriba.',
        'Baja en 2-3 segundos hasta estirar.'],
    e: ['Balancear la espalda', 'Mover los codos hacia delante al subir'],
  },
  'Curl martillo': {
    m: 'Bíceps, braquial, antebrazo',
    p: ['Palmas enfrentadas todo el recorrido.',
        'Sube sin girar la muñeca.',
        'Puedes alternar brazos para controlar mejor.'],
    e: ['Encoger los hombros', 'Rebotar abajo'],
  },
  'Extensión de tríceps en polea': {
    m: 'Tríceps',
    p: ['Codos pegados al cuerpo, fijos.',
        'Estira del todo abajo y aprieta.',
        'Sube solo hasta 90°, sin dejar que el codo se abra.'],
    e: ['Separar los codos', 'Inclinarse encima de la polea para empujar con el peso corporal'],
  },
  'Press francés': {
    m: 'Tríceps',
    p: ['Tumbado, brazos verticales.',
        'Baja la barra hacia la frente doblando solo el codo.',
        'Sube sin mover el hombro.'],
    e: ['Abrir los codos', 'Bajar demasiado rápido'],
  },
  'Sentadilla': {
    m: 'Cuádriceps, glúteo, core',
    p: ['Barra apoyada en el trapecio, no en el cuello.',
        'Pies a la anchura de los hombros, puntas algo hacia fuera.',
        'Baja sentándote atrás y abajo, rodillas siguiendo la línea de los pies.',
        'Baja al menos hasta que el muslo quede paralelo al suelo.',
        'Sube empujando con el medio del pie.'],
    e: ['Rodillas hacia dentro', 'Levantar los talones', 'Redondear la lumbar abajo'],
  },
  'Prensa de piernas': {
    m: 'Cuádriceps, glúteo',
    p: ['Espalda baja pegada al respaldo en todo momento.',
        'Baja hasta 90° de rodilla o algo más si controlas.',
        'No bloquees las rodillas arriba.'],
    e: ['Despegar la lumbar del asiento abajo', 'Bloquear la rodilla de golpe'],
  },
  'Zancadas': {
    m: 'Cuádriceps, glúteo',
    p: ['Paso largo, tronco vertical.',
        'Baja hasta que la rodilla de atrás casi toque el suelo.',
        'Empuja con el talón de la pierna de delante.'],
    e: ['Paso corto — carga toda la rodilla', 'Inclinar el tronco adelante'],
  },
  'Peso muerto rumano': {
    m: 'Femoral, glúteo, lumbar',
    p: ['Rodillas casi rectas, con una flexión pequeña y fija.',
        'Lleva la cadera atrás y baja la barra pegada a las piernas.',
        'Para cuando notes el tirón en el femoral, no hace falta llegar al suelo.',
        'Sube empujando la cadera adelante.'],
    e: ['Doblar la rodilla como en un peso muerto normal', 'Separar la barra del cuerpo', 'Redondear la espalda'],
  },
  'Peso muerto': {
    m: 'Espalda completa, glúteo, femoral',
    p: ['Barra pegada a la espinilla, pies bajo la barra.',
        'Pecho alto, espalda recta, brazos rectos como cuerdas.',
        'Empuja el suelo con las piernas; la barra sube pegada al cuerpo.',
        'Termina de pie apretando glúteo, sin echarte atrás.'],
    e: ['Tirar con la espalda antes que con las piernas', 'Separar la barra del cuerpo', 'Hiperextender arriba'],
  },
  'Extensión de cuádriceps': {
    m: 'Cuádriceps',
    p: ['Ajusta el respaldo para que la rodilla quede alineada con el eje.',
        'Sube y aprieta arriba un segundo.',
        'Baja controlado.'],
    e: ['Soltar el peso de golpe al bajar', 'Levantar el glúteo del asiento'],
  },
  'Curl femoral': {
    m: 'Femoral',
    p: ['Cadera pegada al banco.',
        'Flexiona llevando el talón al glúteo.',
        'Baja lento sin soltar la tensión.'],
    e: ['Levantar la cadera para hacer fuerza', 'Rango corto'],
  },
  'Hip thrust': {
    m: 'Glúteo',
    p: ['Espalda apoyada en el banco a la altura de los omóplatos.',
        'Barbilla metida, mirada al frente.',
        'Sube hasta que el cuerpo quede recto de rodillas a hombros y aprieta arriba 1-2 s.'],
    e: ['Hiperextender la lumbar arriba', 'Empujar con las puntas de los pies'],
  },
  'Elevación de gemelos': {
    m: 'Gemelo, sóleo',
    p: ['Rango completo: baja del todo estirando y sube a la punta.',
        'Pausa arriba y abajo, sin rebotes.'],
    e: ['Rebotar', 'Rango de dos centímetros'],
  },
  'Plancha': {
    m: 'Core completo',
    p: ['Codos bajo los hombros, cuerpo en línea recta.',
        'Mete el ombligo y aprieta glúteo.',
        'Respira normal — no aguantes el aire.'],
    e: ['Subir el culo', 'Hundir la lumbar', 'Aguantar la respiración'],
  },
  'Elevación de piernas': {
    m: 'Abdomen inferior',
    p: ['Lumbar pegada al suelo o al respaldo.',
        'Sube las piernas controlando, sin impulso.',
        'Baja hasta justo antes de que la lumbar se despegue.'],
    e: ['Arquear la espalda', 'Usar impulso'],
  },
};

// Conceptos: lo que nadie te explica y decide si funciona o no.
const CONCEPTOS = [
  {
    t: 'Sobrecarga progresiva',
    c: `Es la única regla que de verdad importa: cada semana intenta hacer un poco más que la anterior.
        Una repetición más, dos kilos y medio más, o la misma serie con mejor técnica.
        Si haces exactamente lo mismo durante tres meses, tu cuerpo no tiene ningún motivo para cambiar.
        Por eso la app te enseña siempre lo que levantaste la última vez: para que superarlo sea lo fácil.`,
  },
  {
    t: 'Cuándo subir el peso',
    c: `Cuando completes todas las series en el rango alto de repeticiones con buena técnica.
        Si el ejercicio pone 8-10 y haces 10, 10 y 10, la próxima vez sube.
        En tren superior sube de 2,5 en 2,5 kg; en pierna puedes ir de 5 en 5.
        Si al subir bajas a 6 repeticiones, es normal: vuelve a subir cuando llegues otra vez a 10.`,
  },
  {
    t: 'El déficit es lo que adelgaza',
    c: `El gym no adelgaza: mantiene el músculo mientras el déficit de calorías adelgaza.
        Una hora de entreno duro quema unas 300-400 kcal, que son dos tostadas con aceite.
        No puedes compensar comiendo mal a base de entrenar más. La báscula la gana la cocina.`,
  },
  {
    t: 'Por qué la proteína',
    c: `En déficit tu cuerpo tira de reservas, y si no le das proteína suficiente tira también de músculo.
        Con 1,6-2 g por kilo de peso al día pierdes grasa y conservas casi todo el músculo.
        Es la diferencia entre quedarte delgado y fuerte o quedarte delgado y flojo.`,
  },
  {
    t: 'La báscula miente a diario',
    c: `Tu peso sube y baja 1-2 kg al día por agua, sal, glucógeno y lo que tengas en el intestino.
        Un día malo no significa nada. Lo único que cuenta es la línea de las últimas 3-4 semanas,
        que es exactamente lo que calcula la app para darte la fecha estimada.`,
  },
  {
    t: 'Los estancamientos son normales',
    c: `Casi todo el mundo se atasca 2-3 semanas en algún momento. Antes de recortar más calorías:
        comprueba que estás pesando la comida de verdad, que duermes 7 horas y que andas.
        Si de verdad llevas 3 semanas sin bajar y las medidas tampoco se mueven, entonces sí, baja 150-200 kcal.`,
  },
  {
    t: 'Descansar entre series',
    c: `Para fuerza (menos de 6 reps) descansa 2-3 minutos. Para hipertrofia (8-12) con 60-90 segundos vale.
        Descansar poco no quema más grasa, solo hace que levantes menos peso. El cronómetro de la app
        arranca solo cuando marcas una serie.`,
  },
  {
    t: 'Cuánto se tarda en notarlo',
    c: `Tú te notas hacia las 4 semanas. Tu gente lo nota hacia las 8-12.
        Las fotos y las medidas lo enseñan antes que el espejo, porque al espejo lo ves todos los días.
        Por eso conviene medirse cada dos semanas.`,
  },
];

// ------------------------------------------------------------------ render

export function render() {
  return `
  <div class="stack">
    <div class="card">
      <h2 style="font-size:18px">Ayuda</h2>
      <p class="small muted" style="margin:6px 0 0">
        Cómo se hace cada ejercicio y por qué funciona lo que estás haciendo.
      </p>
    </div>

    <input class="input" id="aq" placeholder="Buscar ejercicio…" autocomplete="off">
    <div class="list" id="alista"></div>

    <div class="sec-title">Lo que conviene entender</div>
    <div class="list">
      ${CONCEPTOS.map((c, i) => `
        <button class="item" data-con="${i}" style="width:100%;text-align:left;cursor:pointer">
          <div style="flex:1;min-width:0">
            <div class="item-t" style="font-size:13.5px">${esc(c.t)}</div>
          </div>
          <span class="dim">&#8250;</span>
        </button>`).join('')}
    </div>

    <p class="tiny dim center" style="margin:6px 0 0">
      ${Object.keys(GUIA).length} ejercicios explicados, disponibles sin conexión.
    </p>
  </div>`;
}

export function mount(root) {
  const q = root.querySelector('#aq');
  const lista = root.querySelector('#alista');
  const nombres = Object.keys(GUIA);

  const pintar = async () => {
    const t = q.value.trim().toLowerCase();
    const locales = nombres.filter(n => n.toLowerCase().includes(t));
    lista.innerHTML = locales.map(n => `
      <button class="item" data-ej="${esc(n)}" style="width:100%;text-align:left;cursor:pointer">
        <div style="flex:1;min-width:0">
          <div class="item-t" style="font-size:13.5px">${esc(n)}</div>
          <div class="item-s">${esc(GUIA[n].m)}</div>
        </div>
        <span class="dim">&#8250;</span>
      </button>`).join('');

    if (t.length >= 3 && !locales.length) {
      lista.insertAdjacentHTML('beforeend', `
        <div class="empty" style="padding:20px 8px">
          <span class="big">&#128269;</span>
          No tengo ficha escrita de <b>${esc(q.value.trim())}</b>.
        </div>
        <a class="btn ghost full sm" target="_blank" rel="noopener noreferrer"
           href="${BUSCAR_FUERA}${encodeURIComponent(q.value.trim())}">
          Ver la ejecución en ExRx &#8599;
        </a>
        <p class="tiny dim center" style="margin:8px 0 0">
          Si lo vas a usar a menudo, dímelo y lo añado a la guía en español.
        </p>`);
    }
    enlazar();
  };

  const enlazar = () => {
    lista.querySelectorAll('[data-ej]').forEach(b => b.onclick = () => abrirEjercicio(b.dataset.ej));
  };

  q.oninput = pintar;
  pintar();

  root.querySelectorAll('[data-con]').forEach(b => b.onclick = () => {
    const c = CONCEPTOS[Number(b.dataset.con)];
    abrirSheet(c.t, `
      <div class="stack">
        <p class="muted" style="margin:0;line-height:1.65;font-size:14.5px">${esc(c.c).replace(/\s+/g, ' ')}</p>
        <button class="btn ghost full sm" id="cCerrar">Entendido</button>
      </div>`, (bd) => { bd.querySelector('#cCerrar').onclick = cerrarSheet; });
  });
}

// Ficha de un ejercicio — reutilizable desde la sesión de entreno.
export function abrirEjercicio(nombre) {
  const g = GUIA[nombre];
  if (!g) {
    abrirSheet(nombre, `
      <div class="stack">
        <p class="small muted" style="margin:0">
          Todavía no tengo ficha escrita de este ejercicio.
        </p>
        <a class="btn ghost full sm" target="_blank" rel="noopener noreferrer"
           href="${BUSCAR_FUERA}${encodeURIComponent(nombre)}">Buscar la técnica fuera &#8599;</a>
        <button class="btn ghost full sm" id="xC">Cerrar</button>
      </div>`, (b) => { b.querySelector('#xC').onclick = cerrarSheet; });
    return;
  }
  abrirSheet(nombre, `
    <div class="stack">
      <div><span class="pill b">${esc(g.m)}</span></div>
      <div>
        <div class="sec-title" style="margin-left:0">Cómo se hace</div>
        <ol class="small muted" style="margin:0;padding-left:19px;line-height:1.75">
          ${g.p.map(x => `<li>${esc(x)}</li>`).join('')}
        </ol>
      </div>
      <div>
        <div class="sec-title" style="margin-left:0">Errores típicos</div>
        <ul class="small" style="margin:0;padding-left:19px;line-height:1.75;color:var(--w)">
          ${g.e.map(x => `<li>${esc(x)}</li>`).join('')}
        </ul>
      </div>
      <button class="btn ghost full sm" id="gC">Cerrar</button>
    </div>`, (b) => { b.querySelector('#gC').onclick = cerrarSheet; });
}
