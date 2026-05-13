import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { MainNavigator } from './MainNavigator';
import { EmpresaNavigator } from './EmpresaNavigator';
import { EmpresaDetailScreen } from '../screens/EmpresaDetailScreen';
import { EditarEmpresaScreen } from '../screens/EditarEmpresaScreen';
import { ReservarScreen } from '../screens/ReservarScreen';
import { ConfirmacionReservaScreen } from '../screens/ConfirmacionReservaScreen';
import { HorariosConfigScreen } from '../screens/HorariosConfigScreen';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

// Configuración de deep linking — el cliente recibe una URL así:
// http://localhost:19006/reservar/EMPRESA_ID
const linking = {
  prefixes: ['http://localhost:19006', 'https://agendapro.app', 'agendaapp://'],
  config: {
    screens: {
      ReservarPublico: 'reservar/:empresaId',
      ConfirmacionReserva: 'pago-exitoso/:citaId',
      Login: 'login',
      EmpresaTabs: 'empresa',
    },
  },
};

export const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'MainTabs' | 'EmpresaTabs'>('Login');

  useEffect(() => {
    const checkToken = async () => {
      const token = await obtenerTokenLocal();
      if (token && token.access) {
        // Bifurcar según el rol almacenado en el token
        if (token.rol === 'superadmin') {
          setInitialRoute('MainTabs');
        } else {
          setInitialRoute('EmpresaTabs');
        }
      }
      setIsLoading(false);
    };
    checkToken();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        {/* Ruta pública para clientes — sin login */}
        <Stack.Screen
          name="ReservarPublico"
          component={ReservarScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
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
  );
};
