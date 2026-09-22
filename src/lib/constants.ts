import { ShoppingCategory, Recipe, MealPlanItem, ShoppingItem } from './types';

export const SHOPPING_CATEGORIES: { name: ShoppingCategory; color: string; bg: string; border: string; icon: string }[] = [
  { name: 'Frutas y Verduras', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'Apple' },
  { name: 'Carnes y Pescados', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', icon: 'Beef' },
  { name: 'Lácteos y Huevos', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: 'Milk' },
  { name: 'Panadería y Cereales', color: 'text-amber-800', bg: 'bg-orange-50', border: 'border-orange-200', icon: 'Croissant' },
  { name: 'Despensa y Pasta', color: 'text-yellow-800', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'Package' },
  { name: 'Congelados', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'Snowflake' },
  { name: 'Bebidas', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: 'CupSoda' },
  { name: 'Limpieza y Hogar', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'Sparkles' },
  { name: 'Otros', color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', icon: 'ShoppingBag' },
];

export const MEAL_TYPES = [
  { id: 'desayuno', label: 'Desayuno', icon: 'Coffee', defaultTime: '08:30' },
  { id: 'almuerzo', label: 'Comida / Almuerzo', icon: 'Utensils', defaultTime: '14:00' },
  { id: 'merienda', label: 'Merienda', icon: 'Cookie', defaultTime: '18:00' },
  { id: 'cena', label: 'Cena', icon: 'Moon', defaultTime: '21:00' },
] as const;

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'receta-1',
    name: 'Lentejas con verduras',
    category: 'almuerzo',
    ingredients: [
      { name: 'Lentejas pardinas', quantity: '350g', category: 'Despensa y Pasta' },
      { name: 'Zanahorias', quantity: '2 unidades', category: 'Frutas y Verduras' },
      { name: 'Pimiento verde', quantity: '1 unidad', category: 'Frutas y Verduras' },
      { name: 'Patatas', quantity: '2 unidades', category: 'Frutas y Verduras' },
      { name: 'Cebolla', quantity: '1 unidad', category: 'Frutas y Verduras' },
      { name: 'Pimentón de la Vera', quantity: '1 cucharadita', category: 'Despensa y Pasta' }
    ],
    notes: 'Plato tradicional, nutritivo y fácil de cocinar en olla.'
  },
  {
    id: 'receta-2',
    name: 'Salmón al horno con patatas panadera',
    category: 'cena',
    ingredients: [
      { name: 'Lomos de salmón fresco', quantity: '2 lomos', category: 'Carnes y Pescados' },
      { name: 'Patatas', quantity: '3 unidades', category: 'Frutas y Verduras' },
      { name: 'Cebolla morada', quantity: '1 unidad', category: 'Frutas y Verduras' },
      { name: 'Limón', quantity: '1 unidad', category: 'Frutas y Verduras' },
      { name: 'Aceite de oliva virgen extra', quantity: '1 chorro', category: 'Despensa y Pasta' }
    ],
    notes: '20 min a 190ºC al horno. Cena ligera y saludable.'
  },
  {
    id: 'receta-3',
    name: 'Pasta al pesto con cherrys y burrata',
    category: 'almuerzo',
    ingredients: [
      { name: 'Pasta (fusilli o espaguetis)', quantity: '250g', category: 'Despensa y Pasta' },
      { name: 'Salsa Pesto verde', quantity: '1 bote', category: 'Despensa y Pasta' },
      { name: 'Tomates cherry', quantity: '1 tarrina', category: 'Frutas y Verduras' },
      { name: 'Burrata o mozzarella fresca', quantity: '1 pieza', category: 'Lácteos y Huevos' }
    ],
    notes: 'Rápido de preparar en menos de 15 minutos.'
  },
  {
    id: 'receta-4',
    name: 'Tortilla de patatas casera',
    category: 'cena',
    ingredients: [
      { name: 'Huevos camperos', quantity: '6 unidades', category: 'Lácteos y Huevos' },
      { name: 'Patatas', quantity: '4 unidades', category: 'Frutas y Verduras' },
      { name: 'Cebolla dulce', quantity: '1 unidad', category: 'Frutas y Verduras' },
      { name: 'Aceite de oliva', quantity: 'Abundante para freír', category: 'Despensa y Pasta' }
    ],
    notes: 'Con cebolla caramelizada suave.'
  },
  {
    id: 'receta-5',
    name: 'Pechuga de pollo a la plancha con ensalada mixta',
    category: 'cena',
    ingredients: [
      { name: 'Filetes de pechuga de pollo', quantity: '400g', category: 'Carnes y Pescados' },
      { name: 'Bolsa de canónigos o rúcula', quantity: '1 bolsa', category: 'Frutas y Verduras' },
      { name: 'Aguacate', quantity: '1 unidad', category: 'Frutas y Verduras' },
      { name: 'Nueces', quantity: '1 puñado', category: 'Despensa y Pasta' }
    ],
    notes: 'Cena rápida y llena de proteínas.'
  }
];

export const INITIAL_SHOPPING_ITEMS: ShoppingItem[] = [
  { id: 'shop-1', name: 'Huevos camperos', category: 'Lácteos y Huevos', quantity: '1 docena', is_bought: false, created_at: new Date().toISOString() },
  { id: 'shop-2', name: 'Leche entera o semi', category: 'Lácteos y Huevos', quantity: '2 briks', is_bought: true, created_at: new Date().toISOString() },
  { id: 'shop-3', name: 'Plátanos de Canarias', category: 'Frutas y Verduras', quantity: '1 kg', is_bought: false, created_at: new Date().toISOString() },
  { id: 'shop-4', name: 'Lomos de salmón fresco', category: 'Carnes y Pescados', quantity: '2 lomos', is_bought: false, created_at: new Date().toISOString() },
  { id: 'shop-5', name: 'Aceite de oliva virgen extra', category: 'Despensa y Pasta', quantity: '1 botella', is_bought: true, created_at: new Date().toISOString() },
  { id: 'shop-6', name: 'Papel de cocina', category: 'Limpieza y Hogar', quantity: '1 paquete', is_bought: false, created_at: new Date().toISOString() },
];
