/**
 * useInactividadLogout.ts
 *
 * Hook que cierra sesión automáticamente si el usuario no interactúa
 * con la app durante TIEMPO_INACTIVIDAD_MS milisegundos.
 *
 * Detecta: toques en pantalla, scroll, teclado.
 * Muestra: alerta de advertencia 1 minuto antes de cerrar sesión.
 * Al cerrar: borra el token y navega a Login.
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { eliminarTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

// ── Configuración ─────────────────────────────────────────────────────────────
const TIEMPO_INACTIVIDAD_MS  = 30 * 60 * 1000; // 30 minutos sin actividad → logout
const AVISO_ANTICIPADO_MS    =  1 * 60 * 1000; // Aviso 1 minuto antes del logout

interface Props {
  /** Callback que navega a la pantalla de Login */
  onLogout: () => void;
  /** Si false, el hook está desactivado (ej: usuario no logueado) */
  activo?: boolean;
}

export const useInactividadLogout = ({ onLogout, activo = true }: Props) => {
  const timerLogout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerAviso  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisando    = useRef(false);

  const limpiarTimers = useCallback(() => {
    if (timerLogout.current) clearTimeout(timerLogout.current);
    if (timerAviso.current)  clearTimeout(timerAviso.current);
    timerLogout.current = null;
    timerAviso.current  = null;
    avisando.current    = false;
  }, []);

  const cerrarSesion = useCallback(async () => {
    limpiarTimers();
    await eliminarTokenLocal();
    onLogout();
  }, [limpiarTimers, onLogout]);

  const reiniciarTimer = useCallback(() => {
    if (!activo) return;

    // Si ya está mostrando el aviso y el usuario toca, cancelamos el logout
    if (avisando.current) {
      avisando.current = false;
    }

    limpiarTimers();

    // Timer del aviso (TIEMPO - 1 minuto)
    timerAviso.current = setTimeout(() => {
      avisando.current = true;
      Alert.alert(
        '⏳ Sesión por vencer',
        'Tu sesión se cerrará en 1 minuto por inactividad. ¿Deseas continuar?',
        [
          {
            text: 'Cerrar sesión',
            style: 'destructive',
            onPress: cerrarSesion,
          },
          {
            text: 'Continuar',
            onPress: reiniciarTimer, // Reinicia el timer al tocar "Continuar"
          },
        ],
        { cancelable: false }
      );
    }, TIEMPO_INACTIVIDAD_MS - AVISO_ANTICIPADO_MS);

    // Timer del logout automático
    timerLogout.current = setTimeout(() => {
      cerrarSesion();
    }, TIEMPO_INACTIVIDAD_MS);
  }, [activo, limpiarTimers, cerrarSesion]);

  // Reiniciar el timer cuando la app vuelve a primer plano
  useEffect(() => {
    if (!activo) return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        reiniciarTimer();
      } else if (nextState === 'background' || nextState === 'inactive') {
        // Cuando va a background, dejamos el timer corriendo normalmente
        // (el backend ya no recibe requests, pero el token puede expirar)
      }
    };

    const subs = AppState.addEventListener('change', handleAppState);
    reiniciarTimer(); // Iniciar al montar

    return () => {
      subs.remove();
      limpiarTimers();
    };
  }, [activo, reiniciarTimer, limpiarTimers]);

  // Expone reiniciarTimer para usarlo en el PanResponder del NavigationContainer
  return { reiniciarTimer };
};
