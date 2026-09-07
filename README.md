# Pique

App de gym, comida y progreso para Alonso y Cristóbal. Sin suscripciones, sin cuentas de pago.

Es una **PWA**: una web que se instala en el móvil como una app normal, con su icono
en la pantalla de inicio, a pantalla completa y funcionando sin conexión.

---

## Qué hace

| Pestaña | Para qué sirve |
|---|---|
| **Hoy** | Qué entreno toca, peso, comidas marcadas y la semana de un vistazo |
| **Entreno** | Editor de rutinas + sesión en vivo con series, kg, reps y cronómetro de descanso |
| **Comida** | Minuta del nutricionista, escáner de código de barras y contador de calorías y macros |
| **Progreso** | Peso, medidas con cinta, gráficas y **fecha estimada** para llegar al objetivo |
| **Pique** | Marcador comparativo entre los dos |
| **Ayuda** | Técnica de 25 ejercicios explicada en español, sin conexión (desde Entreno o Ajustes) |

**No hay fotos de progreso.** El seguimiento corporal se hace con cinta métrica:
cuello, pecho, brazo, cintura, abdomen, cadera, muslo y gemelo.

### De dónde salen los números

- **Calorías**: Mifflin-St Jeor × factor de actividad + gasto de los entrenos, menos el
  déficit del ritmo elegido (1 kg de grasa ≈ 7700 kcal). Nunca baja de 1500 kcal en hombres
  ni de 1200 en mujeres. Si el nutricionista te dio una cifra, esa manda.
- **Proteína**: 1,8 g por kg de peso, para no perder músculo en déficit.
- **Fecha estimada**: al principio usa el ritmo que elegiste. A partir de 3 pesajes cambia
  a una **regresión lineal sobre los últimos 28 días**, o sea tu ritmo real, no el planeado.
- **Racha**: los días de descanso programados en el calendario no la rompen.
- **Pique**: el objetivo se compara en **porcentaje recorrido**, no en kilos, para que el
  que empieza más pesado no gane por defecto.

### Datos de alimentos

[Open Food Facts](https://world.openfoodfacts.org) — base abierta, gratuita, sin clave de API
y sin límite de peticiones. Cubre bien el supermercado español (Hacendado, Carrefour, Dia…).

El escaneo usa `BarcodeDetector` en Android y **ZXing** en iPhone, que se descarga sólo
la primera vez que abres el escáner. Siempre puedes escribir el código a mano.

---

## Publicar en GitHub Pages

Necesitas una cuenta de GitHub. Los comandos se ejecutan dentro de `H:\Practicioner\pique`.

**1. Crea el repositorio** en <https://github.com/new>
   - Nombre: `pique`
   - Público (Pages gratis exige público en cuentas Free)
   - **Sin** README, sin .gitignore, sin licencia

**2. Sube el código** (cambia `TUUSUARIO` por tu usuario de GitHub):

```bash
cd /h/Practicioner/pique && git init -b main && git add -A && git commit -m "Pique: primera version" && git remote add origin https://github.com/TUUSUARIO/pique.git && git push -u origin main
```

**3. Activa Pages**
   - En el repo: **Settings → Pages**
   - *Source*: `Deploy from a branch`
   - *Branch*: `main`, carpeta `/ (root)` → **Save**
   - En 1-2 minutos la URL estará viva:

```
https://TUUSUARIO.github.io/pique/
```

**4. Instálala en el iPhone**
   - Abre esa URL **en Safari** (tiene que ser Safari; desde Chrome no se puede instalar)
   - Botón **Compartir** (el cuadrado con la flecha hacia arriba)
   - **Añadir a pantalla de inicio** → *Añadir*
   - Ábrela desde el icono nuevo, no desde Safari

Cristóbal repite el paso 4 con la misma URL desde su iPhone.

> La cámara del escáner **sólo funciona sobre HTTPS**. GitHub Pages lo da de serie;
> si abres los archivos con doble clic desde el disco, no funcionará.

### Actualizar la app

```bash
cd /h/Practicioner/pique && git add -A && git commit -m "cambios" && git push
```

Al publicar cambios, sube el número de `CACHE` en `sw.js` (`pique-v1` → `pique-v2`)
o los móviles seguirán abriendo la versión vieja desde la caché.

---

## Dónde se guardan los datos

Ahora mismo: **en el `localStorage` de cada móvil**. No sale nada a ningún servidor.

Eso significa que **cada teléfono tiene sus propios datos** y que si borras los datos de
Safari los pierdes. Por eso hay copia de seguridad en **Ajustes**:

- **Exportar a Excel (.xlsx)** — 7 pestañas: Resumen, Peso, Medidas, Entrenos, Series,
  Minuta y Alimentos. Para abrirlo en Sheets o Excel.
- **Descargar respaldo (.json)** — el archivo que restaura la app tal cual. Déjalo en Drive.
- **Restaurar** — vuelve a cargar un `.json` descargado antes.

### Siguiente paso: sincronizar con Google Drive

El plan acordado es una **carpeta compartida en el Drive de Alonso**, donde cada uno escribe
**sólo su propio archivo** (`alonso.json`, `cristobal.json`). Así nadie pisa los datos del
otro y la app puede leer los dos para el Pique.

Hace falta crear un proyecto en Google Cloud Console y un ID de OAuth con el permiso
`drive.file` (el más restrictivo: sólo ve los archivos que crea la propia app).
Es gratis; son unos 10 minutos de configuración.

---

## Estructura

```
pique/
├── index.html              esqueleto y contenedores
├── manifest.webmanifest    metadatos de instalación
├── sw.js                   service worker (offline)
├── css/app.css             estilos, tema oscuro
├── icons/                  iconos PNG
└── js/
    ├── app.js              arranque, router, ajustes
    ├── store.js            estado, persistencia, cálculos
    ├── ui.js               sheets, toasts, gráficos SVG
    ├── onboarding.js       cuestionario inicial (6 pasos)
    ├── view-hoy.js
    ├── view-entreno.js     editor de rutinas y sesión en vivo
    ├── view-comida.js      minuta, escáner, Open Food Facts
    ├── view-progreso.js    peso, medidas, proyección
    ├── view-pique.js       comparativa
    ├── view-ayuda.js       guía de ejercicios
    └── exportar.js         Excel, JSON, CSV
```

Sin dependencias, sin compilación, sin `npm install`. JavaScript nativo con módulos ES.
SheetJS y ZXing se cargan desde CDN sólo cuando hacen falta.

---

## Probar en local

Los módulos ES no funcionan abriendo el `index.html` con doble clic: hace falta un servidor.

```bash
cd /h/Practicioner/pique && python -m http.server 8123
```

Y abre <http://localhost:8123>. Si no tienes Python, usa `npx serve` o publica en Pages
directamente, que es igual de rápido.
