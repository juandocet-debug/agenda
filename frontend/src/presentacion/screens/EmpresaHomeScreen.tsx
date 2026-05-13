import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, SafeAreaView, TouchableOpacity, Platform, Image, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { colors, shadows } from '../theme/colors';
import { eliminarTokenLocal, obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { ApiProfesionalRepository } from '../../core/infraestructura/profesionales/ApiProfesionalRepository';
import { ListarProfesionalesUseCase } from '../../core/aplicacion/profesionales/ProfesionalesUseCases';
import { DjangoEmpresaRepository } from '../../core/infraestructura/empresas/DjangoEmpresaRepository';

const { width } = Dimensions.get('window');
const CARD_W = Math.min(width * 0.42, 180);

// --- Acción rápida ---
const QuickAction = ({ icon, label, onPress }: any) => (
  <TouchableOpacity style={st.qaCard} onPress={onPress} activeOpacity={0.82}>
    <View style={st.qaIcon}>
      <Feather name={icon} size={22} color={colors.primary} />
    </View>
    <Text style={st.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

// --- Stat card ---
const StatCard = ({ icon, value, label, onPress }: any) => (
  <TouchableOpacity style={st.statCard} onPress={onPress} activeOpacity={0.85}>
    <View style={st.statIcon}>
      <Feather name={icon} size={20} color={colors.primary} />
    </View>
    <Text style={st.statValue}>{value}</Text>
    <Text style={st.statLabel}>{label}</Text>
  </TouchableOpacity>
);

const empresaRepo = new DjangoEmpresaRepository();

export const EmpresaHomeScreen = ({ navigation }: any) => {
  const [empresaData, setEmpresaData] = useState<any>(null);
  const [totalProfesionales, setTotalProfesionales] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const token = await obtenerTokenLocal();
          if (token?.access) {
            const p = JSON.parse(atob(token.access.split('.')[1]));
            const id = p.user_id;
            const data = await empresaRepo.obtenerEmpresaPrivada(id);
            if (data) setEmpresaData(data);
          }
          const repo = new ApiProfesionalRepository();
          const lista = await new ListarProfesionalesUseCase(repo).ejecutar();
          setTotalProfesionales(lista.length);
        } catch {}
      };
      load();
    }, [])
  );

  const nombreEmpresa = empresaData?.nombre_empresa || 'Mi Empresa';
  const logoUrl = empresaData?.logo_url;

  return (
    <SafeAreaView style={st.root}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ── HEADER con gradiente ── */}
        <LinearGradient
          colors={[colors.primary, '#1a3a6b']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={st.header}
        >
          {/* Círculos decorativos */}
          <View style={st.decoBig} />
          <View style={st.decoSmall} />

          {/* Row logo + greeting + campana */}
          <View style={st.headerRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Perfil')} style={st.avatarWrap}>
              {logoUrl
                ? <Image source={{ uri: logoUrl }} style={st.avatar} />
                : <View style={st.avatarFallback}><Feather name="briefcase" size={22} color={colors.primary} /></View>
              }
            </TouchableOpacity>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={st.greeting}>¡Hola, bienvenido! 👋</Text>
              <Text style={st.companyName} numberOfLines={1}>{nombreEmpresa}</Text>
            </View>

            <TouchableOpacity style={st.bellBtn} onPress={() => {}}>
              <Feather name="bell" size={20} color="#FFF" />
              <View style={st.bellDot} />
            </TouchableOpacity>
          </View>

          {/* Search bar dentro del header */}
          <View style={st.searchRow}>
            <View style={st.searchBox}>
              <Feather name="search" size={16} color="#888" />
              <TextInput
                placeholder="Buscar servicios, citas..."
                placeholderTextColor="#AAA"
                style={st.searchInput}
              />
            </View>
            <TouchableOpacity style={st.filterBtn} onPress={() => navigation.navigate('ServiciosList')}>
              <Feather name="sliders" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── BANNER HERO ── */}
        <View style={st.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={st.heroTag}>Plan Básico</Text>
            <Text style={st.heroTitle}>Gestiona tu{'\n'}negocio fácil</Text>
            <TouchableOpacity style={st.heroBtn} onPress={() => navigation.navigate('Perfil')}>
              <Text style={st.heroBtnText}>Configurar</Text>
            </TouchableOpacity>
          </View>
          <View style={st.heroIcon}>
            <Feather name="briefcase" size={52} color={colors.primary} />
          </View>
        </View>

        {/* ── ACCIONES RÁPIDAS ── */}
        <Text style={st.sectionTitle}>Acciones rápidas</Text>
        <View style={st.qaRow}>
          <QuickAction icon="calendar" label="Agenda" onPress={() => navigation.navigate('Agenda')} />
          <QuickAction icon="users" label="Equipo" onPress={() => navigation.navigate('ProfesionalesList')} />
          <QuickAction icon="grid" label="Servicios" onPress={() => navigation.navigate('ServiciosList')} />
          <QuickAction icon="image" label="Muro" onPress={() => navigation.navigate('EmpresaTabs', { screen: 'Muro' })} />
        </View>

        {/* ── ESTADÍSTICAS ── */}
        <Text style={st.sectionTitle}>Estadísticas</Text>
        <View style={st.statsRow}>
          <StatCard icon="users" value={totalProfesionales} label="Profesionales" onPress={() => navigation.navigate('ProfesionalesList')} />
          <StatCard icon="user-check" value="15" label="Clientes" onPress={() => {}} />
          <StatCard icon="calendar" value="0" label="Citas hoy" onPress={() => {}} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingBottom: 120 },

  /* Header */
  header: {
    paddingTop: Platform.OS === 'web' ? 24 : 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    marginBottom: 20,
  },
  decoBig: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40,
  },
  decoSmall: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: 10, left: -30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },

  avatarWrap: {
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%', height: '100%',
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
  },

  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  companyName: { fontSize: 18, color: '#FFF', fontWeight: '800', marginTop: 1 },

  bellBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  bellDot: {
    position: 'absolute', top: 8, right: 9,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#F87171', borderWidth: 1.5, borderColor: 'transparent',
  },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 11, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  filterBtn: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
  },

  /* Hero */
  heroCard: {
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: '#EFF6FF',
    borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  heroTag: {
    fontSize: 11, fontWeight: '700', color: colors.primary,
    backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8,
    overflow: 'hidden',
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#1E3A5F', lineHeight: 26, marginBottom: 14 },
  heroBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 12, alignSelf: 'flex-start',
  },
  heroBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  heroIcon: { width: 80, alignItems: 'center' },

  /* Quick actions */
  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: '#1E293B',
    marginHorizontal: 20, marginBottom: 12,
  },
  qaRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, paddingHorizontal: 20, marginBottom: 24,
    justifyContent: 'space-between',
  },
  qaCard: {
    width: '48%', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 10,
    backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  qaIcon: {
    width: 46, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  qaLabel: { fontSize: 13, fontWeight: '700', color: colors.primary },

  /* Stats */
  statsRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, marginBottom: 28,
  },
  statCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 16,
    padding: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E2E8F0',
    ...shadows.soft,
  },
  statIcon: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '500', textAlign: 'center' },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  logoutText: { color: '#E53E3E', fontWeight: '700', fontSize: 14 },
});
