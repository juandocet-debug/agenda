/**
 * RecuperarPasswordScreen.tsx — Pantalla de solicitud de recuperación de contraseña.
 *
 * Arquitectura: Presentación → UseCase → Repository (Port) → Adapter (Infra)
 * No hace fetch directamente. Usa SolicitarRecuperacionUseCase.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform, KeyboardAvoidingView, ImageBackground,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DjangoAuthAdapter } from '../../core/infraestructura/auth/DjangoAuthAdapter';
import { SolicitarRecuperacionUseCase } from '../../core/aplicacion/auth/SolicitarRecuperacionUseCase';

const authAdapter = new DjangoAuthAdapter();
const solicitarRecuperacionUseCase = new SolicitarRecuperacionUseCase(authAdapter);

export const RecuperarPasswordScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const handleSolicitar = async () => {
    setError('');
    setIsLoading(true);
    try {
      await solicitarRecuperacionUseCase.ejecutar(email);
      setEnviado(true);
    } catch (e: any) {
      setError(e.message || 'Error al enviar el email.');
    } finally {
      setIsLoading(false);
    }
  };

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
        {/* Botón volver */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color="#FFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <View style={styles.card}>
          {!enviado ? (
            <>
              <View style={styles.iconCircle}>
                <Feather name="lock" size={28} color="#2B5BEE" />
              </View>
              <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
              <Text style={styles.subtitle}>
                Ingresa tu correo y te enviaremos un link para restablecer tu contraseña.
              </Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#FF3B30" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.inputContainer}>
                <Feather name="mail" size={18} color="#4C5BEE" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                onPress={handleSolicitar}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Enviar link de recuperación</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={[styles.iconCircle, { backgroundColor: '#E8FFF1' }]}>
                <Feather name="check-circle" size={28} color="#34C759" />
              </View>
              <Text style={styles.title}>¡Email enviado!</Text>
              <Text style={styles.subtitle}>
                Revisa tu bandeja de entrada (y carpeta de spam). El link expira en 30 minutos.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.primaryBtnText}>Volver al inicio de sesión</Text>
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
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 20 : 10,
  },
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
    alignSelf: 'center',
    marginBottom: 20,
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
    paddingVertical: 8, marginBottom: 20,
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
