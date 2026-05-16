/**
 * Entidades del dominio del Carrito de Compras.
 * Define la estructura de un ítem en el carrito y el estado global.
 */

export interface ItemCarrito {
  /** ID local único para este ítem en el carrito */
  id: string;
  empresaId: string;
  /** Sede donde se realizará la actividad/cita */
  sedeId?: string;
  sedeNombre?: string;
  servicioId: string;
  servicioNombre: string;
  precio: number;      // Precio unitario
  moneda: string;      // 'COP', 'USD', etc.
  fecha: string;       // 'YYYY-MM-DD'
  fechaLegible: string; // 'Lunes 15 de mayo'
  hora: string;        // 'HH:MM'
  cantidad: number;    // Cupos a reservar
  duracion?: number;   // Minutos
  imagenUrl?: string;

  // --- Opciones de Paquetes ---
  permiteSesion?: boolean;
  precio30Dias?: number | null;
  precio90Dias?: number | null;
  precio120Dias?: number | null;
  tipoPlan?: 'sesion' | '30_dias' | '90_dias' | '120_dias';
  precioBase?: number; // Para poder calcular los cambios de plan sin perder el valor original
}

export interface EstadoCarrito {
  items: ItemCarrito[];
  empresaId: string | null; // Un carrito es siempre de una sola empresa
}

export const calcularTotal = (items: ItemCarrito[]): number =>
  items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

export const calcularTotalItems = (items: ItemCarrito[]): number =>
  items.reduce((acc, item) => acc + item.cantidad, 0);
