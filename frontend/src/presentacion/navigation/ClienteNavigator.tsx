import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FloatingButton } from '../components/FloatingButton';
import { ClienteHomeScreen } from '../screens/ClienteHomeScreen';
import { ExplorarEmpresasScreen } from '../screens/ExplorarEmpresasScreen';
import { MuroPublicacionesScreen } from '../screens/MuroPublicacionesScreen';
import { CarritoScreen } from '../screens/CarritoScreen';
import { AgendarPublicoScreen } from '../screens/AgendarPublicoScreen';
import { ConfirmacionReservaScreen } from '../screens/ConfirmacionReservaScreen';
import { RegistroEmpresaDesdeClienteScreen } from '../screens/RegistroEmpresaDesdeClienteScreen';

// Pantalla vacía para el botón + central
const AddActionScreen = () => null;

// Muro en modo solo lectura para clientes
const MuroClienteScreen = () => <MuroPublicacionesScreen isOwner={false} />;

// Pantalla de Perfil del cliente (usa el modal dentro de ClienteHome por ahora)
const PerfilClienteScreen = () => <ClienteHomeScreen />;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ClienteTabs = ({ navigation }: any) => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtitle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          elevation: 10,
          height: 85,
          paddingBottom: 15,
          paddingTop: 10,
          borderTopLeftRadius: 35,
          borderTopRightRadius: 35,
          position: 'absolute',
          bottom: 0,
          width: '100%',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 5,
        },
        tabBarIcon: ({ color }) => {
          let iconName: any = 'home';
          if (route.name === 'Inicio') iconName = 'home';
          else if (route.name === 'Agenda') iconName = 'calendar';
          else if (route.name === 'Muro') iconName = 'image';
          else if (route.name === 'Perfil') iconName = 'user';
          return <Feather name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={ClienteHomeScreen} />
      <Tab.Screen name="Agenda" component={ExplorarEmpresasScreen} />

      {/* Botón + flotante central — lleva a Explorar */}
      <Tab.Screen
        name="Add"
        component={AddActionScreen}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: () => (
            <View style={{ flex: 1, alignItems: 'center' }}>
              <FloatingButton onPress={() => navigation.navigate('ExplorarEmpresas')} />
            </View>
          ),
        }}
      />

      <Tab.Screen name="Muro" component={MuroClienteScreen} />
      <Tab.Screen name="Perfil" component={PerfilClienteScreen} />
    </Tab.Navigator>
  );
};

export const ClienteNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="ClienteTabs" component={ClienteTabs} />
      <Stack.Screen name="ExplorarEmpresas" component={ExplorarEmpresasScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="AgendarPublico" component={AgendarPublicoScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Carrito" component={CarritoScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ConfirmacionReserva" component={ConfirmacionReservaScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="RegistroEmpresaDesdeCliente" component={RegistroEmpresaDesdeClienteScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
};
