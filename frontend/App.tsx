import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppNavigator } from './src/presentacion/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { decode, encode } from 'base-64';

// ─── Polyfill atob/btoa para Android nativo ───────────────────────────────────
if (!global.btoa) { global.btoa = encode; }
if (!global.atob) { global.atob = decode; }

// ─── Capturar errores JS no controlados ──────────────────────────────────────
let crashMessage = '';
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
  crashMessage = `[${isFatal ? 'FATAL' : 'ERROR'}]\n${error?.message}\n\n${error?.stack}`;
  originalHandler && originalHandler(error, isFatal);
});

// ─── Error Boundary: muestra el error en pantalla en vez de cerrar ───────────
interface EBState { hasError: boolean; error: string; }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error: error?.message + '\n\n' + error?.stack };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.log('CRASH:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.crash}>
          <Text style={s.crashTitle}>⚠️ Error detectado</Text>
          <Text style={s.crashSub}>Toma una foto de esta pantalla y compártela:</Text>
          <ScrollView style={s.crashBox}>
            <Text style={s.crashText}>{this.state.error || crashMessage}</Text>
          </ScrollView>
          <TouchableOpacity style={s.crashBtn} onPress={() => this.setState({ hasError: false, error: '' })}>
            <Text style={s.crashBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

import * as Updates from 'expo-updates';

export default function App() {
  const [updateAvailable, setUpdateAvailable] = React.useState(false);

  React.useEffect(() => {
    // expo-updates solo funciona en iOS/Android, no en web
    if (__DEV__ || Platform.OS === 'web') return;

    // Escuchar eventos de actualización
    const subscription = Updates.addListener((event) => {
      if (event.type === Updates.UpdateEventType.UPDATE_AVAILABLE) {
        setUpdateAvailable(true);
      }
    });

    // Validar al iniciar
    async function checkUpdates() {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          setUpdateAvailable(true);
        }
      } catch (err) {
        console.log('Error checking updates:', err);
      }
    }
    checkUpdates();

    return () => subscription.remove();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppNavigator />
        {updateAvailable && (
          <View style={s.updateBanner}>
            <View style={s.updateTextCol}>
              <Text style={s.updateEmoji}>🔄</Text>
              <View>
                <Text style={s.updateTitle}>Actualización lista</Text>
                <Text style={s.updateSubtitle}>Toca para aplicar los cambios</Text>
              </View>
            </View>
            <TouchableOpacity style={s.updateBtn} onPress={() => Updates.reloadAsync()}>
              <Text style={s.updateBtnText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  crash: { flex: 1, backgroundColor: '#1a1a2e', padding: 20, paddingTop: 60, alignItems: 'center' },
  crashTitle: { fontSize: 22, fontWeight: 'bold', color: '#ff6b6b', marginBottom: 8 },
  crashSub: { fontSize: 13, color: '#aaa', marginBottom: 16, textAlign: 'center' },
  crashBox: { width: '100%', backgroundColor: '#16213e', borderRadius: 10, padding: 14, maxHeight: 400 },
  crashText: { fontSize: 11, color: '#e94560', fontFamily: 'monospace', lineHeight: 18 },
  crashBtn: { marginTop: 20, backgroundColor: '#6C63FF', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  crashBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  // Banner de actualización
  updateBanner: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#1E2532',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 99999,
  },
  updateTextCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  updateEmoji: {
    fontSize: 22,
  },
  updateTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  updateSubtitle: {
    color: '#828C9A',
    fontSize: 12,
    marginTop: 2,
  },
  updateBtn: {
    backgroundColor: '#4C5BEE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  updateBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
