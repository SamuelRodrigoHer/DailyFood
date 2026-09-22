import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ShoppingCategory } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateSpanish(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString + 'T12:00:00');
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function getDayName(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString + 'T12:00:00');
  const name = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function getWeekDates(baseDate: Date = new Date()): { dateString: string; dayName: string; dayNumber: number; isToday: boolean }[] {
  const current = new Date(baseDate);
  const day = current.getDay();
  // En JS 0 es Domingo. Ajustamos para que Lunes sea el primer día (índice 0):
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  
  const monday = new Date(current.setDate(diff));
  const week = [];

  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    const dateString = nextDay.toISOString().split('T')[0];
    const dayName = new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(nextDay);
    
    week.push({
      dateString,
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      dayNumber: nextDay.getDate(),
      isToday: dateString === todayStr,
    });
  }

  return week;
}

export function guessShoppingCategory(itemName: string): ShoppingCategory {
  const lower = itemName.toLowerCase().trim();

  // Frutas y Verduras
  if (/(manzana|platano|plátano|pera|naranja|limon|limón|fresa|aguacate|tomate|lechuga|cebolla|patata|zanahoria|ajo|pimiento|espinaca|calabacin|calabacín|champinon|champiñón|judia|fruta|verdura)/i.test(lower)) {
    return 'Frutas y Verduras';
  }
  // Carnes y Pescados
  if (/(pollo|ternera|cerdo|salmon|salmón|merluza|atun|atún|pavo|filete|hamburguesa|jamon|jamón|lomo|carne|pescado|gamba|langostino)/i.test(lower)) {
    return 'Carnes y Pescados';
  }
  // Lácteos y Huevos
  if (/(leche|huevo|queso|yogur|mantequilla|nata|burrata|parmesano|mozzarella)/i.test(lower)) {
    return 'Lácteos y Huevos';
  }
  // Panadería y Cereales
  if (/(pan|tostada|galleta|cereal|avena|croissant|magdalena|harina)/i.test(lower)) {
    return 'Panadería y Cereales';
  }
  // Despensa y Pasta
  if (/(arroz|pasta|espagueti|macarron|macarrón|lenteja|garbanzo|alubia|aceite|vinagre|sal|azucar|azúcar|tomate frito|pimenton|pimentón|oregano|orégano|cafe|café|te|té)/i.test(lower)) {
    return 'Despensa y Pasta';
  }
  // Congelados
  if (/(congelado|helado|guisante|pizza|hielo)/i.test(lower)) {
    return 'Congelados';
  }
  // Bebidas
  if (/(agua|cerveza|vino|refresco|zumo|cola|gaseosa)/i.test(lower)) {
    return 'Bebidas';
  }
  // Limpieza y Hogar
  if (/(jabon|jabón|detergente|suavizante|lejia|lejía|friegasuelos|papel higienico|papel higiénico|papel cocina|servilleta|bolsa basura|estropajo|champu|champú|gel)/i.test(lower)) {
    return 'Limpieza y Hogar';
  }

  return 'Otros';
}
