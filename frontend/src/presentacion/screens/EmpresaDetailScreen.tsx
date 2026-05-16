import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Platform, Image, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, shadows } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { DjangoEmpresaRepository } from '../../core/infraestructura/empresas/DjangoEmpresaRepository';

const empresaRepository = new DjangoEmpresaRepository();

export const EmpresaDetailScreen = ({ route, navigation }: any) => {
  const { empresa: initialEmpresa } = route.params;
  const [empresa, setEmpresa] = useState(initialEmpresa);
  const [loading, setLoading] = useState(false);

  const toggleEmpresa = async () => {
    try {
      const nuevoEstado = !empresa.activa;
      const ok = await empresaRepository.cambiarEstado(empresa.id, nuevoEstado);
      
      if (ok) {
        setEmpresa({ ...empresa, activa: nuevoEstado });
      } else {
        Alert.alert('Error', 'No se pudo cambiar el estado de la empresa');
      }
    } catch (error) {
      Alert.alert('Error', 'Problema de conexión al cambiar el estado');
    }
  };

  const deleteEmpresa = () => {
    Alert.alert(
      "Eliminar Empresa",
      `¿Estás seguro que deseas eliminar a "${empresa.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            try {
              const ok = await empresaRepository.eliminarEmpresa(empresa.id);
              if (ok) {
                navigation.goBack();
              } else {
                Alert.alert('Error', 'No se pudo eliminar la empresa');
              }
            } catch (error) {
              Alert.alert('Error', 'Problema de conexión al eliminar');
            }
          }
        }
      ]
    );
  };

  const handlePickImage = async (tipo: 'logo' | 'portada') => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería.');
          return;
        }
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: tipo === 'portada' ? [16, 9] : [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        // En web a veces el base64 viene en el uri como data URL, o bien en la propiedad base64
        let base64Image = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        
        // Si el URI no es base64 (ej blob) y no hay base64, en web podemos tener problemas
        // pero Expo Web con base64:true suele inyectar el data URI en `uri` o en `base64`
        await uploadImage(tipo, base64Image);
      }
    } catch (e) {
      console.error(e);
      if (Platform.OS === 'web') {
        window.alert('Error al abrir el selector de imágenes.');
      } else {
        Alert.alert('Error', 'No se pudo abrir el selector de imágenes.');
      }
    }
  };

  const uploadImage = async (tipo: 'logo' | 'portada', base64: string) => {
    setLoading(true);
    try {
      const ok = await empresaRepository.actualizarImagenes(
        empresa.id,
        tipo === 'logo' ? base64 : undefined,
        tipo === 'portada' ? base64 : undefined
      );
      if (ok) {
        if (tipo === 'logo') {
          setEmpresa({ ...empresa, logo_url: base64 });
        } else {
          setEmpresa({ ...empresa, foto_portada_url: base64 });
        }
      } else {
        Alert.alert('Error', 'No se pudo subir la imagen');
      }
    } catch (error) {
      Alert.alert('Error', 'Problema de conexión al subir la imagen.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardado = (nuevosDatos: any) => {
    setEmpresa({ ...empresa, ...nuevosDatos });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.primary }]}>Detalles de la Empresa</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('EditarEmpresa', { empresa, onGuardado: handleGuardado })}
        >
          <Feather name="edit-2" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header (Muro Facebook Style) */}
        <View style={styles.wallContainer}>
          {/* Cover Photo */}
          <View style={styles.coverPhotoContainer}>
            {empresa.foto_portada_url ? (
              <Image source={{ uri: empresa.foto_portada_url }} style={styles.coverPhoto} />
            ) : (
              <View style={[styles.coverPhoto, styles.coverPhotoPlaceholder]}>
                <Feather name="image" size={40} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <TouchableOpacity style={styles.editCoverBtn} onPress={() => handlePickImage('portada')} disabled={loading}>
              <Feather name="camera" size={16} color="#000" />
            </TouchableOpacity>

            {/* Status and Plan Badges */}
            <View style={styles.topBadgesContainer}>
              <View style={[styles.planBadge, { backgroundColor: empresa.tipo_plan === 'Pro' ? '#FFD700' : colors.primary }]}>
                <Feather name="award" size={12} color={empresa.tipo_plan === 'Pro' ? '#000' : '#FFF'} />
                <Text style={[typography.caption, { color: empresa.tipo_plan === 'Pro' ? '#000' : '#FFF', marginLeft: 4, fontWeight: '500' }]}>
                  Plan {empresa.tipo_plan || 'Free'}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: empresa.activa ? '#00FF00' : '#FF4B4B' }]} />
                <Text style={[typography.caption, { color: colors.primary, marginLeft: 6 }]}>
                  {empresa.activa ? 'Activa' : 'Inactiva'}
                </Text>
              </View>
            </View>
          </View>

          {/* Profile Picture */}
          <View style={styles.profilePictureWrapper} pointerEvents="box-none">
            <View style={styles.profilePictureContainer}>
              {empresa.logo_url ? (
                <Image source={{ uri: empresa.logo_url }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={[typography.h1, { color: colors.surface }]}>
                    {empresa.nombre.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.editProfileBtn} onPress={() => handlePickImage('logo')} disabled={loading}>
                <Feather name="camera" size={14} color="#FFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfoText}>
              <Text style={[typography.h1, { color: colors.primary, fontSize: 26, fontWeight: '500' }]}>
                {empresa.nombre}
              </Text>
              <Text style={[typography.body, { color: colors.textSubtitle, marginTop: 4, fontSize: 16 }]}>
                @{empresa.slug}
              </Text>
            </View>
          </View>
        </View>

        {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 10 }} />}

        {/* Contact Info */}
        <Text style={[typography.h3, styles.sectionTitle]}>Información de Contacto</Text>
        <Card style={styles.sectionCard}>

          {/* Admin Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Feather name="user" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[typography.caption, { color: colors.textSubtitle }]}>Líder / Administrador</Text>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '500' }]}>{empresa.admin_nombre || 'Sin asignar'}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Email Row */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Feather name="mail" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[typography.caption, { color: colors.textSubtitle }]}>Correo Electrónico</Text>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '500' }]}>{empresa.admin_email || 'Sin correo'}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Ciudad + País en misma fila */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Feather name="map-pin" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[typography.caption, { color: colors.textSubtitle }]}>Ciudad / País</Text>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '500' }]}>
                {[empresa.ciudad, empresa.pais].filter(Boolean).join(', ') || 'Sin ubicación'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Dirección */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Feather name="home" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[typography.caption, { color: colors.textSubtitle }]}>Dirección</Text>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '500' }]}>{empresa.direccion || 'Sin dirección'}</Text>
            </View>
          </View>
          <View style={styles.divider} />

          {/* Teléfono */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Feather name="phone" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[typography.caption, { color: colors.textSubtitle }]}>Teléfono</Text>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '500' }]}>{empresa.telefono || 'Sin teléfono'}</Text>
            </View>
          </View>

          {/* WhatsApp CTA */}
          {empresa.telefono ? (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.whatsappButton}
                onPress={() => {
                  const phone = empresa.telefono!.replace(/\D/g, '');
                  const url = `https://wa.me/${phone}`;
                  if (typeof window !== 'undefined') {
                    window.open(url, '_blank');
                  }
                }}
              >
                <Feather name="message-circle" size={20} color="#FFF" style={{ marginRight: 10 }} />
                <Text style={[typography.button, { color: '#FFF' }]}>Contactar por WhatsApp</Text>
              </TouchableOpacity>
            </>
          ) : null}

        </Card>


        {/* Info Grid */}
        <Text style={[typography.h3, styles.sectionTitle]}>Estadísticas y Plan</Text>
        <View style={styles.infoGrid}>
          <Card style={styles.infoCardLarge}>
            <Feather name="calendar" size={24} color={colors.primary} style={styles.infoIcon} />
            <Text style={[typography.caption, { color: colors.textSubtitle }]}>Suscripción Actual</Text>
            <Text style={[typography.body, { color: colors.primary, fontWeight: '500', marginTop: 4 }]}>
              {empresa.fecha_suscripcion || 'N/A'}
            </Text>
          </Card>
          
          <Card style={styles.infoCard}>
            <Feather name="users" size={24} color={colors.primary} style={styles.infoIcon} />
            <Text style={[typography.caption, { color: colors.textSubtitle }]}>Usuarios</Text>
            <Text style={[typography.body, { color: colors.primary, fontWeight: '500', marginTop: 4 }]}>
              {empresa.usuarios}
            </Text>
          </Card>
          
          <Card style={styles.infoCard}>
            <Feather name="briefcase" size={24} color={colors.primary} style={styles.infoIcon} />
            <Text style={[typography.caption, { color: colors.textSubtitle }]}>Profesionales</Text>
            <Text style={[typography.body, { color: colors.primary, fontWeight: '500', marginTop: 4 }]}>
              {empresa.profesionales}
            </Text>
          </Card>

          <Card style={styles.infoCard}>
            <Feather name="message-square" size={24} color={colors.primary} style={styles.infoIcon} />
            <Text style={[typography.caption, { color: colors.textSubtitle }]}>Publicaciones</Text>
            <Text style={[typography.body, { color: colors.primary, fontWeight: '500', marginTop: 4 }]}>
              {empresa.publicaciones || 0}
            </Text>
          </Card>

          <Card style={styles.infoCard}>
            <Feather name="heart" size={24} color="#FF4B4B" style={styles.infoIcon} />
            <Text style={[typography.caption, { color: colors.textSubtitle }]}>Likes (Total)</Text>
            <Text style={[typography.body, { color: colors.primary, fontWeight: '500', marginTop: 4 }]}>
              {empresa.likes || 0}
            </Text>
          </Card>
        </View>

        {/* Dashboard Analítico */}
        <View style={styles.dashboardHeader}>
          <Text style={[typography.h3, styles.sectionTitle, { marginBottom: 0 }]}>Rendimiento y Actividad</Text>
          <View style={styles.growthBadge}>
            <Feather name="trending-up" size={14} color="#00C48C" />
            <Text style={[typography.caption, { color: '#00C48C', fontWeight: '500', marginLeft: 4 }]}>+15%</Text>
          </View>
        </View>
        <Card style={styles.dashboardCard}>
          <Text style={[typography.caption, { color: colors.textSubtitle, marginBottom: 15 }]}>Actividad Semanal (Interacciones)</Text>
          
          <View style={styles.chartContainer}>
            {(empresa.actividad_semanal || [2, 5, 3, 8, 4, 10, 7]).map((value: number, index: number) => {
              const max = Math.max(...(empresa.actividad_semanal || [2, 5, 3, 8, 4, 10, 7]), 1);
              const heightPercent = (value / max) * 100;
              const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
              const isToday = index === 5; // Supongamos que hoy es sábado para diseño
              return (
                <View key={index} style={styles.barWrapper}>
                  <Text style={[typography.caption, { fontSize: 10, color: colors.textSubtitle, marginBottom: 4 }]}>{value}</Text>
                  <View style={styles.barBackground}>
                    <View style={[styles.barFill, { height: `${heightPercent}%`, backgroundColor: isToday ? colors.primary : 'rgba(0,196,140,0.4)' }]} />
                  </View>
                  <Text style={[styles.barLabel, isToday && { color: colors.primary, fontWeight: '500' }]}>{labels[index]}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.divider} />
          
          <Text style={[typography.caption, { color: colors.textSubtitle, marginBottom: 10 }]}>Composición de Interacción</Text>
          <View style={styles.compositionBar}>
            <View style={[styles.compSegment, { flex: 0.6, backgroundColor: colors.primary }]} />
            <View style={[styles.compSegment, { flex: 0.3, backgroundColor: '#00C48C' }]} />
            <View style={[styles.compSegment, { flex: 0.1, backgroundColor: '#FFD700' }]} />
          </View>
          <View style={styles.compositionLegend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={styles.legendText}>Visitas</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#00C48C' }]} /><Text style={styles.legendText}>Likes</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FFD700' }]} /><Text style={styles.legendText}>Coments</Text></View>
          </View>
        </Card>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: empresa.activa ? colors.surface : colors.primary, borderWidth: empresa.activa ? 1 : 0, borderColor: colors.primary }]} 
            onPress={toggleEmpresa}
            disabled={loading}
          >
            <Text style={[typography.caption, { color: empresa.activa ? colors.primary : colors.surface }]}>
              {empresa.activa ? 'Suspender Empresa' : 'Aprobar Empresa'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={deleteEmpresa} disabled={loading}>
            <Feather name="trash-2" size={18} color="#FF4B4B" style={{ marginRight: 8 }} />
            <Text style={[typography.caption, { color: '#FF4B4B' }]}>Eliminar Permanentemente</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  wallContainer: {
    backgroundColor: colors.surface,
    marginBottom: 30,
    paddingBottom: 25,
    ...shadows.soft,
  },
  coverPhotoContainer: {
    height: 240,
    width: '100%',
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverPhotoPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editCoverBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
    ...shadows.medium,
  },
  topBadgesContainer: {
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profilePictureWrapper: {
    paddingHorizontal: 25,
    marginTop: -60,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  profilePictureContainer: {
    position: 'relative',
    marginRight: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 5,
    borderColor: colors.surface,
    backgroundColor: '#fff',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 5,
    borderColor: colors.surface,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileBtn: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  profileInfoText: {
    marginBottom: 10,
    flex: 1,
  },
  statusBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...shadows.soft,
  },
  sectionTitle: {
    color: colors.primary,
    marginTop: 10,
    marginBottom: 15,
    marginLeft: 20,
  },
  sectionCard: {
    padding: 20,
    marginBottom: 25,
    marginHorizontal: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoTextContainer: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 5,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  infoCard: {
    width: '48%',
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  infoCardLarge: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 5,
    paddingRight: 20,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,196,140,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dashboardCard: {
    padding: 20,
    marginBottom: 30,
    marginHorizontal: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  barWrapper: {
    alignItems: 'center',
    width: 30,
  },
  barBackground: {
    width: 12,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 12,
    color: colors.textSubtitle,
    marginTop: 8,
  },
  compositionBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  compSegment: {
    height: '100%',
  },
  compositionLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSubtitle,
  },
  infoIcon: {
    marginBottom: 12,
    opacity: 0.8,
  },
  actionsContainer: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    ...shadows.medium,
  },
  dangerButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappButton: {
    flexDirection: 'row',
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    ...shadows.medium,
  },
});
