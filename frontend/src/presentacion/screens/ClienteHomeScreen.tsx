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
import { useAuth } from '../../core/aplicacion/auth/AuthContext';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.48;

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
    image: require('../../../assets/cardsCliente/superiorUno.png'),
    action: 'scrollDown',
  },
  {
    id: '2',
    title: 'Explorar',
    subtitle: 'Descubre negocios\ncerca de ti',
    image: require('../../../assets/cardsCliente/superiorDos.png'),
    action: 'ExplorarEmpresas',
  },
  {
    id: '3',
    title: 'Mi Carrito',
    subtitle: 'Completa tu\nreserva fácilmente',
    image: require('../../../assets/cardsCliente/superiorTres.png'),
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

  const { onLogout } = useAuth();

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
          /* ── TAB MI NEGOCIO: diseño nativo (sin imagen, siempre responsivo) ── */
          <LinearGradient
            colors={['#3B2DBF', '#4535D4', '#2E1FA3']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={st.negocioWrapper}
          >
            {/* Estrellas decorativas */}
            <Text style={st.negocioStar1}>✨</Text>
            <Text style={st.negocioStar2}>⭐</Text>

            {/* ¡Impulsa tu negocio! */}
            <Text style={st.negocioTagline}>¡Impulsa tu negocio!</Text>
            <View style={st.negocioTaglineBar} />

            {/* Título principal */}
            <Text style={st.negocioTitle}>
              ¡Haz crecer tu{`\n`}negocio con{' '}
              <Text style={st.negocioTitleAccent}>Flowy!</Text>
            </Text>

            {/* Subtítulo */}
            <Text style={st.negocioSubtitle}>
              Gestiona tu agenda y recibe clientes de{' '}
              <Text style={{ color: '#FFCE00', fontWeight: '700' }}>forma profesional.</Text>
            </Text>

            {/* Beneficios */}
            {[
              { icon: 'clock',       title: 'Recibe reservas 24/7 sin esfuerzo',        body: 'Tus clientes reservan mientras tú te enfocas en lo importante.' },
              { icon: 'calendar',    title: 'Gestiona tu agenda desde cualquier lugar', body: 'Todo tu negocio en tu celular, cuando y donde lo necesites.' },
              { icon: 'users',       title: 'Clientes llegan solos con tu perfil',      body: 'Tu negocio se ve profesional y genera confianza al instante.' },
              { icon: 'trending-up', title: 'Estadísticas y control de tus ingresos',  body: 'Toma mejores decisiones con datos claros de tu negocio.' },
            ].map((b, i) => (
              <View key={i} style={st.negocioBenefit}>
                <View style={st.negocioBenefitIcon}>
                  <Feather name={b.icon as any} size={20} color="#FFCE00" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.negocioBenefitTitle}>{b.title}</Text>
                  <Text style={st.negocioBenefitBody}>{b.body}</Text>
                </View>
              </View>
            ))}

            {/* Botón dorado */}
            <TouchableOpacity
              style={st.negocioBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Login', { modoInicial: 'register' })}
            >
              <Text style={st.negocioBtnTxt}>🚀  Registrar mi empresa gratis</Text>
            </TouchableOpacity>

            {/* Quizás después */}
            <TouchableOpacity
              style={st.negocioDismiss}
              onPress={() => setTabActivo('mio')}
            >
              <Text style={st.negocioDismissTxt}>Quizás después</Text>
            </TouchableOpacity>
          </LinearGradient>
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
              <View style={st.cardImageContainer}>
                <Image source={item.image} style={st.cardImage} resizeMode="cover" />
              </View>
              <View style={st.cardBottom}>
                <Text style={st.cardTitle}>{item.title}</Text>
                <Text style={st.cardSubtitle}>{item.subtitle}</Text>
              </View>
            </TouchableOpacity>
          )}
        />

        {/* ── INDICADOR DE SCROLL HORIZONTAL ── */}
        <View style={st.scrollHint}>
          <View style={[st.scrollDot, st.scrollDotActive]} />
          <View style={st.scrollDot} />
          <View style={st.scrollDot} />
          <Feather name="chevrons-right" size={14} color="#9CA3AF" style={{ marginLeft: 4 }} />
        </View>

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
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...shadows.medium,
  },
  cardImageContainer: {
    width: '100%',
    height: 105,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardBottom: {
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  cardSubtitle: { fontSize: 12, color: '#6B7280', lineHeight: 17 },

  // ── SCROLL HINT
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
    gap: 5,
  },
  scrollDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  scrollDotActive: {
    backgroundColor: colors.primary,
    width: 18,
  },

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
  // ── TAB MI NEGOCIO (diseño nativo, 100% responsivo)
  negocioWrapper: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  negocioStar1: {
    position: 'absolute', top: 16, right: 20,
    fontSize: 22, opacity: 0.7,
  },
  negocioStar2: {
    position: 'absolute', top: 50, right: 40,
    fontSize: 14, opacity: 0.5,
  },
  negocioTagline: {
    color: '#FFCE00',
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  negocioTaglineBar: {
    width: 80,
    height: 2,
    backgroundColor: '#FFCE00',
    alignSelf: 'center',
    marginBottom: 14,
    borderRadius: 2,
  },
  negocioTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
  },
  negocioTitleAccent: {
    color: '#FFCE00',
    fontSize: 28,
    fontWeight: '900',
  },
  negocioSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  negocioBenefit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  negocioBenefitIcon: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  negocioBenefitTitle: {
    color: '#FFCE00',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },
  negocioBenefitBody: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    lineHeight: 16,
  },
  // Botón dorado pill
  negocioBtn: {
    backgroundColor: '#FFCE00',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#FFCE00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  negocioBtnTxt: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  negocioDismiss: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  negocioDismissTxt: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
});
