import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal, Pressable, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

const API = 'https://agenda-production-ae37.up.railway.app/api';

type CitaEstado = 'PROGRAMADA' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA';
type ModalStep = 'detalle' | 'reprogramar_fecha' | 'reprogramar_hora';

interface Cita {
  id: string;
  empresa_id: string;
  servicio_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: CitaEstado;
  servicio_nombre: string;
  profesional_nombre: string;
  cliente_email?: string;
  cliente_nombre: string;
  cliente_telefono: string;
}

interface Slot {
  hora: string;
  cupos_disponibles: number;
}

export const AgendaScreen = () => {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);

  // Reprogramar state
  const [modalStep, setModalStep] = useState<ModalStep>('detalle');
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargarCitas = async () => {
    try {
      setLoading(true);
      const token = await obtenerTokenLocal();
      if (!token) return;
      const res = await fetch(`${API}/citas/mis-citas/`, {
        headers: { 'Authorization': `Bearer ${token.access}` }
      });
      const data = await res.json();
      if (data.ok) setCitas(data.datos);
    } catch (error) {
      console.error('Error cargando citas:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { cargarCitas(); }, []));

  const abrirCita = (cita: Cita) => {
    setCitaSeleccionada(cita);
    setModalStep('detalle');
    setNuevaFecha('');
    setSlots([]);
  };

  const cerrarModal = () => {
    setCitaSeleccionada(null);
    setModalStep('detalle');
    setNuevaFecha('');
    setSlots([]);
  };

  // ── Alert compatible con web ─────────────────────────────────────────────
  const mostrarAlerta = (titulo: string, msg: string) => {
    if (Platform.OS === 'web') { window.alert(`${titulo}\n${msg}`); }
  };
  const confirmarAccion = (msg: string): boolean => {
    if (Platform.OS === 'web') return window.confirm(msg);
    return true;
  };

  // ── Cancelar ──────────────────────────────────────────────────────────────
  const cancelarCita = async () => {
    if (!citaSeleccionada) return;
    const ok = confirmarAccion(`¿Cancelar la cita de ${citaSeleccionada.cliente_nombre}?`);
    if (!ok) return;
    try {
      setGuardando(true);
      const token = await obtenerTokenLocal();
      if (!token) return;
      const res = await fetch(`${API}/citas/${citaSeleccionada.id}/cancelar/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token.access}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.ok) {
        mostrarAlerta('✅ Listo', 'Cita cancelada correctamente.');
        cerrarModal();
        cargarCitas();
      } else {
        mostrarAlerta('Error', data.error || 'No se pudo cancelar la cita.');
      }
    } catch {
      mostrarAlerta('Error', 'Problema de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  // ── Reprogramar paso 1: elegir fecha ─────────────────────────────────────
  const irAElegirFecha = () => {
    setNuevaFecha('');
    setSlots([]);
    setModalStep('reprogramar_fecha');
  };

  // ── Reprogramar paso 2: cargar slots de la nueva fecha ───────────────────
  const elegirFechaYCargarSlots = async (fecha: string) => {
    if (!citaSeleccionada) return;
    setNuevaFecha(fecha);
    setLoadingSlots(true);
    setModalStep('reprogramar_hora');
    try {
      const url = `${API}/citas/slots/?empresa_id=${citaSeleccionada.empresa_id}&fecha=${fecha}&servicio_id=${citaSeleccionada.servicio_id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok) setSlots(data.datos);
      else setSlots([]);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // ── Reprogramar paso 3: confirmar nueva hora ─────────────────────────────
  const confirmarReprogramar = async (hora: string) => {
    if (!citaSeleccionada || !nuevaFecha) return;
    try {
      setGuardando(true);
      const token = await obtenerTokenLocal();
      if (!token) return;
      const res = await fetch(`${API}/citas/${citaSeleccionada.id}/reprogramar/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token.access}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: nuevaFecha, hora_inicio: hora })
      });
      const data = await res.json();
      if (data.ok) {
        mostrarAlerta('✅ Listo', `Cita reprogramada para el ${dayjs(nuevaFecha).format('DD/MM/YYYY')} a las ${hora}.`);
        cerrarModal();
        cargarCitas();
      } else {
        mostrarAlerta('Error', data.error || 'No se pudo reprogramar.');
      }
    } catch {
      mostrarAlerta('Error', 'Problema de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const markedDates: any = {
    [selectedDate]: { selected: true, selectedColor: '#1E293B', textColor: 'white' }
  };
  citas.forEach(c => {
    if (c.fecha !== selectedDate) {
      markedDates[c.fecha] = { marked: true, dotColor: '#94A3B8' };
    } else {
      markedDates[c.fecha] = { ...markedDates[c.fecha], marked: true, dotColor: 'white' };
    }
  });

  const citasDelDia = citas.filter(c => c.fecha === selectedDate);
  const totalEventos = citasDelDia.length;

  const getStatusColor = (estado: CitaEstado) => {
    switch (estado) {
      case 'PROGRAMADA': return '#F59E0B';
      case 'CONFIRMADA': return '#10B981';
      case 'COMPLETADA': return '#3B82F6';
      case 'CANCELADA': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `${h}:${m} ${ampm}`;
    }
    return time;
  };

  const renderCita = ({ item }: { item: Cita }) => (
    <TouchableOpacity style={s.eventCard} activeOpacity={0.7} onPress={() => abrirCita(item)}>
      <View style={s.eventTimeRow}>
        <Text style={s.eventTime}>{formatTime(item.hora_inicio)} - {formatTime(item.hora_fin)}</Text>
        <Feather name="more-vertical" size={16} color="#94A3B8" />
      </View>
      <Text style={s.eventTitle}>{item.servicio_nombre.toUpperCase()}</Text>
      <View style={s.eventFooterRow}>
        <Text style={s.eventClientName}>{item.cliente_nombre}</Text>
        <View style={[s.statusDot, { backgroundColor: getStatusColor(item.estado) }]} />
      </View>
    </TouchableOpacity>
  );

  // ── Modal ─────────────────────────────────────────────────────────────────
  const renderModal = () => {
    if (!citaSeleccionada) return null;
    const puedeGestionar = citaSeleccionada.estado !== 'CANCELADA' && citaSeleccionada.estado !== 'COMPLETADA';

    return (
      <Modal transparent visible animationType="slide">
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={cerrarModal} />
          <View style={s.modalContent}>
            <View style={s.modalHandle} />

            {/* ── PASO: Detalle ── */}
            {modalStep === 'detalle' && (
              <>
                <Text style={s.modalTitle}>Detalles de la Cita</Text>

                <View style={s.detailRow}>
                  <Feather name="user" size={18} color="#64748B" />
                  <View style={s.detailTextCol}>
                    <Text style={s.detailLabel}>Cliente</Text>
                    <Text style={s.detailValue}>{citaSeleccionada.cliente_nombre}</Text>
                    <Text style={s.detailSub}>{citaSeleccionada.cliente_telefono || 'Sin teléfono'}</Text>
                  </View>
                </View>

                <View style={s.detailRow}>
                  <Feather name="bookmark" size={18} color="#64748B" />
                  <View style={s.detailTextCol}>
                    <Text style={s.detailLabel}>Servicio</Text>
                    <Text style={s.detailValue}>{citaSeleccionada.servicio_nombre}</Text>
                  </View>
                </View>

                <View style={s.detailRow}>
                  <Feather name="briefcase" size={18} color="#64748B" />
                  <View style={s.detailTextCol}>
                    <Text style={s.detailLabel}>Profesional</Text>
                    <Text style={s.detailValue}>{citaSeleccionada.profesional_nombre || 'Ninguno'}</Text>
                  </View>
                </View>

                <View style={s.detailRow}>
                  <Feather name="clock" size={18} color="#64748B" />
                  <View style={s.detailTextCol}>
                    <Text style={s.detailLabel}>Fecha y hora</Text>
                    <Text style={s.detailValue}>{dayjs(citaSeleccionada.fecha).format('DD/MM/YYYY')} · {formatTime(citaSeleccionada.hora_inicio)}</Text>
                  </View>
                </View>

                <View style={s.detailRow}>
                  <Feather name="info" size={18} color="#64748B" />
                  <View style={s.detailTextCol}>
                    <Text style={s.detailLabel}>Estado</Text>
                    <View style={[s.badgeInfo, { backgroundColor: getStatusColor(citaSeleccionada.estado) + '20' }]}>
                      <Text style={[s.badgeInfoText, { color: getStatusColor(citaSeleccionada.estado) }]}>
                        {citaSeleccionada.estado}
                      </Text>
                    </View>
                  </View>
                </View>

                {puedeGestionar && (
                  <View style={s.accionesRow}>
                    <TouchableOpacity style={s.btnReprogramar} onPress={irAElegirFecha} disabled={guardando}>
                      <Feather name="calendar" size={16} color="#2563EB" />
                      <Text style={s.btnReprogramarText}>Reprogramar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.btnCancelar} onPress={cancelarCita} disabled={guardando}>
                      {guardando
                        ? <ActivityIndicator size="small" color="#EF4444" />
                        : <>
                            <Feather name="x-circle" size={16} color="#EF4444" />
                            <Text style={s.btnCancelarText}>Cancelar cita</Text>
                          </>
                      }
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity style={s.closeBtn} onPress={cerrarModal}>
                  <Text style={s.closeBtnText}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── PASO: Elegir nueva fecha ── */}
            {modalStep === 'reprogramar_fecha' && (
              <>
                <View style={s.modalHeaderRow}>
                  <TouchableOpacity onPress={() => setModalStep('detalle')}>
                    <Feather name="arrow-left" size={22} color="#1E293B" />
                  </TouchableOpacity>
                  <Text style={s.modalTitle}>Elige una nueva fecha</Text>
                </View>
                <Calendar
                  minDate={dayjs().add(1, 'day').format('YYYY-MM-DD')}
                  onDayPress={(day: any) => elegirFechaYCargarSlots(day.dateString)}
                  theme={{
                    selectedDayBackgroundColor: colors.primary,
                    todayTextColor: colors.primary,
                    arrowColor: colors.primary,
                  }}
                />
              </>
            )}

            {/* ── PASO: Elegir nueva hora ── */}
            {modalStep === 'reprogramar_hora' && (
              <>
                <View style={s.modalHeaderRow}>
                  <TouchableOpacity onPress={() => setModalStep('reprogramar_fecha')}>
                    <Feather name="arrow-left" size={22} color="#1E293B" />
                  </TouchableOpacity>
                  <Text style={s.modalTitle}>{dayjs(nuevaFecha).format('dddd DD/MM')}</Text>
                </View>

                {loadingSlots ? (
                  <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
                ) : slots.length === 0 ? (
                  <Text style={s.emptyText}>No hay horarios disponibles para este día.</Text>
                ) : (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[s.detailLabel, { marginBottom: 12 }]}>Selecciona el nuevo horario:</Text>
                    {slots.map(slot => (
                      <TouchableOpacity
                        key={slot.hora}
                        style={s.slotBtn}
                        onPress={() => confirmarReprogramar(slot.hora)}
                        disabled={guardando}
                      >
                        {guardando
                          ? <ActivityIndicator size="small" color="#FFF" />
                          : <Text style={s.slotBtnText}>{formatTime(slot.hora)}</Text>
                        }
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            )}

          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <Calendar
        current={selectedDate}
        onDayPress={(day: any) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#64748B',
          selectedDayBackgroundColor: '#1E293B',
          selectedDayTextColor: '#ffffff',
          todayTextColor: colors.primary,
          dayTextColor: '#1E293B',
          textDisabledColor: '#CBD5E1',
          dotColor: '#94A3B8',
          selectedDotColor: '#ffffff',
          arrowColor: '#1E293B',
          monthTextColor: '#1E293B',
          indicatorColor: colors.primary,
          textDayFontWeight: '500',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 15,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 13
        }}
        style={s.calendar}
      />

      <View style={s.divider} />

      <View style={s.daySummaryHeader}>
        <View>
          <Text style={s.daySummaryLabel}>HOY</Text>
          <Text style={s.daySummaryDate}>{dayjs(selectedDate).format('DD')}</Text>
          <Text style={s.daySummaryDayName}>{dayjs(selectedDate).format('dddd')}</Text>
        </View>
        <Text style={s.daySummaryCount}>{totalEventos} evento{totalEventos !== 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : citasDelDia.length === 0 ? (
        <View style={s.center}>
          <Feather name="coffee" size={32} color="#CBD5E1" />
          <Text style={s.emptyText}>No hay citas para este día</Text>
        </View>
      ) : (
        <FlatList
          data={citasDelDia}
          keyExtractor={c => c.id}
          renderItem={renderCita}
          contentContainerStyle={s.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderModal()}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  calendar: { paddingBottom: 10 },
  divider: { height: 8, backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: '#F1F5F9', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },

  daySummaryHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 10 },
  daySummaryLabel: { fontWeight: '500', fontSize: 12, color: '#64748B', letterSpacing: 1 },
  daySummaryDate: { fontWeight: '500', fontSize: 32, color: '#1E293B', lineHeight: 36 },
  daySummaryDayName: { fontWeight: '500', fontSize: 13, color: '#94A3B8', textTransform: 'capitalize' },
  daySummaryCount: { fontWeight: '500', marginLeft: 'auto', fontSize: 14, color: '#475569', backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },

  listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
  eventCard: { backgroundColor: '#F1F5F9', borderRadius: 16, padding: 16, marginBottom: 12 },
  eventTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  eventTime: { fontWeight: '500', fontSize: 13, color: '#64748B' },
  eventTitle: { fontWeight: '500', fontSize: 15, color: '#1E293B', marginBottom: 8, letterSpacing: 0.5 },
  eventFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventClientName: { fontWeight: '500', fontSize: 13, color: '#475569' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { fontWeight: '500', marginTop: 12, fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 24 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontWeight: '500', fontSize: 20, color: '#1E293B', marginBottom: 20, flex: 1 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  detailTextCol: { marginLeft: 16, flex: 1 },
  detailLabel: { fontWeight: '500', fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontWeight: '500', fontSize: 16, color: '#1E293B' },
  detailSub: { fontSize: 14, color: '#64748B', marginTop: 2 },

  badgeInfo: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  badgeInfoText: { fontWeight: '500', fontSize: 12 },

  // Acciones
  accionesRow: { flexDirection: 'row', gap: 10, marginBottom: 16, marginTop: 4 },
  btnReprogramar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingVertical: 12, borderRadius: 12 },
  btnReprogramarText: { fontWeight: '500', fontSize: 14, color: '#2563EB' },
  btnCancelar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', paddingVertical: 12, borderRadius: 12 },
  btnCancelarText: { fontWeight: '500', fontSize: 14, color: '#EF4444' },

  closeBtn: { backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontWeight: '500', fontSize: 15, color: '#1E293B' },

  // Slots
  slotBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  slotBtnText: { color: '#FFF', fontWeight: '500', fontSize: 16 },
});
