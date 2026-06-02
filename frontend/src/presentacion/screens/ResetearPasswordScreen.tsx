/**
 * ResetearPasswordScreen.tsx — Pantalla para establecer la nueva contraseña.
 *
 * Cómo llega el token:
 *   - Web: el link del email es /reset-password/TOKEN → deep link capturado por AppNavigator
 *   - App: el link del email abre la app via deep link agendaapp://reset-password/TOKEN
 *
 * Arquitectura: Presentación → UseCase → Repository (Port) → Adapter (Infra)
 * No hace fetch directamente. Usa RestablecerPasswordUseCase.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, KeyboardAvoidingView, ImageBackground,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DjangoAuthAdapter } from '../../core/infraestructura/auth/DjangoAuthAdapter';
import { RestablecerPasswordUseCase } from '../../core/aplicacion/auth/RestablecerPasswordUseCase';

const authAdapter = new DjangoAuthAdapter();
const restablecerPasswordUseCase = new RestablecerPasswordUseCase(authAdapter);

export const ResetearPasswordScreen = ({ navigation, route }: any) => {
  // El token llega como parámetro de navegación (web: extraído del path, app: del deep link)
  const token: string = route?.params?.token || '';

  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [exitoso, setExitoso] = useState(false);
  const [rolRedireccion, setRolRedireccion] = useState('');
  const [error, setError] = useState('');

  const handleReset = async () => {
    setError('');
    setIsLoading(true);
    try {
      const rol = await restablecerPasswordUseCase.ejecutar(token, nuevaPassword, confirmarPassword);
      setRolRedireccion(rol);
      setExitoso(true);
    } catch (e: any) {
      setError(e.message || 'Error al restablecer la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinuar = () => {
    // Redirigir según el rol devuelto por el backend
    if (rolRedireccion === 'superadmin') {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  };

  if (!token) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 30 }]}>
        <Feather name="alert-triangle" size={48} color="#FF3B30" />
        <Text style={{ marginTop: 20, fontSize: 18, color: '#0F172A', fontWeight: '700', textAlign: 'center' }}>
          Link inválido
        </Text>
        <Text style={{ marginTop: 8, color: '#64748B', textAlign: 'center' }}>
          Este link de recuperación no es válido o ha expirado.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 24 }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.primaryBtnText}>Ir al inicio de sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ImageBackground
        source={require('../../../assets/images/page3.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1 }} />

        <View style={styles.card}>
          {!exitoso ? (
            <>
              <View style={styles.iconCircle}>
                <Feather name="key" size={28} color="#2B5BEE" />
              </View>
              <Text style={styles.title}>Nueva contraseña</Text>
              <Text style={styles.subtitle}>
                Elige una contraseña segura de al menos 6 caracteres.
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Campo nueva contraseña */}
              <View style={styles.inputContainer}>
                <Feather name="lock" size={18} color="#4C5BEE" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nueva contraseña"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPass}
                  value={nuevaPassword}
                  onChangeText={setNuevaPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)}>
                  <Feather name={showPass ? 'eye' : 'eye-off'} size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Campo confirmar contraseña */}
              <View style={[styles.inputContainer, { marginBottom: 24 }]}>
                <Feather name="lock" size={18} color="#4C5BEE" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirmar contraseña"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirm}
                  value={confirmarPassword}
                  onChangeText={setConfirmarPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Feather name={showConfirm ? 'eye' : 'eye-off'} size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                onPress={handleReset}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Guardar contraseña</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#E8FFF1' }]}>
                <Feather name="check-circle" size={32} color="#34C759" />
              </View>
              <Text style={styles.title}>¡Contraseña actualizada!</Text>
              <Text style={styles.subtitle}>
                Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con ella.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleContinuar}>
                <Text style={styles.primaryBtnText}>Iniciar sesión</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#4C5BEE' },
  safe: { flex: 1, paddingHorizontal: 20 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 28,
    marginBottom: Platform.OS === 'web' ? 24 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#EEF1FF',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 20, fontWeight: '700', color: '#0F172A',
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 14, color: '#64748B', textAlign: 'center',
    lineHeight: 20, marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFEBEA', padding: 10, borderRadius: 10,
    marginBottom: 14,
  },
  errorText: { color: '#FF3B30', fontSize: 13, flex: 1 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
    paddingVertical: 8, marginBottom: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#0F172A', height: 40 },
  primaryBtn: {
    backgroundColor: '#2B5BEE', borderRadius: 25,
    height: 50, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2B5BEE', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
