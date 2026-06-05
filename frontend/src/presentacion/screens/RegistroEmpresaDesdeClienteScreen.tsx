import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { UpgradeToEmpresaCasoUso } from '../../core/aplicacion/auth/UpgradeToEmpresaCasoUso';
import { DjangoAuthAdapter } from '../../core/infraestructura/auth/DjangoAuthAdapter';
import { useAuth } from '../../core/aplicacion/auth/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const authRepo = new DjangoAuthAdapter();
const upgradeCasoUso = new UpgradeToEmpresaCasoUso(authRepo);

export const RegistroEmpresaDesdeClienteScreen = ({ navigation }: any) => {
  const [nombre, setNombre] = useState('');
  const [nit, setNit] = useState('');
  const [rutFile, setRutFile] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const { onUpgradeSuccess } = useAuth();

  const seleccionarRUT = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setRutFile({
          uri: Platform.OS === 'web' ? file.uri : file.uri.replace('file://', ''),
          name: file.name || 'rut.pdf',
          type: file.mimeType || 'application/pdf',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const handleRegistrar = async () => {
    if (!nombre.trim() || !nit.trim() || !rutFile) {
      Alert.alert('Faltan datos', 'Por favor llena todos los campos y adjunta tu RUT (PDF).');
      return;
    }

    setCargando(true);
    try {
      const tokens = await upgradeCasoUso.ejecutar(nombre, nit, rutFile);
      
      // Actualizar token local
      await AsyncStorage.setItem('@agenda_pro_token', JSON.stringify({
        access: tokens.access,
        refresh: tokens.refresh,
        rol: tokens.rol
      }));
      
      // Limpiar datos de cliente y actualizar contexto para forzar re-render a EmpresaTabs
      await AsyncStorage.removeItem('cliente_token');
      await AsyncStorage.removeItem('cliente_id');
      
      Alert.alert('¡Felicidades!', 'Tu empresa ha sido registrada con éxito.', [
        { text: 'Ir a mi panel', onPress: () => onUpgradeSuccess(tokens.rol) }
      ]);
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Hubo un error al registrar tu empresa');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registrar Empresa</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>¡Impulsa tu negocio!</Text>
          <Text style={styles.subtitle}>
            Ya eres parte de Flowy. Solo necesitamos un par de datos para configurar tu perfil empresarial y activar tu agenda online.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Nombre de tu empresa / negocio</Text>
            <View style={styles.inputWrap}>
              <Feather name="briefcase" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej. Barbería El Maestro"
                value={nombre}
                onChangeText={setNombre}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.label}>NIT (Número de Identificación Tributaria)</Text>
            <View style={styles.inputWrap}>
              <Feather name="hash" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej. 900123456-1"
                value={nit}
                onChangeText={setNit}
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.label}>RUT (Registro Único Tributario)</Text>
            <TouchableOpacity style={styles.fileBtn} onPress={seleccionarRUT} activeOpacity={0.8}>
              <Feather name="file-text" size={24} color={colors.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.fileBtnTitle}>{rutFile ? rutFile.name : 'Subir RUT en PDF'}</Text>
                <Text style={styles.fileBtnSub}>{rutFile ? 'Archivo seleccionado' : 'Toca para buscar en tus archivos'}</Text>
              </View>
              {rutFile && <Feather name="check-circle" size={20} color="#10B981" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btn, (!nombre || !nit || !rutFile) && styles.btnDisabled]} 
              onPress={handleRegistrar}
              disabled={cargando || !nombre || !nit || !rutFile}
            >
              {cargando ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnTxt}>Registrar y Empezar</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  scroll: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22, marginBottom: 32 },
  form: { gap: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: -12, zIndex: 1, marginLeft: 4 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  fileBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE', borderStyle: 'dashed', borderRadius: 12, padding: 16 },
  fileBtnTitle: { fontSize: 15, fontWeight: '600', color: colors.primary, marginBottom: 2 },
  fileBtnSub: { fontSize: 13, color: '#6B7280' },
  btn: { backgroundColor: colors.primary, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  btnDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0 },
  btnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
