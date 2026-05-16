import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { DjangoEmpresaRepository } from '../../core/infraestructura/empresas/DjangoEmpresaRepository';

const empresaRepository = new DjangoEmpresaRepository();

export const ConfigurarPagosScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empresaId, setEmpresaId] = useState('');
  
  const [llaves, setLlaves] = useState({
    wompi_public_key: '',
    wompi_integrity_key: '',
    wompi_events_secret: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const token = await obtenerTokenLocal();
      if (!token || !token.empresa_id) return;
      setEmpresaId(token.empresa_id);

      const data = await empresaRepository.obtenerEmpresaPrivada(token.empresa_id);
      
      if (data) {
        setLlaves({
          wompi_public_key: data.wompi_public_key || '',
          wompi_integrity_key: data.wompi_integrity_key || '',
          wompi_events_secret: data.wompi_events_secret || '',
        });
      }
    } catch (error) {
      console.error('Error cargando llaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const guardarLlaves = async () => {
    if (!llaves.wompi_public_key) {
      Alert.alert('Error', 'La Llave Pública es obligatoria para recibir pagos.');
      return;
    }

    try {
      setSaving(true);
      const token = await obtenerTokenLocal();
      if (!token) return;

      const exito = await empresaRepository.guardarConfiguracionWompi(empresaId, llaves);
      
      if (exito) {
        Alert.alert('¡Éxito!', 'Llaves de Wompi guardadas correctamente.');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'No se pudieron guardar las llaves.');
      }
    } catch (error) {
      Alert.alert('Error', 'Problema de conexión con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.container}>
        
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Feather name="arrow-left" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={s.title}>Configurar Pagos</Text>
        </View>

        {/* Banner Info */}
        <View style={s.infoBanner}>
          <View style={s.iconWrapper}>
            <Feather name="credit-card" size={24} color="#2563EB" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.infoTitle}>Conecta tu cuenta de Wompi</Text>
            <Text style={s.infoText}>Ingresa tus credenciales para recibir el dinero de las reservas directamente en tu cuenta bancaria.</Text>
          </View>
        </View>

        {/* Formulario */}
        <View style={s.form}>
          <Text style={s.sectionTitle}>Credenciales de Integración</Text>
          
          <View style={s.inputGroup}>
            <Text style={s.label}>Llave Pública (Public Key)</Text>
            <TextInput
              style={s.input}
              placeholder="Ej: pub_test_..."
              value={llaves.wompi_public_key}
              onChangeText={(text) => setLlaves({ ...llaves, wompi_public_key: text })}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={s.hint}>Se usa para abrir el portal de pagos al cliente.</Text>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Secreto de Eventos (Events Secret)</Text>
            <TextInput
              style={s.input}
              placeholder="Ej: prv_test_..."
              value={llaves.wompi_events_secret}
              onChangeText={(text) => setLlaves({ ...llaves, wompi_events_secret: text })}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={s.hint}>Esencial para confirmar automáticamente que un pago fue exitoso.</Text>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Llave de Integridad (Integrity Key)</Text>
            <TextInput
              style={s.input}
              placeholder="Opcional pero recomendado"
              value={llaves.wompi_integrity_key}
              onChangeText={(text) => setLlaves({ ...llaves, wompi_integrity_key: text })}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={s.hint}>Firma de seguridad para evitar alteración de precios.</Text>
          </View>

        </View>

      </ScrollView>

      {/* Footer Button */}
      <View style={s.footer}>
        <TouchableOpacity style={s.saveBtn} onPress={guardarLlaves} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>Guardar Credenciales</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 24, paddingBottom: 100 },
  
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { padding: 8, marginRight: 8, marginLeft: -8 },
  title: { fontSize: 24, fontWeight: '500', color: '#1E293B' },

  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 32,
  },
  iconWrapper: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  infoTitle: { fontSize: 16, fontWeight: '500', color: '#1E40AF', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#3B82F6', lineHeight: 20 },

  form: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '500', color: '#0F172A', marginBottom: 20 },
  
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#475569', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15,
    color: '#1E293B', backgroundColor: '#F8FAFC'
  },
  hint: { fontSize: 12, color: '#94A3B8', marginTop: 6, marginLeft: 4 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', padding: 20,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '500' }
});
