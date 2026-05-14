/**
 * useInactividadLogout.ts
 *
 * Hook que cierra sesión automáticamente si el usuario no interactúa
 * con la app durante TIEMPO_INACTIVIDAD_MS milisegundos.
 *
 * Detección:
 *  - WEB:    escucha eventos del DOM (mousemove, click, keydown, scroll, touchstart)
 *  - NATIVO: el AppNavigator pasa reiniciarTimer al PanResponder
 *
 * Flujo:
 *  29 min → alerta de aviso
 *  30 min → logout automático + borra token
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Alert, Platform } from 'react-native';
import { eliminarTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

// ── Configuración ─────────────────────────────────────────────────────────────
const TIEMPO_INACTIVIDAD_MS = 2 * 60 * 1000; // 2 minutos
const AVISO_ANTICIPADO_MS   =  1 * 60 * 1000; // Aviso 1 minuto antes

interface Props {
  onLogout: () => void;
  activo?: boolean;
}

export const useInactividadLogout = ({ onLogout, activo = true }: Props) => {
  const timerLogout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerAviso  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avisando    = useRef(false);

  // Usamos ref para que los event listeners de DOM siempre tengan
  // acceso a la versión actualizada de reiniciarTimer sin re-registrarse
  const reiniciarTimerRef = useRef<() => void>(() => {});

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
    avisando.current = false;
    limpiarTimers();

    // Aviso 1 minuto antes
    timerAviso.current = setTimeout(() => {
      avisando.current = true;
      Alert.alert(
        '⏳ Sesión por vencer',
        'Tu sesión se cerrará en 1 minuto por inactividad. ¿Deseas continuar?',
        [
          { text: 'Cerrar sesión', style: 'destructive', onPress: cerrarSesion },
          { text: 'Continuar', onPress: reiniciarTimer },
        ],
        { cancelable: false }
      );
    }, TIEMPO_INACTIVIDAD_MS - AVISO_ANTICIPADO_MS);

    // Logout automático
    timerLogout.current = setTimeout(() => {
      cerrarSesion();
    }, TIEMPO_INACTIVIDAD_MS);
  }, [activo, limpiarTimers, cerrarSesion]);

  // Mantener el ref actualizado con la última versión de reiniciarTimer
  useEffect(() => {
    reiniciarTimerRef.current = reiniciarTimer;
  }, [reiniciarTimer]);

  // ── Web: escuchar eventos del DOM ─────────────────────────────────────────
  useEffect(() => {
    if (!activo || Platform.OS !== 'web') return;

    const handler = () => reiniciarTimerRef.current();

    // Eventos que indican actividad del usuario en navegador
    const EVENTOS_WEB = [
      'mousemove',
      'mousedown',
      'click',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
    ];

    EVENTOS_WEB.forEach(ev =>
      document.addEventListener(ev, handler, { passive: true })
    );

    reiniciarTimerRef.current(); // Arrancar el timer al activarse

    return () => {
      EVENTOS_WEB.forEach(ev => document.removeEventListener(ev, handler));
      limpiarTimers();
    };
  }, [activo, limpiarTimers]);

  // ── Nativo: escuchar cambios de AppState ──────────────────────────────────
  useEffect(() => {
    if (!activo || Platform.OS === 'web') return;

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') reiniciarTimer();
    };

    const subs = AppState.addEventListener('change', handleAppState);
    reiniciarTimer(); // Arrancar el timer al activarse

    return () => {
      subs.remove();
      limpiarTimers();
    };
  }, [activo, reiniciarTimer, limpiarTimers]);

  // Expone reiniciarTimer para que AppNavigator lo use con PanResponder (nativo)
  return { reiniciarTimer };
};
