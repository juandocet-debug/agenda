import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PanResponder, View, ActivityIndicator } from 'react-native';
import { LoginScreen } from '../screens/LoginScreen';
import { MainNavigator } from './MainNavigator';
import { EmpresaNavigator } from './EmpresaNavigator';
import { EmpresaDetailScreen } from '../screens/EmpresaDetailScreen';
import { EditarEmpresaScreen } from '../screens/EditarEmpresaScreen';
import { ReservarScreen } from '../screens/ReservarScreen';
import { AgendarPublicoScreen } from '../screens/AgendarPublicoScreen';
import { CarritoScreen } from '../screens/CarritoScreen';
import { RegistroClienteScreen } from '../screens/RegistroClienteScreen';
import { ConfirmacionReservaScreen } from '../screens/ConfirmacionReservaScreen';
import { PagoExitosoScreen } from '../screens/PagoExitosoScreen';
import { ClienteHomeScreen } from '../screens/ClienteHomeScreen';
import { ExplorarEmpresasScreen } from '../screens/ExplorarEmpresasScreen';
import { MuroPublicacionesScreen } from '../screens/MuroPublicacionesScreen';
import { HorariosConfigScreen } from '../screens/HorariosConfigScreen';
import { RecuperarPasswordScreen } from '../screens/RecuperarPasswordScreen';
import { ResetearPasswordScreen } from '../screens/ResetearPasswordScreen';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { colors } from '../theme/colors';
import { useInactividadLogout } from '../hooks/useInactividadLogout';
import { CarritoProvider } from '../../core/aplicacion/carrito/CarritoContext';

const Stack = createNativeStackNavigator();

// Configuración de deep linking
const linking = {
  prefixes: ['http://localhost:19006', 'https://agenda-pi-bice.vercel.app', 'agendaapp://'],
  config: {
    screens: {
      ExplorarEmpresas: 'explorar',
      AgendarPublico: 'agendar/:empresaId',
      ReservarPublico: 'reservar/:empresaId',
      PagoExitoso: 'pago-exitoso/:citaId',
      Carrito: 'carrito',
      Login: 'login',
      EmpresaTabs: 'empresa',
      RecuperarPassword: 'recuperar-password',
      ResetearPassword: 'reset-password/:token',
    },
  },
};

export const AppNavigator = () => {
  const [isLoading, setIsLoading]   = useState(true);
  const [isLogueado, setIsLogueado] = useState(false);
  const [userRol, setUserRol]       = useState<string | null>(null);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Función de verificación de token reutilizable — la usamos en el mount
  // y en cada cambio de estado de navegación para detectar logouts externos.
  const verificarSesion = useCallback(async () => {
    const token = await obtenerTokenLocal();
    if (token && token.access) {
      setIsLogueado(true);
      setUserRol(token.rol || null);
    } else {
      // No hay token válido: aseguramos que el estado refleje sesión cerrada
      setIsLogueado(false);
      setUserRol(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await verificarSesion();
      setIsLoading(false);
    };
    init();
  }, [verificarSesion]);

  // ── Auto-logout por inactividad (30 min) ──────────────────────────────────
  const handleLogout = useCallback(() => {
    setIsLogueado(false);
    setUserRol(null);
    // React Navigation removerá automáticamente las pantallas protegidas
    // al cambiar el estado isLogueado a false, mostrando Login.
  }, []);

  const { reiniciarTimer } = useInactividadLogout({
    onLogout: handleLogout,
    activo: isLogueado,
  });

  // Detecta CUALQUIER toque en la app para reiniciar el timer de inactividad
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        reiniciarTimer();
        return false;
      },
    })
  ).current;

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <CarritoProvider>
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <NavigationContainer
          linking={linking}
          ref={navigationRef}
          onStateChange={() => {
            // Debounce de 300ms para evitar race condition:
            // login guarda el token y hace navigate al mismo tiempo.
            // Si verificarSesion corre ANTES de que guardarToken termine,
            // lee null y fuerza de vuelta al Login.
            clearTimeout((AppNavigator as any)._navTimer);
            (AppNavigator as any)._navTimer = setTimeout(() => {
              verificarSesion();
            }, 300);
          }}
        >
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            
            {/* 1. RUTA INICIAL DINÁMICA: Depende del estado de sesión */}
            {!isLogueado ? (
              <Stack.Group>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="RecuperarPassword" component={RecuperarPasswordScreen} options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="ResetearPassword" component={ResetearPasswordScreen} options={{ animation: 'slide_from_bottom' }} />
              </Stack.Group>
            ) : (
              <Stack.Group>
                {userRol === 'superadmin' ? (
                  <Stack.Screen name="MainTabs" component={MainNavigator} />
                ) : userRol === 'cliente' ? (
                  <Stack.Screen name="ClienteHome" component={ClienteHomeScreen} options={{ animation: 'slide_from_bottom' }} />
                ) : (
                  <Stack.Screen name="EmpresaTabs" component={EmpresaNavigator} />
                )}
                <Stack.Screen name="EmpresaDetail" component={EmpresaDetailScreen} options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="EditarEmpresa" component={EditarEmpresaScreen} options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="HorariosConfig" component={HorariosConfigScreen} options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="CrearCita" component={ReservarScreen} />
              </Stack.Group>
            )}

            {/* 2. RUTAS PÚBLICAS Y COMPARTIDAS (Siempre accesibles después de la ruta inicial) */}
            <Stack.Group>
              <Stack.Screen name="ExplorarEmpresas" component={ExplorarEmpresasScreen} options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="AgendarPublico" component={AgendarPublicoScreen} options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="ReservarPublico" component={AgendarPublicoScreen} options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="Carrito" component={CarritoScreen} options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="MuroPublicaciones" component={MuroPublicacionesScreen} options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="RegistroCliente" component={RegistroClienteScreen} options={{ animation: 'slide_from_bottom' }} />
              {(!isLogueado || userRol !== 'cliente') && (
                <Stack.Screen name="ClienteHome" component={ClienteHomeScreen} options={{ animation: 'slide_from_bottom' }} />
              )}
              <Stack.Screen name="ConfirmacionReserva" component={ConfirmacionReservaScreen} />
              <Stack.Screen name="PagoExitoso" component={PagoExitosoScreen} />
            </Stack.Group>

          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </CarritoProvider>
  );
};
