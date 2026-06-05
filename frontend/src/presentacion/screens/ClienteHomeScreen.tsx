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
  ActivityIndicator, Modal, FlatList, Image, StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, shadows } from '../theme/colors';

// ── Capa de Aplicación ────────────────────────────────────────────────────────
import { ObtenerCitasClienteCasoUso } from '../../core/aplicacion/citas/ObtenerCitasClienteCasoUso';
import { CitaCliente } from '../../core/domain/citas/IClienteCitaRepository';

// ── Infraestructura (inyección de dependencias) ───────────────────────────────
import { DjangoClienteCitaRepository } from '../../core/infraestructura/citas/DjangoClienteCitaRepository';

// Leer el token firmado (fuente de verdad de seguridad: nunca confiamos en
// variables locales mutables para el rol; siempre lo leemos del JWT guardado)
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.58;

// Inyección de dependencia: la pantalla trabaja con el contrato, no la implementación
const repositorioCitas = new DjangoClienteCitaRepository();
const obtenerCitasCasoUso = new ObtenerCitasClienteCasoUso(repositorioCitas);

// ── Badge de estado ───────────────────────────────────────────────────────────
const EstadoBadge = ({ estado }: { estado: string }) => {
  const cfg: Record<string, { color: string; bg: string; label: string }> = {
    programada: { color: '#D97706', bg: '#FFFBEB', label: 'Programada' },
    pendiente:  { color: '#D97706', bg: '#FFFBEB', label: 'Pendiente'  },
    confirmada: { color: '#059669', bg: '#ECFDF5', label: 'Confirmada' },
    pagada:     { color: '#2563EB', bg: '#EFF6FF', label: 'Pagada'     },
    cancelada:  { color: '#DC2626', bg: '#FEF2F2', label: 'Cancelada'  },
    completada: { color: '#6D28D9', bg: '#F5F3FF', label: 'Completada' },
  };
  const key = (estado || '').toLowerCase();
  const c = cfg[key] ?? { color: '#64748B', bg: '#F8FAFC', label: estado };
  return (
    <View style={[st.badge, { backgroundColor: c.bg }]}>
      <Text style={[st.badgeTxt, { color: c.color }]}>{c.label}</Text>
    </View>
  );
};

// ── Tarjetas del carrusel ─────────────────────────────────────────────────────
const CAROUSEL_CARDS = [
  {
    id: '1',
    title: 'Mis Citas',
    subtitle: 'Revisa y gestiona\ntus reservas activas',
    image: require('../../../assets/card_citas.png'),
    gradient: [colors.primary, '#3A4AD4'] as [string, string],
    action: 'scrollDown',
  },
  {
    id: '2',
    title: 'Explorar',
    subtitle: 'Descubre negocios\ncerca de ti',
    image: require('../../../assets/card_explorar.png'),
    gradient: ['#F43F5E', '#BE185D'] as [string, string],
    action: 'ExplorarEmpresas',
  },
  {
    id: '3',
    title: 'Mi Carrito',
    subtitle: 'Completa tu\nreserva fácilmente',
    image: require('../../../assets/card_carrito.png'),
    gradient: ['#059669', '#047857'] as [string, string],
    action: 'Carrito',
  },
];

// ── Pantalla principal ────────────────────────────────────────────────────────
export const ClienteHomeScreen = ({ navigation }: any) => {
  const [nombre, setNombre]           = useState('');
  const [clienteId, setClienteId]     = useState('');
  const [citas, setCitas]             = useState<CitaCliente[]>([]);
  const [cargando, setCargando]       = useState(false);
  const [tabActivo, setTabActivo]     = useState<'mio' | 'negocio'>('mio');
  const [showBalance, setShowBalance] = useState(true);
  const [modalProfile, setModalProfile] = useState(false);
  // Modal de promocion de empresa (se muestra si el usuario no tiene rol empresa)
  const [modalEmpresa, setModalEmpresa] = useState(false);
  // Rol leido del JWT almacenado (fuente de verdad firmada por el backend)
  const [rolUsuario, setRolUsuario]   = useState<string>('cliente');
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        try {
          // SEGURIDAD: leemos el rol desde el JWT firmado guardado, no de
          // una variable suelta. Si el token fue manipulado localmente, el
          // backend lo rechazara igual al hacer llamadas autenticadas.
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

  const executeLogout = async () => {
    // 1. Eliminar todos los datos de sesion en bloque (operacion atomica)
    await AsyncStorage.multiRemove([
      'cliente_token', 'cliente_nombre', 'cliente_email',
      'cliente_id', 'cliente_telefono', '@agenda_pro_token',
    ]);
    // 2. Navegar a una pantalla pública para disparar el onStateChange del
    //    AppNavigator. Este detectará que el token fue eliminado, pondrá
    //    isLogueado=false y React Navigation mostrará el Login automáticamente.
    navigation.reset({ index: 0, routes: [{ name: 'ExplorarEmpresas' }] });
  };

  const cerrarSesion = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Salir de tu cuenta?')) executeLogout();
    } else {
      Alert.alert('Cerrar sesión', '¿Salir de tu cuenta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: executeLogout },
      ]);
    }
  };

  const proximas = citas.filter(c => {
    const hoy = new Date().toISOString().split('T')[0];
    return c.fecha >= hoy && (c.estado || '').toUpperCase() !== 'CANCELADA';
  }).length;

  const pagadas = citas.filter(c => {
    const est = (c.estado || '').toUpperCase();
    return est === 'CONFIRMADA' || est === 'PAGADA';
  }).length;

  const handleCardAction = (action: string) => {
    if (action === 'scrollDown') {
      scrollRef.current?.scrollToEnd({ animated: true });
    } else {
      navigation.navigate(action);
    }
  };

  // ── QUICK ACTIONS (botones circulares estilo DaviPlata) ───────────────────
  const quickActions = [
    { icon: 'calendar', label: 'Mis Citas',   onPress: () => scrollRef.current?.scrollToEnd({ animated: true }) },
    { icon: 'compass',  label: 'Explorar',    onPress: () => navigation.navigate('ExplorarEmpresas') },
    { icon: 'shopping-cart', label: 'Carrito', onPress: () => navigation.navigate('Carrito') },
    { icon: 'more-horizontal', label: 'Más',  onPress: () => setModalProfile(true) },
  ];

  // Logica del tab "Mi Negocio":
  // Si el rol es 'empresa'/'superadmin' => navega a su panel.
  // Si es 'cliente' => muestra el banner de promocion inline (no un modal).
  const handleNegocioTab = () => {
    if (rolUsuario === 'empresa' || rolUsuario === 'superadmin') {
      navigation.navigate('EmpresaTabs');
    } else {
      setTabActivo('negocio');
    }
  };

  // ── BOTTOM TABS ───────────────────────────────────────────────────────────
  const bottomTabs = [
    { icon: 'list',          label: 'Movimientos', onPress: () => scrollRef.current?.scrollToEnd({ animated: true }) },
    { icon: 'shopping-bag',  label: 'Tienda',      onPress: () => navigation.navigate('ExplorarEmpresas') },
    { icon: 'grid',          label: 'Código QR',   onPress: () => setModalProfile(true) },
    { icon: 'credit-card',   label: 'Pagar',       onPress: () => navigation.navigate('Carrito') },
  ];

  return (
    <SafeAreaView style={st.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── HEADER fijo estilo DaviPlata ── */}
      <View style={st.topBar}>
        <TouchableOpacity style={st.avatarCircle} onPress={() => setModalProfile(true)}>
          <Feather name="user" size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* Logo centrado */}
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
          /* ── TAB MI NEGOCIO ── */
          <View style={st.negocioWrapper}>
            {/* Card contenedor — imagen + botón adentro, como la imagen de referencia */}
            <View style={st.negocioCard}>
              <Image
                source={require('../../../assets/publicidad/banerEmpresa (3).png')}
                style={st.negocioBanner}
                resizeMode="contain"
              />
              {/* Botón dorado DENTRO del card */}
              <TouchableOpacity
                style={st.negocioBtn}
                activeOpacity={0.85}
                onPress={() => {
                  navigation.navigate('Login', { modoInicial: 'register' });
                }}
              >
                <Text style={st.negocioBtnTxt}>🚀  Registrar mi empresa gratis</Text>
              </TouchableOpacity>
            </View>

            {/* "Quizás después" debajo del card */}
            <TouchableOpacity
              style={st.negocioDismiss}
              onPress={() => setTabActivo('mio')}
            >
              <Text style={st.negocioDismissTxt}>Quizás después</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── TAB MI FLOWY: contenido original ── */
          <>
        <View style={st.balanceSection}>
          <Text style={st.balanceQuestion}>¿Cuántas citas tengo?</Text>
          <View style={st.balanceRow}>
            <Text style={st.balanceAmount}>{cargando ? '...' : citas.length}</Text>
            <Text style={st.balanceAmountSuffix}> reservas</Text>
            <TouchableOpacity
              style={st.eyeBtn}
              onPress={() => setShowBalance(!showBalance)}
            >
              <Feather name={showBalance ? 'eye' : 'eye-off'} size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <Text style={st.balanceLabel}>
            {proximas} próximas · {pagadas} pagadas
          </Text>
        </View>

        {/* ── ACCIONES RÁPIDAS (botones circulares) ── */}
        <View style={st.quickRow}>
          {quickActions.map((qa) => (
            <View key={qa.label} style={st.quickItem}>
              <TouchableOpacity style={st.quickCircle} onPress={qa.onPress} activeOpacity={0.8}>
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  style={st.quickGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Feather name={qa.icon as any} size={22} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
              <Text style={st.quickLabel}>{qa.label}</Text>
            </View>
          ))}
        </View>

        {/* ── CARRUSEL DE CARDS ── */}
        <FlatList
          data={CAROUSEL_CARDS}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.carouselList}
          snapToInterval={CARD_W + 12}
          decelerationRate="fast"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[st.card, { width: CARD_W }]}
              activeOpacity={0.92}
              onPress={() => handleCardAction(item.action)}
            >
              <LinearGradient
                colors={item.gradient}
                style={st.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image source={item.image} style={st.cardImage} resizeMode="cover" />
              </LinearGradient>
              <View style={st.cardBottom}>
                <Text style={st.cardTitle}>{item.title}</Text>
                <Text style={st.cardSubtitle}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          )}
        />

        {/* ── HISTORIAL DE CITAS ── */}
        {cargando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : citas.length > 0 ? (
          <View style={st.histSection}>
            <Text style={st.sectionTitle}>Últimas citas</Text>
            {citas.slice(0, 6).map((cita) => (
              <View key={cita.id} style={st.citaCard}>
                <View style={st.citaIconBox}>
                  <Feather name="calendar" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.citaServicio} numberOfLines={1}>{cita.servicio_nombre}</Text>
                  <Text style={st.citaEmpresa}>{cita.empresa_nombre}</Text>
                  <Text style={st.citaFecha}>
                    {cita.fecha} · {cita.hora_inicio}
                    {cita.monto > 0 ? `  ·  $${Number(cita.monto).toLocaleString('es-CO')}` : ''}
                  </Text>
                </View>
                <EstadoBadge estado={cita.estado} />
              </View>
            ))}
          </View>
        ) : (
          <View style={st.emptyBox}>
            <View style={st.emptyIcon}>
              <Feather name="calendar" size={32} color={colors.primary} />
            </View>
            <Text style={st.emptyTxt}>No tienes citas aún</Text>
            <Text style={st.emptySubTxt}>Explora negocios y agenda tu primera cita</Text>
            <TouchableOpacity
              style={st.emptyBtn}
              onPress={() => navigation.navigate('ExplorarEmpresas')}
            >
              <Text style={st.emptyBtnTxt}>Explorar negocios</Text>
            </TouchableOpacity>
          </View>
        )}

            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* ── BOTTOM TAB BAR estilo DaviPlata ── */}
      <View style={st.bottomBar}>
        {bottomTabs.map((tab) => (
          <TouchableOpacity key={tab.label} style={st.bottomTab} onPress={tab.onPress}>
            <Feather name={tab.icon as any} size={22} color="#374151" />
            <Text style={st.bottomTabLabel}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

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

// ── Estilos ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingBottom: 20 },

  // ── TOP BAR
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
    position: 'absolute', 
    left: 0, right: 0, 
    alignItems: 'center', 
    justifyContent: 'center',
    zIndex: -1 
  },
  headerLogo: {
    // Tamaño responsivo: más pequeño para mobile y perfectamente centrado
    height: SCREEN_W < 400 ? 22 : 32,
    width: SCREEN_W < 400 ? 70 : 100,
  },
  topBarRight: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center', alignItems: 'center',
  },

  // ── TABS (Segment Control)
  tabsWrapper: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', // Center the segment control
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 30,
    padding: 3, // Small padding inside the pill
  },
  segmentTab: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentTabActive: {
    backgroundColor: colors.primary,
    ...shadows.soft,
  },
  segmentTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentTabTextActive: {
    color: '#FFFFFF',
  },

  // ── BALANCE
  balanceSection: {
    alignItems: 'center',
    paddingTop: 28, paddingBottom: 24,
    paddingHorizontal: 20,
  },
  balanceQuestion: { fontSize: 15, color: '#6B7280', marginBottom: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 },
  balanceAmount: { fontSize: 48, fontWeight: '700', color: '#111827', letterSpacing: -1 },
  balanceAmountSuffix: { fontSize: 18, fontWeight: '500', color: '#6B7280', marginLeft: 4 },
  eyeBtn: { marginLeft: 10, padding: 4 },
  balanceLabel: { fontSize: 13, color: '#9CA3AF' },

  // ── QUICK ACTIONS
  quickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  quickItem: { alignItems: 'center', gap: 8 },
  quickCircle: { borderRadius: 30, overflow: 'hidden', ...shadows.medium },
  quickGradient: {
    width: 60, height: 60,
    justifyContent: 'center', alignItems: 'center',
  },
  quickLabel: { fontSize: 12, color: '#374151', fontWeight: '500', textAlign: 'center' },

  // ── CARRUSEL
  carouselList: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  card: {
    borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    ...shadows.medium,
  },
  cardGradient: { height: 140, position: 'relative' },
  cardImage: {
    position: 'absolute', bottom: 0, right: 0,
    width: '60%', height: '110%',
  },
  cardBottom: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  cardSubtitle: { fontSize: 12, color: '#6B7280', lineHeight: 17 },

  // ── HISTORIAL
  histSection: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 14 },
  citaCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F3F4F6',
    ...shadows.soft,
  },
  citaIconBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
  },
  citaServicio: { fontSize: 14, fontWeight: '600', color: '#111827' },
  citaEmpresa: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  citaFecha: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '600' },

  // ── EMPTY STATE
  emptyBox: {
    alignItems: 'center',
    marginHorizontal: 20, marginTop: 36,
    padding: 32,
    backgroundColor: '#FAFAFA',
    borderRadius: 24,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  emptyTxt: { fontSize: 17, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySubTxt: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // ── BOTTOM BAR
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    ...shadows.medium,
  },
  bottomTab: { flex: 1, alignItems: 'center', gap: 4 },
  bottomTabLabel: { fontSize: 10, color: '#6B7280', fontWeight: '500' },

  // ── MODAL
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingTop: 12,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', marginBottom: 24,
  },
  modalIconBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 10, textAlign: 'center' },
  modalText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  modalBtnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 16, borderWidth: 1, borderColor: '#FEE2E2',
    backgroundColor: '#FFF5F5', width: '100%',
    justifyContent: 'center', marginBottom: 12,
  },
  modalBtnSecTxt: { fontWeight: '600', fontSize: 15 },
  modalBtn: {
    backgroundColor: colors.primary,
    width: '100%', paddingVertical: 15,
    borderRadius: 16, alignItems: 'center',
  },
  modalBtnTxt: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  // ── TAB MI NEGOCIO
  negocioWrapper: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  // Card contenedor — el botón va DENTRO, misma forma redondeada
  negocioCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',          // Recorta la imagen a los bordes del card
    backgroundColor: '#3B3DB8',  // Fondo azul por si la imagen tarda en cargar
    paddingBottom: 20,
    ...shadows.medium,
  },
  negocioBanner: {
    width: '100%',
    // Sin height fijo: la imagen se expande en su ratio natural
    height: undefined,
    aspectRatio: 600 / 350,      // Ratio real del archivo banerEmpresa.png
  },
  // Botón dorado pill dentro del card
  negocioBtn: {
    backgroundColor: '#F5B800',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  negocioBtnTxt: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  negocioDismiss: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  negocioDismissTxt: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
