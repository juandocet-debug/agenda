/**
 * CarritoContext.tsx — Estado global del carrito de compras.
 *
 * Provee acciones:
 *   agregarItem     — Agrega un ítem (valida que sea de la misma empresa)
 *   quitarItem      — Elimina un ítem por ID
 *   actualizarCantidad — Cambia la cantidad de un ítem
 *   vaciarCarrito   — Limpia todo el carrito
 *
 * Persistencia: AsyncStorage — el carrito sobrevive cierres de la app.
 */
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ItemCarrito, EstadoCarrito, calcularTotalItems } from '../../dominio/carrito/CarritoEntidad';

const STORAGE_KEY = '@agenda_carrito_v1';

// ── Tipos de acción ──────────────────────────────────────────────────────────

type Accion =
  | { type: 'AGREGAR_ITEM'; payload: ItemCarrito }
  | { type: 'QUITAR_ITEM'; payload: { id: string } }
  | { type: 'ACTUALIZAR_CANTIDAD'; payload: { id: string; cantidad: number } }
  | { type: 'CAMBIAR_PLAN'; payload: { id: string; tipoPlan: 'sesion' | '30_dias' | '90_dias' | '120_dias' } }
  | { type: 'VACIAR_CARRITO' }
  | { type: 'RESTAURAR'; payload: EstadoCarrito };

// ── Reducer ──────────────────────────────────────────────────────────────────

const estadoInicial: EstadoCarrito = { items: [], empresaId: null };

function carritoReducer(estado: EstadoCarrito, accion: Accion): EstadoCarrito {
  switch (accion.type) {
    case 'AGREGAR_ITEM': {
      const item = accion.payload;
      // Si el carrito ya tiene ítems de otra empresa, aviso al reducer (la UI valida antes)
      const nuevaEmpresa = estado.empresaId ?? item.empresaId;
      if (estado.empresaId && estado.empresaId !== item.empresaId) {
        // No mezclar empresas — devolver estado sin cambios
        return estado;
      }
      // Si ya existe el mismo slot, aumentar cantidad
      const existente = estado.items.find(
        i => i.servicioId === item.servicioId && i.fecha === item.fecha && i.hora === item.hora
      );
      if (existente) {
        return {
          ...estado,
          items: estado.items.map(i =>
            i.id === existente.id
              ? { ...i, cantidad: i.cantidad + item.cantidad }
              : i
          ),
        };
      }
      return {
        items: [...estado.items, item],
        empresaId: nuevaEmpresa,
      };
    }
    case 'QUITAR_ITEM': {
      const restantes = estado.items.filter(i => i.id !== accion.payload.id);
      return {
        items: restantes,
        empresaId: restantes.length > 0 ? estado.empresaId : null,
      };
    }
    case 'ACTUALIZAR_CANTIDAD': {
      const { id, cantidad } = accion.payload;
      if (cantidad <= 0) {
        const restantes = estado.items.filter(i => i.id !== id);
        return { items: restantes, empresaId: restantes.length > 0 ? estado.empresaId : null };
      }
      return {
        ...estado,
        items: estado.items.map(i => (i.id === id ? { ...i, cantidad } : i)),
      };
    }
    case 'VACIAR_CARRITO':
      return estadoInicial;
    case 'CAMBIAR_PLAN': {
      const { id, tipoPlan } = accion.payload;
      const nuevosItems = estado.items.map(item => {
        if (item.id === id) {
          let nuevoPrecio = item.precioBase || item.precio; // Fallback
          if (tipoPlan === '30_dias' && item.precio30Dias) nuevoPrecio = item.precio30Dias;
          else if (tipoPlan === '90_dias' && item.precio90Dias) nuevoPrecio = item.precio90Dias;
          else if (tipoPlan === '120_dias' && item.precio120Dias) nuevoPrecio = item.precio120Dias;
          
          return { ...item, tipoPlan, precio: nuevoPrecio };
        }
        return item;
      });
      return { ...estado, items: nuevosItems };
    }
    case 'RESTAURAR':
      return accion.payload;
    default:
      return estado;
  }
}

// ── Contexto ─────────────────────────────────────────────────────────────────

interface CarritoContextType {
  estado: EstadoCarrito;
  totalItems: number;
  agregarItem: (item: ItemCarrito) => void;
  quitarItem: (id: string) => void;
  actualizarCantidad: (id: string, cantidad: number) => void;
  cambiarPlan: (id: string, tipoPlan: 'sesion' | '30_dias' | '90_dias' | '120_dias') => void;
  vaciarCarrito: () => void;
  /** True si el carrito ya tiene ítems de otra empresa */
  esEmpresaDiferente: (empresaId: string) => boolean;
}

const CarritoContext = createContext<CarritoContextType | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────────────────

export const CarritoProvider = ({ children }: { children: ReactNode }) => {
  const [estado, dispatch] = useReducer(carritoReducer, estadoInicial);

  // Restaurar carrito desde AsyncStorage al montar
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const guardado: EstadoCarrito = JSON.parse(raw);
          if (guardado.items?.length) {
            dispatch({ type: 'RESTAURAR', payload: guardado });
          }
        } catch { /* carrito corrupto — ignorar */ }
      }
    });
  }, []);

  // Persistir cada cambio
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  }, [estado]);

  const agregarItem = (item: ItemCarrito) =>
    dispatch({ type: 'AGREGAR_ITEM', payload: item });

  const quitarItem = (id: string) =>
    dispatch({ type: 'QUITAR_ITEM', payload: { id } });

  const actualizarCantidad = (id: string, cantidad: number) =>
    dispatch({ type: 'ACTUALIZAR_CANTIDAD', payload: { id, cantidad } });

  const cambiarPlan = (id: string, tipoPlan: 'sesion' | '30_dias' | '90_dias' | '120_dias') =>
    dispatch({ type: 'CAMBIAR_PLAN', payload: { id, tipoPlan } });

  const vaciarCarrito = () => dispatch({ type: 'VACIAR_CARRITO' });

  const esEmpresaDiferente = (empresaId: string) =>
    !!estado.empresaId && estado.empresaId !== empresaId;

  return (
    <CarritoContext.Provider value={{
      estado,
      totalItems: calcularTotalItems(estado.items),
      agregarItem,
      quitarItem,
      actualizarCantidad,
      cambiarPlan,
      vaciarCarrito,
      esEmpresaDiferente,
    }}>
      {children}
    </CarritoContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useCarrito = (): CarritoContextType => {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error('useCarrito debe usarse dentro de CarritoProvider');
  return ctx;
};
