import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, ActivityIndicator, Image, Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

export const CrearEditarServicioScreen = ({ route, navigation }: any) => {
  const { servicioId } = route.params || {};
  const isEditing = !!servicioId;

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [tipoServicio, setTipoServicio] = useState('CITA'); // CITA, MENSUALIDAD, EXPERIENCIA
  const [duracion, setDuracion] = useState('30');
  const [imagen, setImagen] = useState<string | null>(null);
  
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

      // Obtener la lista y filtrar (temporal, idealmente tener GET por ID)
      const res = await fetch(`https://agenda-production-ae37.up.railway.app/api/servicios/?empresa_id=${empresaId}`);
      const data = await res.json();
      if (data.ok) {
        const serv = data.datos.find((s: any) => s.id === servicioId);
        if (serv) {
          setNombre(serv.nombre);
          setDescripcion(serv.descripcion || '');
          setPrecio(serv.precio);
          setTipoServicio(serv.tipo_servicio || 'CITA');
          setDuracion(serv.duracion ? serv.duracion.toString() : '30');
          setImagen(serv.imagen_url || null);
        }
      }
    } catch (e) {
      console.log('Error', e);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setImagen(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const guardar = async () => {
    if (!nombre.trim() || !precio.trim()) {
      setError('Nombre y precio son obligatorios.');
      return;
    }
    if (tipoServicio === 'CITA' && !duracion.trim()) {
      setError('Las citas requieren una duración en minutos.');
      return;
    }
    try {
      setCargando(true);
      setError('');
      const token = await obtenerTokenLocal();
      if (!token) throw new Error('No estás autenticado.');

      const p = JSON.parse(atob(token.access.split('.')[1]));
      const empresaId = p.user_id;

      const payload = {
        empresa_id: empresaId,
        nombre,
        descripcion,
        precio: parseFloat(precio),
        tipo_servicio: tipoServicio,
        duracion: tipoServicio === 'CITA' ? parseInt(duracion) : null,
        imagen_url: imagen
      };

      const url = isEditing 
        ? `https://agenda-production-ae37.up.railway.app/api/servicios/${servicioId}/`
        : `https://agenda-production-ae37.up.railway.app/api/servicios/`;
      
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token.access}`
        },
        body: JSON.stringify(payload)
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
      { 
        text: 'Desactivar', 
        style: 'destructive',
        onPress: async () => {
          try {
            setCargando(true);
            const token = await obtenerTokenLocal();
            await fetch(`https://agenda-production-ae37.up.railway.app/api/servicios/${servicioId}/`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token?.access}` }
            });
            navigation.goBack();
          } catch (e) {
            console.log(e);
            setCargando(false);
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Feather name="x" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}</Text>
        <TouchableOpacity
          onPress={guardar}
          disabled={cargando}
          style={[styles.saveBtn, cargando && { opacity: 0.5 }]}
        >
          {cargando ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

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

        {/* Selector de Tipo */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tipo de Servicio *</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity 
              style={[styles.typeBtn, tipoServicio === 'CITA' && styles.typeBtnActive]}
              onPress={() => setTipoServicio('CITA')}
            >
              <Feather name="calendar" size={16} color={tipoServicio === 'CITA' ? '#FFF' : colors.textSubtitle} />
              <Text style={[styles.typeBtnText, tipoServicio === 'CITA' && styles.typeBtnTextActive]}>Cita</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.typeBtn, tipoServicio === 'MENSUALIDAD' && styles.typeBtnActive]}
              onPress={() => setTipoServicio('MENSUALIDAD')}
            >
              <Feather name="refresh-cw" size={16} color={tipoServicio === 'MENSUALIDAD' ? '#FFF' : colors.textSubtitle} />
              <Text style={[styles.typeBtnText, tipoServicio === 'MENSUALIDAD' && styles.typeBtnTextActive]}>Mensualidad</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.typeBtn, tipoServicio === 'EXPERIENCIA' && styles.typeBtnActive]}
              onPress={() => setTipoServicio('EXPERIENCIA')}
            >
              <Feather name="star" size={16} color={tipoServicio === 'EXPERIENCIA' ? '#FFF' : colors.textSubtitle} />
              <Text style={[styles.typeBtnText, tipoServicio === 'EXPERIENCIA' && styles.typeBtnTextActive]}>Paquete</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Formulario */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre del Producto *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Corte Clásico"
            value={nombre}
            onChangeText={setNombre}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: tipoServicio === 'CITA' ? 10 : 0 }]}>
            <Text style={styles.label}>Precio ($) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="numeric"
              value={precio}
              onChangeText={setPrecio}
            />
          </View>
          {tipoServicio === 'CITA' && (
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Duración (min) *</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                keyboardType="numeric"
                value={duracion}
                onChangeText={setDuracion}
              />
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Detalles sobre qué incluye el servicio..."
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
          />
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
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1C1E21' },
  saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  content: { padding: 20, paddingBottom: 40 },
  errorText: { color: '#DC2626', marginBottom: 15, fontSize: 14, backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 },
  
  imageSection: { marginBottom: 25, alignItems: 'center' },
  addImgBtn: { width: '100%', height: 150, backgroundColor: '#FFF', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#EEF2FF', borderStyle: 'dashed' },
  addImgText: { marginTop: 10, fontSize: 14, color: colors.primary, fontWeight: '600' },
  imageContainer: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20 },
  
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#3E4042', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EFEFEF', borderRadius: 12, padding: 15, fontSize: 16, color: '#1C1E21' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  
  typeSelector: { flexDirection: 'row', backgroundColor: '#F0F2F5', padding: 4, borderRadius: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  typeBtnActive: { backgroundColor: colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSubtitle },
  typeBtnTextActive: { color: '#FFF' },
  
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, padding: 15, backgroundColor: '#FEE2E2', borderRadius: 12 },
  deleteBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 16, marginLeft: 10 }
});
