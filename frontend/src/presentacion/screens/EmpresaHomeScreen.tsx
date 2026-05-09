import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, SafeAreaView, TouchableOpacity, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';
import { eliminarTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { ApiProfesionalRepository } from '../../core/infraestructura/profesionales/ApiProfesionalRepository';
import { ListarProfesionalesUseCase } from '../../core/aplicacion/profesionales/ProfesionalesUseCases';

const GradientMetricCard = ({ title, value, icon, gradientColors, onPress }: any) => (
  <TouchableOpacity style={styles.gradientCardWrapper} onPress={onPress} activeOpacity={0.8}>
    <LinearGradient colors={gradientColors} style={styles.gradientCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      {/* Decorative background shapes simulating waves */}
      <View style={styles.decoCircle1} />
      <View style={styles.decoCircle2} />
      
      <View style={styles.whiteCircle}>
        <Feather name={icon} size={28} color={gradientColors[1]} />
      </View>
      <View style={styles.textContainer}>
        {value !== undefined && <Text style={styles.gradientCardValue}>{value}</Text>}
        <Text style={styles.gradientCardTitle}>{title}</Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

export const EmpresaHomeScreen = ({ navigation }: any) => {
  const [totalProfesionales, setTotalProfesionales] = React.useState(0);

  React.useEffect(() => {
    const fetchProfesionales = async () => {
      try {
        const repo = new ApiProfesionalRepository();
        const useCase = new ListarProfesionalesUseCase(repo);
        const lista = await useCase.ejecutar();
        setTotalProfesionales(lista.length);
      } catch (error) {
        console.error("Error cargando profesionales:", error);
      }
    };

    // Agregar un listener para que recargue cuando la pantalla vuelve a tener el foco
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProfesionales();
    });

    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    const confirmar = Platform.OS === 'web'
      ? window.confirm('¿Estás seguro que deseas cerrar sesión?')
      : await new Promise((resolve) => {
          Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Salir', style: 'destructive', onPress: () => resolve(true) }
          ]);
        });

    if (confirmar) {
      await eliminarTokenLocal();
      navigation.replace('Login');
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
          <Text style={[typography.h1, { color: colors.primary }]}>¡Bienvenido!</Text>
          <Text style={[typography.body, { color: colors.textSubtitle, marginTop: 4 }]}>Buenos días, Administrador</Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, shadows.soft]}>
          <Feather name="search" size={20} color={colors.textSubtitle} style={{ marginRight: 12 }} />
          <TextInput 
            placeholder="Buscar..."
            placeholderTextColor={colors.textSubtitle}
            style={styles.searchInput}
          />
        </View>

        {/* Banner Card */}
        <Card style={styles.bannerCard}>
          <View style={styles.bannerTextContainer}>
            <Text style={[typography.h3, { color: colors.primary, marginBottom: 8 }]}>Mi Empresa</Text>
            <Text style={[typography.caption, { color: colors.textSubtitle, lineHeight: 18 }]}>
              Plan Actual: Básico{'\n'}Gestión local de tus servicios
            </Text>
          </View>
          <View style={styles.bannerIllustrationPlaceholder}>
            <Feather name="briefcase" size={40} color={colors.primary} />
          </View>
        </Card>

        {/* Ongoing Projects Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: colors.primary }]}>Métricas</Text>
        </View>

        {/* Color Grid Section */}
        <View style={styles.grid}>
          <GradientMetricCard 
            title="Profesionales" 
            value={totalProfesionales.toString()} 
            icon="users" 
            gradientColors={['#4287f5', '#2b6fd9']} 
            onPress={() => {}} 
          />
          <GradientMetricCard 
            title="Clientes" 
            value="15" 
            icon="user-check" 
            gradientColors={['#2b6fd9', '#1c52a5']} 
            onPress={() => {}} 
          />
          <GradientMetricCard 
            title="Citas hoy" 
            value="0" 
            icon="calendar" 
            gradientColors={['#1c52a5', colors.primaryLight]} 
            onPress={() => {}} 
          />
          <GradientMetricCard 
            title="Agregar Profesional" 
            icon="plus" 
            gradientColors={[colors.primaryLight, colors.primary]} 
            onPress={() => navigation.navigate('CrearProfesional')} 
          />
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
    paddingBottom: 120, // Aumentado un poco más para los tabs inferiores
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
    flexWrap: 'wrap',
  },
  
  /* Nuevos estilos para Gradient Cards */
  gradientCardWrapper: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientCard: {
    width: '100%',
    padding: 20,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1, // Para hacerlas completamente cuadradas
  },
  decoCircle1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: -20,
    right: -20,
  },
  decoCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.1)',
    bottom: -50,
    left: -30,
  },
  whiteCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  gradientCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
  },
});
