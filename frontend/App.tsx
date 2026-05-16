import React from 'react';
import { AppNavigator } from './src/presentacion/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { ActivityIndicator, View } from 'react-native';
import { decode, encode } from 'base-64';

// Polyfill para atob/btoa que no existen en el runtime nativo de Android
if (!global.btoa) { global.btoa = encode; }
if (!global.atob) { global.atob = decode; }

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
  });

  // Mostrar spinner mientras cargan las fuentes — nunca retornar null en nativo
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
