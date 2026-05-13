import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity, Platform, Image, Animated, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { DjangoEmpresaRepository } from '../../core/infraestructura/empresas/DjangoEmpresaRepository';
import { eliminarTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

const empresaRepository = new DjangoEmpresaRepository();

const EmpresaCardItem = ({ empresa, isPrimary, navigation, toggleEmpresa, deleteEmpresa }: any) => {
  return (
    <View style={styles.newCard}>
      {/* TOP AREA: Clickable for Navigation */}
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={() => navigation.navigate('EmpresaDetail', { empresa })}
      >
        {/* TOP: COVER */}
        <View style={styles.newCardCoverContainer}>
          {empresa.foto_portada_url ? (
            <Image source={{ uri: empresa.foto_portada_url }} style={styles.newCardCover} resizeMode="cover" />
          ) : (
            <View style={[styles.newCardCover, { backgroundColor: isPrimary ? colors.primary : '#4A90E2' }]} />
          )}
        </View>

        {/* LOGO OVERLAP */}
        <View style={styles.newCardAvatarContainer}>
          {empresa.logo_url ? (
            <Image source={{ uri: empresa.logo_url }} style={styles.newCardAvatar} />
          ) : (
            <View style={[styles.newCardAvatar, { backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
                {empresa.nombre.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      {/* BADGE OVERLAP (Clickable to Toggle Status) */}
      <TouchableOpacity 
        style={styles.newCardBadge} 
        onPress={() => toggleEmpresa(empresa.id, empresa.activa)}
        activeOpacity={0.8}
      >
        <Feather name={empresa.activa ? "check-circle" : "x-circle"} size={10} color={empresa.activa ? "#F5A623" : "#FF4B4B"} />
        <Text style={styles.newCardBadgeText}>{empresa.activa ? 'Activa' : 'Inactiva'}</Text>
      </TouchableOpacity>

      {/* INFO SECTION */}
      <View style={styles.newCardInfo}>
        <View style={styles.newCardTitleRow}>
          <TouchableOpacity 
            style={{flex: 1, paddingRight: 8}}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('EmpresaDetail', { empresa })}
          >
            <Text style={styles.newCardTitle} numberOfLines={1}>{empresa.nombre}</Text>
            <Text style={styles.newCardSubtitle} numberOfLines={1}>{empresa.ciudad || `@${empresa.slug}`}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newCardCircleBtn} onPress={() => deleteEmpresa(empresa.id, empresa.nombre)}>
            <Feather name="trash-2" size={14} color="#888" />
          </TouchableOpacity>
        </View>

        {/* CONTACT INFO ROW (Replaces Stats) */}
        <View style={styles.newCardContactRow}>
          <View style={styles.newCardContactTextCol}>
            <View style={styles.newCardContactLine}>
              <Feather name="map-pin" size={10} color="#888" />
              <Text style={styles.newCardContactText} numberOfLines={1}>
                {empresa.direccion || 'Sin dirección'}
              </Text>
            </View>
            <View style={styles.newCardContactLine}>
              <Feather name="phone" size={10} color="#888" />
              <Text style={styles.newCardContactText} numberOfLines={1}>
                {empresa.telefono || 'Sin teléfono'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.newCardWspBtn} onPress={() => {}}>
            <Feather name="message-circle" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* ACTION BUTTON */}
        <TouchableOpacity style={styles.newCardActionBtn} onPress={() => navigation.navigate('EmpresaDetail', { empresa })}>
          <Text style={styles.newCardActionBtnText}>Reservar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const HomeScreen = ({ navigation }: any) => {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmpresas = async () => {
    try {
      const datos = await empresaRepository.obtenerEmpresas();
      setEmpresas(datos);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEmpresas();
    }, [])
  );

  const toggleEmpresa = async (id: string, estadoActual: boolean) => {
    try {
      const nuevoEstado = !estadoActual;
      const ok = await empresaRepository.cambiarEstado(id, nuevoEstado);
      
      if (ok) {
        setEmpresas(empresas.map(emp => 
          emp.id === id ? { ...emp, activa: nuevoEstado } : emp
        ));
      } else {
        Alert.alert('Error', 'No se pudo cambiar el estado de la empresa');
      }
    } catch (error) {
      Alert.alert('Error', 'Problema de conexión al cambiar el estado');
    }
  };

  const deleteEmpresa = (id: string, nombre: string) => {
    Alert.alert(
      "Eliminar Empresa",
      `¿Estás seguro que deseas eliminar a "${nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            try {
              const ok = await empresaRepository.eliminarEmpresa(id);
              if (ok) {
                setEmpresas(empresas.filter(emp => emp.id !== id));
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

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm("¿Estás seguro que deseas salir?");
      if (confirm) {
        eliminarTokenLocal().then(() => navigation.replace('Login'));
      }
    } else {
      Alert.alert(
        "Cerrar Sesión",
        "¿Estás seguro que deseas salir?",
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Salir", 
            style: "destructive",
            onPress: () => {
              eliminarTokenLocal().then(() => navigation.replace('Login'));
            }
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Top Header with Menu and Bell */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleLogout}>
            <Feather name="log-out" size={24} color="#FF4B4B" />
          </TouchableOpacity>
          <View style={styles.bellContainer}>
            <Feather name="bell" size={24} color={colors.primary} />
            <View style={styles.notificationDot} />
          </View>
        </View>

        {/* Header Titles */}
        <View style={styles.header}>
          <Text style={[typography.h1, { color: colors.primary }]}>¡Hola Jenifer!</Text>
          <Text style={[typography.body, { color: colors.textSubtitle, marginTop: 4 }]}>Buenos días</Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, shadows.soft]}>
          <Feather name="search" size={20} color={colors.textSubtitle} style={{ marginRight: 12 }} />
          <TextInput 
            placeholder="Buscar"
            placeholderTextColor={colors.textSubtitle}
            style={styles.searchInput}
          />
        </View>

        {/* Banner Card */}
        <Card style={styles.bannerCard}>
          <View style={styles.bannerTextContainer}>
            <Text style={[typography.h3, { color: colors.primary, marginBottom: 8 }]}>Panel Principal</Text>
            <Text style={[typography.caption, { color: colors.textSubtitle, lineHeight: 18 }]}>
              Gestión centralizada de{'\n'}franquicias y empresas
            </Text>
          </View>
          <View style={styles.bannerIllustrationPlaceholder}>
            <Feather name="monitor" size={40} color={colors.primary} />
          </View>
        </Card>

        {/* Ongoing Projects Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: colors.primary }]}>Empresas Activas</Text>
          <Text style={[typography.caption, { color: colors.textSubtitle }]}>ver todo</Text>
        </View>

        <View style={styles.grid}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
          ) : empresas.length === 0 ? (
            <Text style={{color: colors.textSubtitle}}>No hay empresas registradas aún.</Text>
          ) : (
            empresas.map((empresa, index) => {
              const isPrimary = index % 2 === 0;
              const textColor = isPrimary ? colors.surface : colors.primary;
              const bgColor = isPrimary ? colors.primary : colors.surface;
              const subTextColor = isPrimary ? 'rgba(255,255,255,0.7)' : colors.textSubtitle;
              return (
                <EmpresaCardItem 
                  key={empresa.id}
                  empresa={empresa}
                  isPrimary={isPrimary}
                  navigation={navigation}
                  toggleEmpresa={toggleEmpresa}
                  deleteEmpresa={deleteEmpresa}
                />
              );
            })
          )}
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
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  bellContainer: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4B4B',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  header: {
    marginBottom: 25,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 30,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  bannerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 25,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerIllustrationPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    padding: 20,
    borderRadius: 28,
  },
  newCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    ...shadows.soft,
  },
  newCardCoverContainer: {
    width: '100%',
    height: 130, // Increased from 90 to show more image
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  newCardCover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EEE',
  },
  newCardAvatarContainer: {
    position: 'absolute',
    top: 104, // 130 (image height) - 26 (half of avatar height)
    left: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
    ...shadows.soft,
  },
  newCardAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  newCardBadge: {
    position: 'absolute',
    top: 118, // overlaps exactly at the bottom edge of the 130px cover
    right: 12,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    ...shadows.soft,
    gap: 4,
  },
  newCardBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333',
  },
  newCardInfo: {
    paddingTop: 32, // space for avatar
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  newCardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  newCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
  },
  newCardSubtitle: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
    fontWeight: '500',
  },
  newCardCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newCardContactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 16,
  },
  newCardContactTextCol: {
    flex: 1,
    paddingRight: 8,
    gap: 6,
  },
  newCardContactLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newCardContactText: {
    fontSize: 9,
    color: '#555',
    flex: 1,
  },
  newCardWspBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  newCardActionBtn: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newCardActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111',
  },
});
