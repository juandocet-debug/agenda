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
  TouchableOpacity, Platform, Alert, Dimensions, ActivityIndicator, Modal
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

// Inyección de dependencia: la pantalla trabaja con el contrato, no la implementación
const repositorioCitas = new DjangoClienteCitaRepository();
const obtenerCitasCasoUso = new ObtenerCitasClienteCasoUso(repositorioCitas);

// ── Sub-componentes (idénticos a EmpresaHomeScreen para consistencia visual) ──
const QuickAction = ({ icon, label, onPress }: any) => (
  <TouchableOpacity style={st.qaCard} onPress={onPress} activeOpacity={0.82}>
    <View style={st.qaIcon}>
      <Feather name={icon} size={22} color={colors.primary} />
    </View>
    <Text style={st.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

const StatCard = ({ icon, value, label }: any) => (
  <View style={st.statCard}>
    <View style={st.statIcon}>
      <Feather name={icon} size={20} color={colors.primary} />
    </View>
    <Text style={st.statValue}>{value}</Text>
    <Text style={st.statLabel}>{label}</Text>
  </View>
);

const EstadoBadge = ({ estado }: { estado: string }) => {
  const cfg: Record<string, { color: string; bg: string; label: string }> = {
    pendiente:  { color: '#D97706', bg: '#FFFBEB', label: 'Pendiente'  },
    confirmada: { color: '#059669', bg: '#ECFDF5', label: 'Confirmada' },
    pagada:     { color: '#2563EB', bg: '#EFF6FF', label: 'Pagada'     },
    cancelada:  { color: '#DC2626', bg: '#FEF2F2', label: 'Cancelada'  },
    completada: { color: '#6D28D9', bg: '#F5F3FF', label: 'Completada' },
  };
  const c = cfg[estado] ?? { color: '#64748B', bg: '#F8FAFC', label: estado };
  return (
    <View style={[st.badge, { backgroundColor: c.bg }]}>
      <Text style={[st.badgeTxt, { color: c.color }]}>{c.label}</Text>
    </View>
  );
};

// ── Pantalla principal ────────────────────────────────────────────────────────
export const ClienteHomeScreen = ({ navigation }: any) => {
  const [nombre, setNombre] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [citas, setCitas] = useState<CitaCliente[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalProximamente, setModalProximamente] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      const cargar = async () => {
        try {
          // Solo leemos credenciales de AsyncStorage — responsabilidad válida en presentación
          const [n, id, token] = await Promise.all([
            AsyncStorage.getItem('cliente_nombre'),
            AsyncStorage.getItem('cliente_id'),
            AsyncStorage.getItem('cliente_token'),
          ]);

          setNombre(n || 'Mi cuenta');
          setClienteId(id || '');

          if (id && token) {
            setCargando(true);
            // Delegamos al caso de uso — la pantalla no sabe nada del HTTP
            const resultado = await obtenerCitasCasoUso.ejecutar(id, token);
            setCitas(resultado);
          }
        } catch (e: any) {
          // Error silencioso — el historial queda vacío, la UI lo maneja
          setCitas([]);
        } finally {
          setCargando(false);
        }
      };
      cargar();
    }, [])
  );

  const executeLogout = async () => {
    await AsyncStorage.multiRemove([
      'cliente_token', 'cliente_nombre', 'cliente_email',
      'cliente_id', 'cliente_telefono',
    ]);
    navigation.reset({
      index: 0,
      routes: [{ name: 'ExplorarEmpresas' }],
    });
  };

  const cerrarSesion = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Salir de tu cuenta?')) {
        executeLogout();
      }
    } else {
      Alert.alert('Cerrar sesión', '¿Salir de tu cuenta?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: executeLogout },
      ]);
    }
  };

  const proximas = citas.filter(c => {
    const hoy = new Date().toISOString().split('T')[0];
    return c.fecha >= hoy && c.estado !== 'cancelada';
  }).length;

  const pagadas = citas.filter(c => c.estado === 'pagada').length;

  return (
    <SafeAreaView style={st.root}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── HEADER — mismo gradiente que EmpresaHomeScreen ── */}
        <LinearGradient
          colors={[colors.primary, '#1a3a6b']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={st.header}
        >
          <View style={st.decoBig} />
          <View style={st.decoSmall} />
          <View style={st.headerRow}>
            <TouchableOpacity 
              style={st.avatarFallback} 
              onPress={() => setModalProximamente(true)}
            >
              <Feather name="user" size={22} color={colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={st.greeting}>¡Hola! 👋</Text>
              <Text style={st.companyName} numberOfLines={1}>{nombre}</Text>
            </View>
            <TouchableOpacity style={st.bellBtn} onPress={cerrarSesion}>
              <Feather name="log-out" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ── BANNER HERO ── */}
        <View style={st.heroCard}>
          <View style={{ flex: 1 }}>
            <Text style={st.heroTag}>Mi cuenta</Text>
            <Text style={st.heroTitle}>{'Gestiona tus\nreservas fácil'}</Text>
            <TouchableOpacity style={st.heroBtn} onPress={() => navigation.navigate('Carrito')}>
              <Text style={st.heroBtnText}>Ver carrito</Text>
            </TouchableOpacity>
          </View>
          <View style={st.heroIcon}>
            <Feather name="calendar" size={52} color={colors.primary} />
          </View>
        </View>

        {/* ── ACCIONES RÁPIDAS ── */}
        <Text style={st.sectionTitle}>Acciones rápidas</Text>
        <View style={st.qaRow}>
          <QuickAction
            icon="calendar"
            label="Mis Citas"
            onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
          />
          <QuickAction
            icon="shopping-cart"
            label="Carrito"
            onPress={() => navigation.navigate('Carrito')}
          />
          <QuickAction
            icon="compass"
            label="Explorar"
            onPress={() => navigation.navigate('ExplorarEmpresas')}
          />
          <QuickAction
            icon="log-out"
            label="Salir"
            onPress={cerrarSesion}
          />
        </View>

        {/* ── ESTADÍSTICAS ── */}
        <Text style={st.sectionTitle}>Resumen</Text>
        <View style={st.statsRow}>
          <StatCard icon="calendar"     value={citas.length} label="Total citas"  />
          <StatCard icon="clock"        value={proximas}     label="Próximas"     />
          <StatCard icon="check-circle" value={pagadas}      label="Pagadas"      />
        </View>

        {/* ── HISTORIAL ── */}
        {citas.length > 0 && (
          <>
            <Text style={st.sectionTitle}>Últimas citas</Text>
            {citas.slice(0, 5).map((cita) => (
              <View key={cita.id} style={st.citaCard}>
                <View style={st.citaRow}>
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
              </View>
            ))}
          </>
        )}

        {citas.length === 0 && !cargando && (
          <View style={st.emptyBox}>
            <Feather name="calendar" size={40} color="#CBD5E1" />
            <Text style={st.emptyTxt}>Aún no tienes citas</Text>
            <Text style={st.emptySubTxt}>Agrega servicios al carrito para reservar</Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Modal Próximamente */}
      <Modal visible={modalProximamente} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalIconBg}>
              <Feather name="camera" size={32} color={colors.primary} />
            </View>
            <Text style={st.modalTitle}>¡Próximamente!</Text>
            <Text style={st.modalText}>
              Muy pronto podrás personalizar tu perfil, subir tu foto y administrar todos tus datos personales desde aquí.
            </Text>
            <TouchableOpacity 
              style={st.modalBtn}
              onPress={() => setModalProximamente(false)}
            >
              <Text style={st.modalBtnTxt}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ── Estilos — consistentes al 100% con EmpresaHomeScreen ─────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingBottom: 40 },

  header: {
    paddingTop: Platform.OS === 'web' ? 24 : 16,
    paddingBottom: 32, paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden', marginBottom: 20,
  },
  decoBig: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40,
  },
  decoSmall: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)', bottom: 10, left: -30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarFallback: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  companyName: { fontSize: 18, color: '#FFF', fontWeight: '500', marginTop: 1 },
  bellBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  heroCard: {
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: '#EFF6FF', borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  heroTag: {
    fontSize: 11, fontWeight: '500', color: colors.primary,
    backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8, overflow: 'hidden',
  },
  heroTitle: { fontSize: 20, fontWeight: '500', color: '#1E3A5F', lineHeight: 26, marginBottom: 14 },
  heroBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 12, alignSelf: 'flex-start',
  },
  heroBtnText: { color: '#FFF', fontWeight: '500', fontSize: 13 },
  heroIcon: { width: 80, alignItems: 'center' },

  sectionTitle: {
    fontSize: 16, fontWeight: '500', color: '#1E293B',
    marginHorizontal: 20, marginBottom: 12,
  },
  qaRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, paddingHorizontal: 20, marginBottom: 24,
    justifyContent: 'space-between',
  },
  qaCard: {
    width: '48%', borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 10, backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#E2E8F0', ...shadows.soft,
  },
  qaIcon: {
    width: 46, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9',
  },
  qaLabel: { fontSize: 13, fontWeight: '500', color: colors.primary },

  statsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 28 },
  statCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 16,
    padding: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E2E8F0', ...shadows.soft,
  },
  statIcon: {
    width: 38, height: 38, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9',
  },
  statValue: { fontSize: 22, fontWeight: '500', color: colors.primary },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '500', textAlign: 'center' },

  citaCard: {
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', ...shadows.soft,
  },
  citaRow: { flexDirection: 'row', alignItems: 'center' },
  citaIconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },
  citaServicio: { fontSize: 14, fontWeight: '500', color: '#1E293B' },
  citaEmpresa: { fontSize: 12, color: '#64748B', marginTop: 1 },
  citaFecha: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeTxt: { fontSize: 11, fontWeight: '500' },

  emptyBox: {
    marginHorizontal: 20, alignItems: 'center', padding: 32, gap: 8,
    backgroundColor: '#FFF', borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  emptyTxt: { fontSize: 16, fontWeight: '500', color: '#94A3B8' },
  emptySubTxt: { fontSize: 13, color: '#CBD5E1', textAlign: 'center' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  modalIconBg: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 12, textAlign: 'center' },
  modalText: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 24, marginBottom: 28 },
  modalBtn: { backgroundColor: colors.primary, width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
