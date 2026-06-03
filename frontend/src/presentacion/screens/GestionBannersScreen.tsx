import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { DjangoBannerRepository } from '../../core/infraestructura/banners/DjangoBannerRepository';
import { GestionarBannersAdminCasoUso } from '../../core/aplicacion/banners/BannersCasosUso';
import { BannerPublicitario } from '../../core/domain/banners/Banner';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

const bannerRepo = new DjangoBannerRepository();
const adminBannersCasoUso = new GestionarBannersAdminCasoUso(bannerRepo);

export const GestionBannersScreen = () => {
  const [banners, setBanners] = useState<BannerPublicitario[]>([]);
  const [cargando, setCargando] = useState(false);
  const [nuevo, setNuevo] = useState({ titulo: '', imagen_url: '', link_url: '' });
  const [creando, setCreando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const creds = await obtenerTokenLocal();
      if (!creds?.access) return;
      const data = await adminBannersCasoUso.obtenerTodos(creds.access);
      setBanners(data);
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar los banners');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleToggle = async (id: string, activo: boolean) => {
    try {
      const creds = await obtenerTokenLocal();
      if (!creds?.access) return;
      await adminBannersCasoUso.actualizar(id, { activo }, creds.access);
      setBanners(banners.map(b => b.id === id ? { ...b, activo } : b));
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const handleCrear = async () => {
    if (!nuevo.titulo || !nuevo.imagen_url) return Alert.alert('Error', 'Título e imagen son requeridos');
    setCreando(true);
    try {
      const creds = await obtenerTokenLocal();
      if (!creds?.access) return;
      await adminBannersCasoUso.crear({ ...nuevo, activo: true }, creds.access);
      setNuevo({ titulo: '', imagen_url: '', link_url: '' });
      cargar();
    } catch (e) {
      Alert.alert('Error', 'No se pudo crear el banner');
    } finally {
      setCreando(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este banner?')) return;
    try {
      const creds = await obtenerTokenLocal();
      if (!creds?.access) return;
      await adminBannersCasoUso.eliminar(id, creds.access);
      setBanners(banners.filter(b => b.id !== id));
    } catch (e) {
      Alert.alert('Error', 'No se pudo eliminar el banner');
    }
  };

  return (
    <View style={s.root}>
      <Text style={s.title}>Gestión de Banners (Netflix Hero)</Text>
      
      {/* Formulario Crear */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Nuevo Banner</Text>
        <TextInput style={s.input} placeholder="Título del Banner" value={nuevo.titulo} onChangeText={t => setNuevo({...nuevo, titulo: t})} />
        <TextInput style={s.input} placeholder="URL de la Imagen" value={nuevo.imagen_url} onChangeText={t => setNuevo({...nuevo, imagen_url: t})} />
        <TextInput style={s.input} placeholder="URL al hacer clic (opcional)" value={nuevo.link_url} onChangeText={t => setNuevo({...nuevo, link_url: t})} />
        <TouchableOpacity style={s.btn} onPress={handleCrear} disabled={creando}>
          {creando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Agregar Banner</Text>}
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {cargando ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} /> : (
        <FlatList
          data={banners}
          keyExtractor={b => b.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={s.bannerRow}>
              <Image source={{ uri: item.imagen_url }} style={s.thumb} />
              <View style={s.info}>
                <Text style={s.bTitle}>{item.titulo}</Text>
                <Text style={s.bLink} numberOfLines={1}>{item.link_url || 'Sin enlace'}</Text>
              </View>
              <Switch value={item.activo} onValueChange={(v) => handleToggle(item.id, v)} />
              <TouchableOpacity onPress={() => handleEliminar(item.id)} style={{ marginLeft: 12 }}>
                <Feather name="trash-2" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textTitle, marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 24, ...shadows.soft },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, marginBottom: 10 },
  btn: { backgroundColor: colors.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '600' },
  bannerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 10, ...shadows.soft },
  thumb: { width: 80, height: 45, borderRadius: 6, backgroundColor: '#eee', marginRight: 12 },
  info: { flex: 1 },
  bTitle: { fontSize: 14, fontWeight: '600' },
  bLink: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
});
