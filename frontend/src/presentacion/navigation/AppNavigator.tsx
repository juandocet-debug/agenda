import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { MainNavigator } from './MainNavigator';
import { EmpresaNavigator } from './EmpresaNavigator';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

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
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainNavigator} />
        <Stack.Screen name="EmpresaTabs" component={EmpresaNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
