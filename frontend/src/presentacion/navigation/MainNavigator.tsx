import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { FloatingButton } from '../components/FloatingButton';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EmpresaSettingsScreen } from '../screens/EmpresaSettingsScreen';
import { NoticiasDashboardScreen } from '../screens/NoticiasDashboardScreen';

const PaymentScreen = () => <View style={{ flex: 1, backgroundColor: colors.background }}><Text>Payment</Text></View>;
const AddActionScreen = () => null;

const Tab = createBottomTabNavigator();

export const MainNavigator = () => {
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
            paddingBottom: 15, // Reducido para evitar cortes
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
            else if (route.name === 'Noticias') iconName = 'message-square';
            else if (route.name === 'Pagos') iconName = 'dollar-sign';
            else if (route.name === 'Identidad') iconName = 'layout';
            
            return <Feather name={iconName} size={22} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Inicio" component={HomeScreen} />
        <Tab.Screen name="Noticias" component={NoticiasDashboardScreen} />
        
        <Tab.Screen 
          name="Add" 
          component={AddActionScreen}
          options={{
            tabBarLabel: () => null,
            tabBarIcon: () => null,
            tabBarButton: () => (
              <FloatingButton onPress={() => console.log('Acción Central')} />
            )
          }}
        />
        
        <Tab.Screen name="Pagos" component={PaymentScreen} />
        <Tab.Screen name="Identidad" component={EmpresaSettingsScreen} />
      </Tab.Navigator>
  );
};
