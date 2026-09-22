// alimentos-cl.js — tabla propia de alimentos chilenos, para buscar al instante y offline.
//
// Por qué: Open Food Facts casi no tiene comida suelta de Chile (verduras, carnes, básicos)
// ni sus nombres de acá (palta, betarraga, choclo, poroto…). Esta tabla resuelve el buscador
// para lo del día a día: escribes "cebolla" o "queso gauda" y aparece al toque, con las
// calorías por 100 g. Los productos de marca / con código de barras siguen viniendo de OFF.
//
// Valores por 100 g de porción comestible, tal como se come normalmente (cocido cuando aplica).
// Son valores de referencia estándar; sirven para llevar la cuenta, no para un laboratorio.
// `alias` son otros nombres para que el buscador igual lo encuentre (aguacate→palta, etc.).

export const ALIMENTOS_CL = [
  // --- Verduras ---
  { nombre: 'Cebolla', kcal: 40, prot: 1.1, carb: 9.3, gras: 0.1 },
  { nombre: 'Pimentón (morrón)', kcal: 31, prot: 1, carb: 6, gras: 0.3, alias: 'pimiento morron aji' },
  { nombre: 'Tomate', kcal: 18, prot: 0.9, carb: 3.9, gras: 0.2 },
  { nombre: 'Lechuga', kcal: 15, prot: 1.4, carb: 2.9, gras: 0.2 },
  { nombre: 'Zanahoria', kcal: 41, prot: 0.9, carb: 9.6, gras: 0.2 },
  { nombre: 'Zapallo italiano', kcal: 17, prot: 1.2, carb: 3.1, gras: 0.3, alias: 'zapallito zucchini' },
  { nombre: 'Zapallo', kcal: 26, prot: 1, carb: 6.5, gras: 0.1, alias: 'calabaza' },
  { nombre: 'Betarraga', kcal: 43, prot: 1.6, carb: 10, gras: 0.2, alias: 'remolacha' },
  { nombre: 'Choclo', kcal: 96, prot: 3.4, carb: 21, gras: 1.5, alias: 'maiz elote' },
  { nombre: 'Poroto verde', kcal: 31, prot: 1.8, carb: 7, gras: 0.2, alias: 'judia verde vainita' },
  { nombre: 'Brócoli', kcal: 34, prot: 2.8, carb: 7, gras: 0.4, alias: 'brocoli' },
  { nombre: 'Coliflor', kcal: 25, prot: 1.9, carb: 5, gras: 0.3 },
  { nombre: 'Espinaca', kcal: 23, prot: 2.9, carb: 3.6, gras: 0.4 },
  { nombre: 'Acelga', kcal: 19, prot: 1.8, carb: 3.7, gras: 0.2 },
  { nombre: 'Pepino', kcal: 15, prot: 0.7, carb: 3.6, gras: 0.1 },
  { nombre: 'Apio', kcal: 16, prot: 0.7, carb: 3, gras: 0.2 },
  { nombre: 'Champiñón', kcal: 22, prot: 3.1, carb: 3.3, gras: 0.3, alias: 'champinon hongo callampa' },
  { nombre: 'Ajo', kcal: 149, prot: 6.4, carb: 33, gras: 0.5 },
  { nombre: 'Papa cocida', kcal: 87, prot: 2, carb: 20, gras: 0.1, alias: 'patata papas' },
  { nombre: 'Camote', kcal: 86, prot: 1.6, carb: 20, gras: 0.1, alias: 'batata boniato' },
  { nombre: 'Palta', kcal: 160, prot: 2, carb: 8.5, gras: 15, alias: 'aguacate' },

  // --- Frutas ---
  { nombre: 'Manzana', kcal: 52, prot: 0.3, carb: 14, gras: 0.2 },
  { nombre: 'Plátano', kcal: 89, prot: 1.1, carb: 23, gras: 0.3, alias: 'platano banana guineo' },
  { nombre: 'Naranja', kcal: 47, prot: 0.9, carb: 12, gras: 0.1 },
  { nombre: 'Mandarina', kcal: 53, prot: 0.8, carb: 13, gras: 0.3 },
  { nombre: 'Frutilla', kcal: 32, prot: 0.7, carb: 7.7, gras: 0.3, alias: 'fresa' },
  { nombre: 'Uva', kcal: 69, prot: 0.7, carb: 18, gras: 0.2 },
  { nombre: 'Pera', kcal: 57, prot: 0.4, carb: 15, gras: 0.1 },
  { nombre: 'Durazno', kcal: 39, prot: 0.9, carb: 10, gras: 0.3, alias: 'melocoton' },
  { nombre: 'Sandía', kcal: 30, prot: 0.6, carb: 7.6, gras: 0.2, alias: 'sandia' },
  { nombre: 'Melón', kcal: 34, prot: 0.8, carb: 8, gras: 0.2, alias: 'melon' },
  { nombre: 'Kiwi', kcal: 61, prot: 1.1, carb: 15, gras: 0.5 },
  { nombre: 'Piña', kcal: 50, prot: 0.5, carb: 13, gras: 0.1, alias: 'pina ananas' },
  { nombre: 'Arándano', kcal: 57, prot: 0.7, carb: 14, gras: 0.3, alias: 'arandano' },
  { nombre: 'Limón', kcal: 29, prot: 1.1, carb: 9, gras: 0.3, alias: 'limon' },

  // --- Carnes, pescados y huevo ---
  { nombre: 'Pechuga de pollo', kcal: 165, prot: 31, carb: 0, gras: 3.6, alias: 'pollo' },
  { nombre: 'Pollo (trutro/ala)', kcal: 209, prot: 26, carb: 0, gras: 11, alias: 'pollo trutro ala muslo' },
  { nombre: 'Bistec de vacuno', kcal: 201, prot: 27, carb: 0, gras: 10, alias: 'carne vacuno res bife lomo posta' },
  { nombre: 'Carne molida de vacuno', kcal: 250, prot: 26, carb: 0, gras: 15, alias: 'molida picada' },
  { nombre: 'Cerdo (magro)', kcal: 242, prot: 27, carb: 0, gras: 14, alias: 'chancho' },
  { nombre: 'Pavo', kcal: 135, prot: 29, carb: 0, gras: 1.7 },
  { nombre: 'Huevo', kcal: 155, prot: 13, carb: 1.1, gras: 11, alias: 'huevos' },
  { nombre: 'Clara de huevo', kcal: 52, prot: 11, carb: 0.7, gras: 0.2 },
  { nombre: 'Salmón', kcal: 208, prot: 20, carb: 0, gras: 13, alias: 'salmon' },
  { nombre: 'Merluza', kcal: 90, prot: 18, carb: 0, gras: 1.3, alias: 'pescado' },
  { nombre: 'Reineta', kcal: 96, prot: 20, carb: 0, gras: 1.5, alias: 'pescado' },
  { nombre: 'Atún en agua', kcal: 116, prot: 26, carb: 0, gras: 1, alias: 'atun' },

  // --- Lácteos ---
  { nombre: 'Leche entera', kcal: 61, prot: 3.2, carb: 4.8, gras: 3.3 },
  { nombre: 'Leche descremada', kcal: 34, prot: 3.4, carb: 5, gras: 0.1 },
  { nombre: 'Yogur natural', kcal: 61, prot: 3.5, carb: 4.7, gras: 3.3, alias: 'yoghurt' },
  { nombre: 'Queso gauda', kcal: 356, prot: 25, carb: 2.2, gras: 27, alias: 'gouda' },
  { nombre: 'Quesillo', kcal: 98, prot: 11, carb: 3.4, gras: 4.3 },
  { nombre: 'Queso mantecoso', kcal: 380, prot: 24, carb: 1, gras: 31 },
  { nombre: 'Mantequilla', kcal: 717, prot: 0.9, carb: 0.1, gras: 81 },

  // --- Cereales, legumbres y básicos ---
  { nombre: 'Arroz cocido', kcal: 130, prot: 2.7, carb: 28, gras: 0.3 },
  { nombre: 'Fideos cocidos', kcal: 131, prot: 5, carb: 25, gras: 1.1, alias: 'pasta tallarines' },
  { nombre: 'Pan (marraqueta/hallulla)', kcal: 270, prot: 9, carb: 55, gras: 1.5, alias: 'marraqueta hallulla pan blanco' },
  { nombre: 'Pan integral', kcal: 247, prot: 10, carb: 43, gras: 3.4 },
  { nombre: 'Avena', kcal: 389, prot: 17, carb: 66, gras: 7 },
  { nombre: 'Lentejas cocidas', kcal: 116, prot: 9, carb: 20, gras: 0.4, alias: 'lenteja' },
  { nombre: 'Porotos cocidos', kcal: 127, prot: 9, carb: 23, gras: 0.5, alias: 'poroto frijol frejol' },
  { nombre: 'Garbanzos cocidos', kcal: 164, prot: 8.9, carb: 27, gras: 2.6, alias: 'garbanzo' },
  { nombre: 'Quinoa cocida', kcal: 120, prot: 4.4, carb: 21, gras: 1.9, alias: 'quinua' },
  { nombre: 'Tortilla / pan pita', kcal: 275, prot: 8, carb: 52, gras: 3 },

  // --- Otros ---
  { nombre: 'Aceite (oliva/vegetal)', kcal: 884, prot: 0, carb: 0, gras: 100, alias: 'aceite oliva' },
  { nombre: 'Azúcar', kcal: 387, prot: 0, carb: 100, gras: 0, alias: 'azucar' },
  { nombre: 'Miel', kcal: 304, prot: 0.3, carb: 82, gras: 0 },
  { nombre: 'Manjar', kcal: 315, prot: 6, carb: 55, gras: 7.4, alias: 'dulce de leche' },
];

const sinTildes = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Texto de búsqueda de cada alimento (nombre + alias, sin tildes). Se calcula una vez.
const INDICE = ALIMENTOS_CL.map(a => ({
  a,
  busca: sinTildes(`${a.nombre} ${a.alias || ''}`),
}));

// Busca por palabras: cada palabra del texto debe estar en el nombre o los alias.
// Así "queso gauda" o "poroto verde" (con espacio) sí encuentran.
export function buscarLocal(q, limite = 12) {
  const palabras = sinTildes(q).split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];
  return INDICE
    .filter(({ busca }) => palabras.every(w => busca.includes(w)))
    .slice(0, limite)
    .map(({ a }) => ({
      codigo: '',
      nombre: a.nombre,
      local: true,
      por100: { kcal: a.kcal, prot: a.prot, carb: a.carb, gras: a.gras },
    }));
}
