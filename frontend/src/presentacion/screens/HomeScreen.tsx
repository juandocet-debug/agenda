import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, SafeAreaView, ActivityIndicator, Alert, TouchableOpacity, Platform, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';

const BASE_URL = 'http://127.0.0.1:8001/api';

export const HomeScreen = ({ navigation }: any) => {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmpresas = async () => {
    try {
      const response = await fetch(`${BASE_URL}/empresas/admin/lista/`);
      const data = await response.json();
      if (data.ok) {
        setEmpresas(data.datos);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const toggleEmpresa = async (id: string, estadoActual: boolean) => {
    try {
      const response = await fetch(`${BASE_URL}/empresas/admin/${id}/activar/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !estadoActual })
      });
      const data = await response.json();
      if (data.ok) {
        Alert.alert('Éxito', data.mensaje);
        fetchEmpresas(); // Refrescar lista
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el estado');
    }
  };

  const deleteEmpresa = async (id: string, nombre: string) => {
    const confirmar = Platform.OS === 'web' 
      ? window.confirm(`¿Estás seguro que deseas eliminar la empresa "${nombre}" de manera PERMANENTE?`) 
      : await new Promise((resolve) => {
          Alert.alert(
            "Eliminar Empresa",
            `¿Estás seguro que deseas eliminar la empresa "${nombre}" de manera PERMANENTE?`,
            [
              { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
              { text: "Eliminar", style: "destructive", onPress: () => resolve(true) }
            ]
          );
        });

    if (confirmar) {
      try {
        const response = await fetch(`${BASE_URL}/empresas/admin/${id}/eliminar/`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.ok) {
          if (Platform.OS === 'web') {
            window.alert('Empresa eliminada correctamente.');
          } else {
            Alert.alert('Éxito', data.mensaje);
          }
          fetchEmpresas();
        } else {
          Alert.alert('Error', data.error || 'No se pudo eliminar la empresa');
        }
      } catch (error) {
        Alert.alert('Error', 'Hubo un error de conexión al eliminar');
      }
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm("¿Estás seguro que deseas salir?");
      if (confirm) {
        navigation.replace('Login');
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
            onPress: () => navigation.replace('Login')
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
                <Card key={empresa.id} variant={isPrimary ? "primary" : "surface"} style={styles.gridCard}>
                  <View style={styles.cardHeader}>
                    <Text style={[typography.caption, { color: subTextColor }]}>
                      {empresa.activa ? 'Activa' : 'Inactiva'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => toggleEmpresa(empresa.id, empresa.activa)} style={{ marginRight: 15 }}>
                        <Feather 
                          name={empresa.activa ? "toggle-right" : "toggle-left"} 
                          size={20} 
                          color={empresa.activa ? (isPrimary ? '#00FF00' : '#00C48C') : (isPrimary ? '#FF4B4B' : '#FF4B4B')} 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteEmpresa(empresa.id, empresa.nombre)}>
                        <Feather name="trash-2" size={18} color={isPrimary ? '#FF4B4B' : '#FF4B4B'} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.cardContentHeader}>
                    {empresa.logo_url ? (
                      <Image source={{ uri: empresa.logo_url }} style={styles.logoImage} />
                    ) : (
                      <View style={isPrimary ? styles.iconContainerPrimary : styles.iconContainerSecondary}>
                        <Text style={[typography.h2, { color: textColor }]}>
                          {empresa.nombre.substring(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cardTitleContainer}>
                      <Text style={[typography.h3, { color: textColor }]} numberOfLines={1}>{empresa.nombre}</Text>
                      <Text style={[typography.caption, { color: subTextColor }]}>
                        {empresa.slug}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.subscriptionContainer}>
                    <Feather name="calendar" size={14} color={subTextColor} style={{ marginRight: 6 }} />
                    <Text style={[typography.caption, { color: subTextColor }]}>
                      Suscripción: {empresa.fecha_suscripcion || 'N/A'}
                    </Text>
                  </View>
                  
                  <View style={styles.progressContainer}>
                    <Text style={[typography.caption, { color: textColor }]}>Profesionales</Text>
                    <Text style={[typography.caption, { color: textColor, fontWeight: 'bold' }]}>{empresa.profesionales}</Text>
                  </View>
                  <View style={styles.progressContainer}>
                    <Text style={[typography.caption, { color: textColor }]}>Usuarios</Text>
                    <Text style={[typography.caption, { color: textColor, fontWeight: 'bold' }]}>{empresa.usuarios}</Text>
                  </View>
                </Card>
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 15,
  },
  logoImage: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  iconContainerPrimary: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerSecondary: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: 'rgba(0,196,140,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  }
});
