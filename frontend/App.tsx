import React from 'react';
import { AppNavigator } from './src/presentacion/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { Text, TextInput } from 'react-native';

// Hack global para React Native: sobreescribir la fuente por defecto.
// Evita que cualquier componente Text use fuentes de sistema genéricas o negritas.
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = { fontFamily: 'Inter_400Regular' };

(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.style = { fontFamily: 'Inter_400Regular' };

export default function App() {
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
  });

  if (!fontsLoaded) {
    return null;
  }
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
