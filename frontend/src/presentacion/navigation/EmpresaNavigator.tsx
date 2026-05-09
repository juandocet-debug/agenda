import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FloatingButton } from '../components/FloatingButton';
import { EmpresaHomeScreen } from '../screens/EmpresaHomeScreen';
import { CrearProfesionalScreen } from '../screens/CrearProfesionalScreen';

// Pantallas placeholder
const AgendaScreen = () => <View style={{ flex: 1, backgroundColor: colors.background }}><Text>Agenda</Text></View>;
const ClientesScreen = () => <View style={{ flex: 1, backgroundColor: colors.background }}><Text>Clientes</Text></View>;
const EmpresaProfileScreen = () => <View style={{ flex: 1, backgroundColor: colors.background }}><Text>Perfil Empresa</Text></View>;
const AddActionScreen = () => null;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const EmpresaTabs = ({ navigation }: any) => {
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
            paddingBottom: 15, // Reducido para evitar cortes en web/ios
            paddingTop: 10,
            borderTopLeftRadius: 35,
            borderTopRightRadius: 35,
            position: 'absolute',
            bottom: 0,
            width: '100%',
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 5,
          },
          tabBarIcon: ({ color, size }) => {
            let iconName: any = 'home';
            if (route.name === 'Inicio') iconName = 'home';
            else if (route.name === 'Agenda') iconName = 'calendar';
            else if (route.name === 'Clientes') iconName = 'users';
            else if (route.name === 'Perfil') iconName = 'user';
            
            return <Feather name={iconName} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Inicio" component={EmpresaHomeScreen} />
        <Tab.Screen name="Agenda" component={AgendaScreen} />
        
        <Tab.Screen 
          name="Add" 
          component={AddActionScreen}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: () => null,
            tabBarButton: () => (
              <FloatingButton onPress={() => navigation.navigate('CrearProfesional')} />
            )
          }}
        />
        
        <Tab.Screen name="Clientes" component={ClientesScreen} />
        <Tab.Screen name="Perfil" component={EmpresaProfileScreen} />
      </Tab.Navigator>
  );
};

export const EmpresaNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="EmpresaTabs" component={EmpresaTabs} />
      <Stack.Screen name="CrearProfesional" component={CrearProfesionalScreen} />
    </Stack.Navigator>
  );
};
