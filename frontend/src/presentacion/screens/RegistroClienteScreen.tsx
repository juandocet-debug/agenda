import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator, SafeAreaView,
  Platform, KeyboardAvoidingView, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { guardarTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { API_BASE as API } from '../../core/config/api';

export const RegistroClienteScreen = ({ navigation }: any) => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const registrar = async () => {
    if (!nombre.trim() || !email.trim() || !password) {
      shake();
      Alert.alert('Faltan datos', 'Nombre, email y contraseña son obligatorios.');
      return;
    }
    if (password.length < 6) {
      shake();
      Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCargando(true);
    try {
      const r = await fetch(`${API}/api/auth/registro-cliente/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim().toLowerCase(), telefono: telefono.trim(), password }),
      });
      const d = await r.json();

      if (r.status === 409) {
        Alert.alert('Email en uso', 'Ya existe una cuenta con ese email. ¿Quieres iniciar sesión?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Iniciar sesión', onPress: () => navigation.navigate('Login') },
        ]);
        return;
      }

      if (!d.ok) {
        Alert.alert('Error', d.error || 'No se pudo crear la cuenta.');
        return;
      }

      // Auto-login: guardar tokens
      await guardarTokenLocal({
        access: d.access,
        refresh: d.refresh,
        rol: 'cliente',
        usuario_id: String(d.datos.usuario_id),
        nombre: d.datos.nombre,
        email: d.datos.email,
        telefono: d.datos.telefono,
      });

      Alert.alert('¡Bienvenido!', `Tu cuenta fue creada. Ahora puedes completar tu reserva.`, [
        { text: 'Continuar', onPress: () => navigation.navigate('Carrito') },
      ]);
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Feather name="arrow-left" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <Animated.View style={[s.hero, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={s.heroIcon}>
              <Feather name="user-plus" size={36} color={colors.primary} />
            </View>
            <Text style={s.heroTitle}>Crea tu cuenta</Text>
            <Text style={s.heroSub}>Es rápido y gratis. Solo lo necesitas para confirmar tu reserva.</Text>
          </Animated.View>

          {/* Formulario */}
          <View style={s.form}>
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Nombre completo *</Text>
              <View style={s.inputWrap}>
                <Feather name="user" size={16} color="#94A3B8" style={s.inputIcon} />
                <TextInput
                  style={s.input} placeholder="Tu nombre" placeholderTextColor="#CBD5E0"
                  value={nombre} onChangeText={setNombre} autoCapitalize="words"
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Email *</Text>
              <View style={s.inputWrap}>
                <Feather name="mail" size={16} color="#94A3B8" style={s.inputIcon} />
                <TextInput
                  style={s.input} placeholder="tucorreo@email.com" placeholderTextColor="#CBD5E0"
                  value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none"
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Teléfono / WhatsApp</Text>
              <View style={s.inputWrap}>
                <Feather name="phone" size={16} color="#94A3B8" style={s.inputIcon} />
                <TextInput
                  style={s.input} placeholder="300 123 4567" placeholderTextColor="#CBD5E0"
                  value={telefono} onChangeText={setTelefono} keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Contraseña * (mín. 6 caracteres)</Text>
              <View style={s.inputWrap}>
                <Feather name="lock" size={16} color="#94A3B8" style={s.inputIcon} />
                <TextInput
                  style={[s.input, { flex: 1 }]} placeholder="••••••••" placeholderTextColor="#CBD5E0"
                  value={password} onChangeText={setPassword}
                  secureTextEntry={!verPassword}
                />
                <TouchableOpacity onPress={() => setVerPassword(!verPassword)} style={{ padding: 4 }}>
                  <Feather name={verPassword ? 'eye-off' : 'eye'} size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[s.btnRegistrar, cargando && { opacity: 0.7 }]}
              onPress={registrar} disabled={cargando}>
              {cargando
                ? <ActivityIndicator color="#fff" />
                : <><Feather name="check-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={s.btnRegistrarTxt}>Crear cuenta y continuar</Text></>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.loginLink} onPress={() => navigation.navigate('Login')}>
              <Text style={s.loginLinkTxt}>¿Ya tienes cuenta? <Text style={{ color: colors.primary, fontWeight: '500' }}>Iniciar sesión</Text></Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { padding: 20 },
  header: {
    paddingTop: Platform.OS === 'web' ? 0 : 10,
    marginBottom: 10,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },

  hero: { alignItems: 'center', marginBottom: 32 },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    ...shadows.soft,
  },
  heroTitle: { fontSize: 26, fontWeight: '500', color: '#1E293B', marginBottom: 8 },
  heroSub: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  form: { gap: 16 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#475569' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#E2E8F0', ...shadows.soft,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1E293B' },

  btnRegistrar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 30, padding: 16, marginTop: 8,
    ...shadows.medium,
  },
  btnRegistrarTxt: { color: '#fff', fontWeight: '500', fontSize: 16 },

  loginLink: { alignItems: 'center', paddingVertical: 12 },
  loginLinkTxt: { fontSize: 14, color: '#64748B' },
});
