import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, ActivityIndicator, Image, Alert,
  Dimensions, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, shadows } from '../theme/colors';
import { typography } from '../theme/typography';
import { ApiPublicacionRepository } from '../../core/infraestructura/publicaciones/ApiPublicacionRepository';
import { CrearPublicacionUseCase } from '../../core/aplicacion/publicaciones/PublicacionesUseCases';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

const { width } = Dimensions.get('window');
const API_BASE = 'https://agenda-production-ae37.up.railway.app/api/publicaciones';

// Sube una imagen al backend → Cloudinary y devuelve la URL pública
const subirImagenACloudinary = async (uri: string, token: string): Promise<string> => {
  // Comprimir primero en el cliente (reducir tráfico)
  const manipResult = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
  );

  const formData = new FormData();

  if (Platform.OS === 'web') {
    // En web: fetch el blob y adjuntarlo
    const blob = await fetch(manipResult.uri).then(r => r.blob());
    formData.append('imagen', blob, 'imagen.jpg');
  } else {
    // En nativo: adjuntar directamente el uri
    formData.append('imagen', {
      uri: manipResult.uri,
      name: 'imagen.jpg',
      type: 'image/jpeg',
    } as any);
  }

  const res = await fetch(`${API_BASE}/upload-imagen/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = await res.json();
  if (!data.ok || !data.url) {
    throw new Error(data.error || 'Error subiendo imagen');
  }
  return data.url;
};

export const CrearPublicacionScreen = ({ navigation }: any) => {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  // Estado ahora guarda { uri: string (local preview), url?: string (cloudinary) }
  const [imagenes, setImagenes] = useState<{ uri: string; url?: string }[]>([]);
  const [cargando, setCargando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const seleccionarImagen = async () => {
    if (imagenes.length >= 10) {
      Alert.alert('Máximo 10 imágenes por publicación.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setSubiendo(true);
      setError('');
      const seleccionadas = result.assets.slice(0, 10 - imagenes.length);

      try {
        const token = await obtenerTokenLocal();
        if (!token?.access) throw new Error('Sin autenticación');

        // Subir todas las imágenes en paralelo a Cloudinary
        const urls = await Promise.all(
          seleccionadas.map(asset => subirImagenACloudinary(asset.uri, token.access))
        );

        setImagenes(prev => [
          ...prev,
          ...seleccionadas.map((asset, i) => ({ uri: asset.uri, url: urls[i] })),
        ]);
      } catch (e: any) {
        setError('Error subiendo imagen: ' + (e.message || 'Intenta de nuevo'));
      } finally {
        setSubiendo(false);
      }
    }
  };

  const quitarImagen = (index: number) => {
    setImagenes(prev => prev.filter((_, i) => i !== index));
  };

  const handlePublicar = async () => {
    if (!titulo.trim() && imagenes.length === 0) {
      setError('Agrega al menos un título o una imagen.');
      return;
    }
    // Verificar que todas las imágenes ya tienen URL de Cloudinary
    const pendientes = imagenes.filter(img => !img.url);
    if (pendientes.length > 0) {
      setError('Espera a que terminen de subirse las imágenes.');
      return;
    }

    try {
      setCargando(true);
      setError('');
      const urls = imagenes.map(img => img.url as string);
      const repo = new ApiPublicacionRepository();
      const useCase = new CrearPublicacionUseCase(repo);
      await useCase.ejecutar({
        titulo,
        descripcion,
        imagen_url: urls[0] || '',
        imagenes: urls,
      } as any);
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Error al publicar.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva publicación</Text>
        <TouchableOpacity
          onPress={handlePublicar}
          disabled={cargando || subiendo}
          style={[styles.shareBtn, (cargando || subiendo) && { opacity: 0.5 }]}
        >
          {cargando
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={styles.shareBtnText}>Publicar</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Texto */}
        <View style={styles.textArea}>
          <View style={styles.avatarPlaceholder}>
            <Feather name="briefcase" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 8 }}>
            <TextInput
              style={styles.tituloInput}
              placeholder="¿Qué quieres compartir?"
              placeholderTextColor="#AAAAAA"
              value={titulo}
              onChangeText={setTitulo}
              multiline
              maxLength={150}
            />
            <TextInput
              style={styles.descInput}
              placeholder="Agrega una descripción..."
              placeholderTextColor="#AAAAAA"
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              maxLength={500}
            />
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Indicador de subida */}
        {subiendo && (
          <View style={styles.uploadingBanner}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.uploadingText}>Subiendo imágenes a la nube...</Text>
          </View>
        )}

        {/* Grid de imágenes */}
        {imagenes.length > 0 && (
          <View style={styles.imageGrid}>
            {imagenes.map((img, idx) => (
              <View key={idx} style={styles.imageThumb}>
                <Image source={{ uri: img.uri }} style={styles.thumbImg} resizeMode="cover" />
                {/* Indicador de subida por imagen */}
                {!img.url && (
                  <View style={styles.imgUploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFF" />
                  </View>
                )}
                {img.url && (
                  <View style={styles.imgReadyBadge}>
                    <Feather name="check" size={10} color="#FFF" />
                  </View>
                )}
                <TouchableOpacity style={styles.removeImg} onPress={() => quitarImagen(idx)}>
                  <Feather name="x" size={14} color="#FFF" />
                </TouchableOpacity>
                {idx === 0 && (
                  <View style={styles.portadaBadge}><Text style={styles.portadaText}>Portada</Text></View>
                )}
              </View>
            ))}
            {imagenes.length < 10 && (
              <TouchableOpacity style={styles.addMoreImg} onPress={seleccionarImagen} disabled={subiendo}>
                <Feather name="plus" size={28} color={colors.textSubtitle} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Botón agregar imágenes */}
        {imagenes.length === 0 && (
          <TouchableOpacity style={styles.addImgBtn} onPress={seleccionarImagen} disabled={subiendo}>
            <View style={styles.addImgIcon}>
              <Feather name="image" size={32} color={colors.primary} />
            </View>
            <Text style={styles.addImgText}>Agregar fotos</Text>
            <Text style={styles.addImgSub}>Se suben directo a la nube • Máximo 10</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const thumbSize = (Math.min(width, 500) - 48 - 12) / 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  headerBtn: { padding: 4 },
  headerBtnText: { fontSize: 15, color: colors.textSubtitle, fontWeight: '500' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#1C1E21' },
  shareBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 16,
    paddingVertical: 8, borderRadius: 20,
  },
  shareBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  content: { padding: 16, paddingBottom: 40 },
  textArea: {
    flexDirection: 'row', gap: 12, marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  tituloInput: {
    fontSize: 16, color: '#1C1E21', fontWeight: '600',
    minHeight: 40,
  },
  descInput: {
    fontSize: 14, color: '#3E4042',
    minHeight: 30,
  },
  errorText: { color: '#DC2626', marginBottom: 12, fontSize: 13 },
  uploadingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: 12,
    padding: 12, marginBottom: 16,
  },
  uploadingText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  imageGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 16,
  },
  imageThumb: {
    width: thumbSize, height: thumbSize,
    borderRadius: 8, overflow: 'hidden', position: 'relative',
  },
  thumbImg: { width: '100%', height: '100%' },
  imgUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  imgReadyBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: '#22C55E',
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  removeImg: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  portadaBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  portadaText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
  addMoreImg: {
    width: thumbSize, height: thumbSize, borderRadius: 8,
    backgroundColor: '#F0F2F5', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#DDDEE1', borderStyle: 'dashed',
  },
  addImgBtn: {
    alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 10,
    borderWidth: 2, borderColor: '#DDDEE1', borderStyle: 'dashed',
    borderRadius: 20, marginTop: 8,
  },
  addImgIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  addImgText: { fontSize: 16, fontWeight: '700', color: '#1C1E21' },
  addImgSub: { fontSize: 12, color: colors.textSubtitle },
});
