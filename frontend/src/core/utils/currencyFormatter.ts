/**
 * Formatea un número como moneda usando el formato nativo internacional (Intl.NumberFormat).
 * - COP: Usa 'es-CO', sin decimales y con punto para miles (ej. $ 100.000).
 * - USD/EUR/otros: Usa 'en-US' o el por defecto, con 2 decimales (ej. $ 100,000.00).
 * 
 * @param valor - El precio en formato numérico (float/int)
 * @param moneda - El código de la moneda (ej. 'COP', 'USD', 'MXN', 'EUR')
 */
export const formatearMoneda = (valor: number | string, moneda: string = 'COP'): string => {
  const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
  
  if (isNaN(numero)) return '$ 0';

  if (moneda.toUpperCase() === 'COP') {
    // Formato especial para Colombia: sin decimales.
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numero);
  }

  // Formato genérico (por defecto USD/MXN con 2 decimales)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);
};
