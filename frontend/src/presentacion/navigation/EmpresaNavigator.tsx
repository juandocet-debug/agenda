import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FloatingButton } from '../components/FloatingButton';
import { EmpresaHomeScreen } from '../screens/EmpresaHomeScreen';
import { CrearProfesionalScreen } from '../screens/CrearProfesionalScreen';
import { ProfesionalesListScreen } from '../screens/ProfesionalesListScreen';
import { CrearPublicacionScreen } from '../screens/CrearPublicacionScreen';
import { MuroPublicacionesScreen } from '../screens/MuroPublicacionesScreen';
import { ComentariosScreen } from '../screens/ComentariosScreen';
import { ReservarScreen } from '../screens/ReservarScreen';
import { ConfirmacionReservaScreen } from '../screens/ConfirmacionReservaScreen';
import { EmpresaProfileScreen } from '../screens/EmpresaProfileScreen';
import { ServiciosListScreen } from '../screens/ServiciosListScreen';
import { CrearEditarServicioScreen } from '../screens/CrearEditarServicioScreen';
import { AgendaScreen } from '../screens/AgendaScreen';
import { ConfigurarPagosScreen } from '../screens/ConfigurarPagosScreen';

// Pantallas placeholder
const ClientesScreen = () => <View style={{ flex: 1, backgroundColor: colors.background }}><Text>Clientes</Text></View>;
const AddActionScreen = () => null;

const PublicacionesTabScreen = () => <MuroPublicacionesScreen isOwner={true} />;

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
            fontWeight: '500',
            marginTop: 5,
          },
          tabBarIcon: ({ color, size }) => {
            let iconName: any = 'home';
            if (route.name === 'Inicio') iconName = 'home';
            else if (route.name === 'Agenda') iconName = 'calendar';
            else if (route.name === 'Muro') iconName = 'image';
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
            tabBarButton: (props) => (
              <View style={{ flex: 1, alignItems: 'center' }}>
                <FloatingButton onPress={() => navigation.navigate('CrearPublicacion')} />
              </View>
            )
          }}
        />
        
        <Tab.Screen 
          name="Muro" 
          component={PublicacionesTabScreen} 
        />
        <Tab.Screen 
          name="Perfil" 
          component={EmpresaProfileScreen} 
        />
      </Tab.Navigator>
  );
};

export const EmpresaNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }}>
      <Stack.Screen name="EmpresaTabs" component={EmpresaTabs} />
      <Stack.Screen name="CrearProfesional" component={CrearProfesionalScreen} />
      <Stack.Screen name="ProfesionalesList" component={ProfesionalesListScreen} />
      <Stack.Screen name="CrearPublicacion" component={CrearPublicacionScreen} />
      <Stack.Screen
        name="MuroPublicaciones"
        component={({ navigation }: any) => (
          <MuroPublicacionesScreen isOwner={true} />
        )}
      />
      <Stack.Screen
        name="Comentarios"
        component={ComentariosScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="CrearCita" component={ReservarScreen} />
      <Stack.Screen name="ConfirmacionReserva" component={ConfirmacionReservaScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ServiciosList" component={ServiciosListScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="CrearEditarServicio" component={CrearEditarServicioScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Perfil" component={EmpresaProfileScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ConfigurarPagos" component={ConfigurarPagosScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
};
