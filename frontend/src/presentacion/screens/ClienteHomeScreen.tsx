/**
 * ClienteHomeScreen — Capa Presentación.
 *
 * REGLA DE ARQUITECTURA HEXAGONAL:
 *   Esta pantalla NO conoce URLs, fetch(), ni AsyncStorage directamente.
 *   Usa el caso de uso ObtenerCitasClienteCasoUso que recibe un repositorio
 *   inyectado. La pantalla solo gestiona estado de UI y navegación.
 *
 * Flujo: Screen → CasoUso → IClienteCitaRepository ← DjangoClienteCitaRepository
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Platform, Alert, Dimensions,
  Modal, Image, StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadows } from '../theme/colors';

// ── Capa de Aplicación ────────────────────────────────────────────────────────
import { ObtenerCitasClienteCasoUso } from '../../core/aplicacion/citas/ObtenerCitasClienteCasoUso';
import { CitaCliente } from '../../core/domain/citas/IClienteCitaRepository';

// ── Infraestructura (inyección de dependencias) ───────────────────────────────
import { DjangoClienteCitaRepository } from '../../core/infraestructura/citas/DjangoClienteCitaRepository';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { useAuth } from '../../core/aplicacion/auth/AuthContext';

// ── Componentes Extraídos ─────────────────────────────────────────────────────
import { CarouselCards } from '../components/ClienteHome/CarouselCards';
import { QuickActions } from '../components/ClienteHome/QuickActions';
import { BannerPromocional } from '../components/ClienteHome/BannerPromocional';
import { PublicidadEmpresa } from '../components/ClienteHome/PublicidadEmpresa';

const { width: SCREEN_W } = Dimensions.get('window');

const repositorioCitas = new DjangoClienteCitaRepository();
const obtenerCitasCasoUso = new ObtenerCitasClienteCasoUso(repositorioCitas);

export const ClienteHomeScreen = ({ navigation }: any) => {
  const [nombre, setNombre]           = useState('');
  const [clienteId, setClienteId]     = useState('');
  const [citas, setCitas]             = useState<CitaCliente[]>([]);
  const [cargando, setCargando]       = useState(false);
  const [tabActivo, setTabActivo]     = useState<'mio' | 'negocio'>('mio');
  const [modalProfile, setModalProfile] = useState(false);
  const [rolUsuario, setRolUsuario]   = useState<string>('cliente');
  const scrollRef = useRef<ScrollView>(null);

  const { onLogout } = useAuth();

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        try {
          const tokenData = await obtenerTokenLocal();
          if (tokenData?.rol) setRolUsuario(tokenData.rol);

          const [n, id, token] = await Promise.all([
            AsyncStorage.getItem('cliente_nombre'),
            AsyncStorage.getItem('cliente_id'),
            AsyncStorage.getItem('cliente_token'),
          ]);
          setNombre(n || 'Mi cuenta');
          setClienteId(id || '');

          if (id && token) {
            setCargando(true);
            const resultado = await obtenerCitasCasoUso.ejecutar(id, token);
            setCitas(resultado);
          }
        } catch {
          setCitas([]);
        } finally {
          setCargando(false);
        }
      };
      cargar();
    }, [])
  );

  const cerrarSesion = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Salir de tu cuenta?')) onLogout();
    } else {
      Alert.alert('Cerrar sesión', '¿Salir de tu cuenta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: onLogout },
      ]);
    }
  };

  const bannersData = [
    { image: require('../../../assets/Relleno/promo1.png'), action: () => navigation.navigate('ExplorarEmpresas') },
    { image: require('../../../assets/Relleno/promo2.png'), action: () => scrollRef.current?.scrollTo({ y: 520, animated: true }) },
    { image: require('../../../assets/Relleno/promo3.png'), action: () => navigation.navigate('ExplorarEmpresas') },
  ];

  const quickActionsData = [
    { icon: 'calendar', label: 'Mis Citas',   onPress: () => scrollRef.current?.scrollToEnd({ animated: true }) },
    { icon: 'compass',  label: 'Explorar',    onPress: () => navigation.navigate('ExplorarEmpresas') },
    { icon: 'shopping-cart', label: 'Carrito', onPress: () => navigation.navigate('Carrito') },
    { icon: 'more-horizontal', label: 'Más',  onPress: () => setModalProfile(true) },
  ];

  const handleCardAction = (action: string) => {
    if (action === 'scrollDown') {
      scrollRef.current?.scrollTo({ y: 520, animated: true });
    } else {
      navigation.navigate(action);
    }
  };

  const handleNegocioTab = () => {
    if (rolUsuario === 'empresa' || rolUsuario === 'superadmin') {
      navigation.navigate('EmpresaTabs');
    } else {
      setTabActivo('negocio');
    }
  };

  const handleRegisterPress = () => {
    navigation.navigate('RegistroEmpresaDesdeCliente');
  };

  return (
    <SafeAreaView style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── HEADER ── */}
      <View style={st.topBar}>
        <TouchableOpacity style={st.avatarCircle} onPress={() => setModalProfile(true)}>
          <Feather name="user" size={20} color={colors.primary} />
        </TouchableOpacity>

        <View style={st.logoContainer}>
          <Image
            source={require('../../../assets/logoFlowy.svg')}
            style={st.headerLogo}
            resizeMode="contain"
          />
        </View>

        <View style={st.topBarRight}>
          <TouchableOpacity style={st.iconBtn} onPress={() => setModalProfile(true)}>
            <Feather name="bell" size={20} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity style={st.iconBtn} onPress={cerrarSesion}>
            <Feather name="message-circle" size={20} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── TABS (Segment Control) ── */}
      <View style={st.tabsWrapper}>
        <View style={st.segmentControl}>
          <TouchableOpacity
            style={[st.segmentTab, tabActivo === 'mio' && st.segmentTabActive]}
            onPress={() => setTabActivo('mio')}
            activeOpacity={0.8}
          >
            <Text style={[st.segmentTabText, tabActivo === 'mio' && st.segmentTabTextActive]}>
              Mi Flowy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.segmentTab, tabActivo === 'negocio' && st.segmentTabActive]}
            onPress={handleNegocioTab}
            activeOpacity={0.8}
          >
            <Text style={[st.segmentTabText, tabActivo === 'negocio' && st.segmentTabTextActive]}>
              Mi Negocio
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scroll}
      >
        {tabActivo === 'negocio' ? (
          <PublicidadEmpresa 
            onRegisterPress={handleRegisterPress} 
            onDismiss={() => setTabActivo('mio')} 
          />
        ) : (
          <>
            <BannerPromocional bannersData={bannersData} isActive={tabActivo === 'mio'} />
            <QuickActions actions={quickActionsData} />
            
            <View style={{ marginTop: 12, marginBottom: 8 }}>
              <Text style={[st.sectionTitle, { marginHorizontal: 20, marginBottom: 12 }]}>Tus accesos rápidos</Text>
            </View>
            
            <CarouselCards onAction={handleCardAction} />
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* ── MODAL Perfil ── */}
      <Modal visible={modalProfile} transparent animationType="slide">
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHandle} />
            <View style={st.modalIconBg}>
              <Feather name="user" size={32} color={colors.primary} />
            </View>
            <Text style={st.modalTitle}>¡Hola, {nombre}! 👋</Text>
            <Text style={st.modalText}>
              Muy pronto podrás personalizar tu perfil, subir tu foto y administrar todos tus datos desde aquí.
            </Text>

            <TouchableOpacity
              style={st.modalBtnSecondary}
              onPress={() => { setModalProfile(false); cerrarSesion(); }}
            >
              <Feather name="log-out" size={16} color="#EF4444" />
              <Text style={[st.modalBtnSecTxt, { color: '#EF4444' }]}>Cerrar sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={st.modalBtn}
              onPress={() => setModalProfile(false)}
            >
              <Text style={st.modalBtnTxt}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingBottom: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  logoContainer: { 
    position: 'absolute', left: 0, right: 0, 
    alignItems: 'center', justifyContent: 'center', zIndex: -1 
  },
  headerLogo: { height: SCREEN_W < 400 ? 22 : 32, width: SCREEN_W < 400 ? 70 : 100 },
  topBarRight: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center',
  },
  tabsWrapper: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, backgroundColor: '#FFFFFF', alignItems: 'center' },
  segmentControl: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 30, padding: 3 },
  segmentTab: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  segmentTabActive: { backgroundColor: colors.primary, ...shadows.soft },
  segmentTabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  segmentTabTextActive: { color: '#FFFFFF' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingTop: 12, alignItems: 'center' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 24 },
  modalIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 10, textAlign: 'center' },
  modalText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  modalBtnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: '#FFF5F5', width: '100%', justifyContent: 'center', marginBottom: 12 },
  modalBtnSecTxt: { fontWeight: '600', fontSize: 15 },
  modalBtn: { backgroundColor: colors.primary, width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  modalBtnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
