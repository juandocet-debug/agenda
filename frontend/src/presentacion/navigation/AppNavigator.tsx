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
import { ClienteHomeScreen } from '../screens/ClienteHomeScreen';
import { ExplorarEmpresasScreen } from '../screens/ExplorarEmpresasScreen';
import { MuroPublicacionesScreen } from '../screens/MuroPublicacionesScreen';
import { HorariosConfigScreen } from '../screens/HorariosConfigScreen';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { colors } from '../theme/colors';
import { useInactividadLogout } from '../hooks/useInactividadLogout';
import { CarritoProvider } from '../../core/aplicacion/carrito/CarritoContext';

const Stack = createNativeStackNavigator();

// Configuración de deep linking
const linking = {
  prefixes: ['http://localhost:19006', 'https://agendapro.app', 'agendaapp://'],
  config: {
    screens: {
      AgendarPublico: 'agendar/:empresaId',   // Nuevo flujo público
      ReservarPublico: 'reservar/:empresaId',  // Flujo anterior (compatibilidad)
      ConfirmacionReserva: 'pago-exitoso/:citaId',
      Carrito: 'carrito',
      Login: 'login',
      EmpresaTabs: 'empresa',
    },
  },
};

export const AppNavigator = () => {
  const [isLoading, setIsLoading]   = useState(true);
  const [isLogueado, setIsLogueado] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'MainTabs' | 'EmpresaTabs'>('Login');
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    const checkToken = async () => {
      const token = await obtenerTokenLocal();
      if (token && token.access) {
        setIsLogueado(true);
        setInitialRoute(token.rol === 'superadmin' ? 'MainTabs' : 'EmpresaTabs');
      }
      setIsLoading(false);
    };
    checkToken();
  }, []);

  // ── Auto-logout por inactividad (30 min) ──────────────────────────────────
  const handleLogout = useCallback(() => {
    setIsLogueado(false);
    navigationRef.current?.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
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
        return false; // No consume el evento — lo pasan a los hijos normalmente
      },
    })
  ).current;

  // ── Listener de navegación — saber cuándo el usuario llega a Login ─────────
  const handleNavStateChange = useCallback(() => {
    const currentRoute = navigationRef.current?.getCurrentRoute()?.name;
    if (currentRoute === 'Login') {
      setIsLogueado(false);
    } else if (currentRoute === 'EmpresaTabs' || currentRoute === 'MainTabs') {
      setIsLogueado(true);
    }
  }, []);

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
          onStateChange={handleNavStateChange}
        >
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false, animation: 'fade' }}
          >
            {/* Rutas públicas — sin login requerido */}
            <Stack.Screen name="AgendarPublico" component={AgendarPublicoScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Carrito" component={CarritoScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="RegistroCliente" component={RegistroClienteScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="ClienteHome" component={ClienteHomeScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="ExplorarEmpresas" component={ExplorarEmpresasScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="MuroPublicaciones" component={MuroPublicacionesScreen} options={{ animation: 'slide_from_right' }} />
            {/* Se mapea la ruta antigua al nuevo componente para retrocompatibilidad de links ya compartidos */}
            <Stack.Screen name="ReservarPublico" component={AgendarPublicoScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="MainTabs" component={MainNavigator} />
            <Stack.Screen name="EmpresaTabs" component={EmpresaNavigator} />
            <Stack.Screen name="EmpresaDetail" component={EmpresaDetailScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="EditarEmpresa" component={EditarEmpresaScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="HorariosConfig" component={HorariosConfigScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="CrearCita" component={ReservarScreen} />
            <Stack.Screen name="ConfirmacionReserva" component={ConfirmacionReservaScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </CarritoProvider>
  );
};
