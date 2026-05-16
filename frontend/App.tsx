import React from 'react';
import { AppNavigator } from './src/presentacion/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { decode, encode } from 'base-64';

// Polyfill para atob/btoa — no existen en el runtime nativo de Android
if (!global.btoa) { global.btoa = encode; }
if (!global.atob) { global.atob = decode; }

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
