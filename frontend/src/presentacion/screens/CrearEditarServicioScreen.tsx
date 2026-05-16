import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, ActivityIndicator, Image, Alert, Switch, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

const API = 'https://agenda-production-ae37.up.railway.app';

export const CrearEditarServicioScreen = ({ route, navigation }: any) => {
  const { servicioId } = route.params || {};
  const isEditing = !!servicioId;

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [tipoServicio, setTipoServicio] = useState('CITA');
  const [duracion, setDuracion] = useState('30');
  const [imagen, setImagen] = useState<string | null>(null);
  
  // ── Paquetes / Suscripciones ────────────────────────────────────────────────
  const [permiteSesion, setPermiteSesion] = useState(true);
  const [precio30, setPrecio30] = useState('');
  const [precio90, setPrecio90] = useState('');
  const [precio120, setPrecio120] = useState('');
  
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditing) cargarDatosServicio();
  }, [isEditing]);

  const cargarDatosServicio = async () => {
    try {
      setCargando(true);
      const token = await obtenerTokenLocal();
      if (!token) return;
      const p = JSON.parse(atob(token.access.split('.')[1]));
      const empresaId = p.user_id;

      const res = await fetch(`${API}/api/servicios/?empresa_id=${empresaId}`);
      const data = await res.json();
      if (data.ok) {
        const serv = data.datos.find((s: any) => s.id === servicioId);
        if (serv) {
          setNombre(serv.nombre);
          setDescripcion(serv.descripcion || '');
          setPrecio(serv.precio);
          setTipoServicio(serv.tipo_servicio || 'CITA');
          setDuracion(serv.duracion_minutos ? serv.duracion_minutos.toString() : '30');
          setImagen(serv.imagen_url || null);
          setPermiteSesion(serv.permite_sesion !== false);
          setPrecio30(serv.precio_30_dias || '');
          setPrecio90(serv.precio_90_dias || '');
          setPrecio120(serv.precio_120_dias || '');
        }
      }
    } catch (e) {
      console.log('Error cargando servicio:', e);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.6, base64: true,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setImagen(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const guardar = async () => {
    if (!nombre.trim() || !precio.trim()) { setError('Nombre y precio son obligatorios.'); return; }
    if (tipoServicio === 'CITA' && !duracion.trim()) { setError('Las citas requieren duración.'); return; }
    if (!permiteSesion && !precio30 && !precio90 && !precio120) {
      setError('Debes dejar activo al menos el pago por sesión o configurar un paquete.'); return;
    }
    try {
      setCargando(true);
      setError('');
      const token = await obtenerTokenLocal();
      if (!token) throw new Error('No estás autenticado.');
      const p = JSON.parse(atob(token.access.split('.')[1]));
      const empresaId = p.user_id;

      const payload: any = {
        empresa_id: empresaId,
        nombre,
        descripcion,
        precio: parseFloat(precio),
        tipo_servicio: tipoServicio,
        duracion: tipoServicio === 'CITA' ? parseInt(duracion) : null,
        imagen_url: imagen,
        permite_sesion: permiteSesion,
        precio_30_dias: precio30 ? parseFloat(precio30) : null,
        precio_90_dias: precio90 ? parseFloat(precio90) : null,
        precio_120_dias: precio120 ? parseFloat(precio120) : null,
      };

      const url = isEditing ? `${API}/api/servicios/${servicioId}/` : `${API}/api/servicios/`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token.access}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error al guardar');
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Error al guardar.');
    } finally {
      setCargando(false);
    }
  };

  const eliminar = async () => {
    Alert.alert('Desactivar servicio', '¿Seguro que deseas ocultar este servicio?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desactivar', style: 'destructive', onPress: async () => {
        try {
          setCargando(true);
          const token = await obtenerTokenLocal();
          await fetch(`${API}/api/servicios/${servicioId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token?.access}` },
          });
          navigation.goBack();
        } catch (e) { console.log(e); setCargando(false); }
      }}
    ]);
  };

  const TIPOS = [
    { key: 'CITA', label: 'Cita', icon: 'calendar' },
    { key: 'MENSUALIDAD', label: 'Mensualidad', icon: 'refresh-cw' },
    { key: 'EXPERIENCIA', label: 'Paquete', icon: 'star' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Feather name="x" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}</Text>
        <TouchableOpacity onPress={guardar} disabled={cargando} style={[styles.saveBtn, cargando && { opacity: 0.5 }]}>
          {cargando ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? <View style={styles.errorBox}><Feather name="alert-circle" size={16} color="#DC2626" style={{marginRight:6}}/><Text style={styles.errorText}>{error}</Text></View> : null}

        {/* Imagen */}
        <View style={styles.imageSection}>
          {imagen ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imagen }} style={styles.image} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImagen(null)}>
                <Feather name="trash-2" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addImgBtn} onPress={seleccionarImagen}>
              <Feather name="camera" size={32} color={colors.primary} />
              <Text style={styles.addImgText}>Agregar foto del servicio</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tipo de Servicio */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipo de Servicio *</Text>
          <View style={styles.typeSelector}>
            {TIPOS.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeBtn, tipoServicio === t.key && styles.typeBtnActive]}
                onPress={() => setTipoServicio(t.key)}
              >
                <Feather name={t.icon as any} size={16} color={tipoServicio === t.key ? '#FFF' : '#64748B'} />
                <Text style={[styles.typeBtnText, tipoServicio === t.key && styles.typeBtnTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nombre */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre del Producto *</Text>
          <TextInput style={styles.input} placeholder="Ej: Corte Clásico" value={nombre} onChangeText={setNombre} />
        </View>

        {/* Precio + Duración */}
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: tipoServicio === 'CITA' ? 10 : 0 }]}>
            <Text style={styles.label}>Precio base ($) *</Text>
            <TextInput style={styles.input} placeholder="0.00" keyboardType="numeric" value={precio} onChangeText={setPrecio} />
          </View>
          {tipoServicio === 'CITA' && (
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Duración (min) *</Text>
              <TextInput style={styles.input} placeholder="30" keyboardType="numeric" value={duracion} onChangeText={setDuracion} />
            </View>
          )}
        </View>

        {/* Descripción */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Detalles sobre qué incluye el servicio..." value={descripcion} onChangeText={setDescripcion} multiline />
        </View>

        {/* ── PAQUETES Y SUSCRIPCIONES ─────────────────────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Feather name="package" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Tipos de Cobro</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Activa los planes que quieres ofrecer. Los precios vacíos no aparecerán.</Text>

          {/* Sesión Individual */}
          <View style={styles.packageRow}>
            <View style={styles.packageInfo}>
              <Feather name="calendar" size={18} color="#F59E0B" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.packageLabel}>Sesión individual</Text>
                <Text style={styles.packageDesc}>Precio base: ${precio || '---'}</Text>
              </View>
            </View>
            <Switch
              value={permiteSesion}
              onValueChange={setPermiteSesion}
              trackColor={{ false: '#E2E8F0', true: colors.primary + '80' }}
              thumbColor={permiteSesion ? colors.primary : '#F8FAFC'}
            />
          </View>

          {/* 30 Días */}
          <View style={styles.packageRow}>
            <View style={styles.packageInfo}>
              <Feather name="moon" size={18} color="#8B5CF6" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.packageLabel}>Plan 30 días</Text>
                <Text style={styles.packageDesc}>Acceso por un mes</Text>
              </View>
            </View>
            <TextInput
              style={styles.packagePriceInput}
              placeholder="Precio"
              keyboardType="numeric"
              value={precio30}
              onChangeText={setPrecio30}
            />
          </View>

          {/* 90 Días */}
          <View style={styles.packageRow}>
            <View style={styles.packageInfo}>
              <Feather name="sun" size={18} color="#10B981" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.packageLabel}>Plan 90 días</Text>
                <Text style={styles.packageDesc}>Acceso por 3 meses</Text>
              </View>
            </View>
            <TextInput
              style={styles.packagePriceInput}
              placeholder="Precio"
              keyboardType="numeric"
              value={precio90}
              onChangeText={setPrecio90}
            />
          </View>

          {/* 120 Días */}
          <View style={styles.packageRow}>
            <View style={styles.packageInfo}>
              <Feather name="star" size={18} color="#EF4444" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.packageLabel}>Plan 120 días</Text>
                <Text style={styles.packageDesc}>Acceso por 4 meses</Text>
              </View>
            </View>
            <TextInput
              style={styles.packagePriceInput}
              placeholder="Precio"
              keyboardType="numeric"
              value={precio120}
              onChangeText={setPrecio120}
            />
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity style={styles.deleteBtn} onPress={eliminar}>
            <Feather name="trash-2" size={20} color="#DC2626" />
            <Text style={styles.deleteBtnText}>Desactivar Servicio</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#F4F6F9',
    paddingTop: Platform.OS === 'web' ? 14 : 50,
  },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '500', color: '#1E293B' },
  saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  saveBtnText: { color: '#FFF', fontWeight: '500', fontSize: 14 },
  content: { padding: 20, paddingBottom: 60 },

  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { color: '#DC2626', fontSize: 14, flex: 1 },

  imageSection: { marginBottom: 24, alignItems: 'center' },
  addImgBtn: { width: '100%', height: 160, backgroundColor: '#FFF', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#EEF2FF', borderStyle: 'dashed' },
  addImgText: { marginTop: 10, fontSize: 14, color: colors.primary, fontWeight: '500' },
  imageContainer: { width: '100%', height: 200, borderRadius: 20, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20 },

  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 14, padding: 15, fontSize: 16, color: '#1E293B', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },

  typeSelector: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 14 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  typeBtnActive: { backgroundColor: colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  typeBtnText: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  typeBtnTextActive: { color: '#FFF' },

  // ── Sección de Paquetes ──────────────────────────────────────────────────────
  sectionCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '500', color: '#1E293B' },
  sectionSubtitle: { fontSize: 13, color: '#94A3B8', marginBottom: 20, lineHeight: 18 },

  packageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  packageInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  packageLabel: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
  packageDesc: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  packagePriceInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, width: 90, fontSize: 15, fontWeight: '500', color: '#1E293B', textAlign: 'center' },

  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 14 },
  deleteBtnText: { color: '#DC2626', fontWeight: '500', fontSize: 16, marginLeft: 10 },
});
