import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal, Pressable } from 'react-native';
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

type CitaEstado = 'PROGRAMADA' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA';

interface Cita {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: CitaEstado;
  servicio_nombre: string;
  profesional_nombre: string;
  cliente_nombre: string;
  cliente_telefono: string;
}

export const AgendaScreen = () => {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [citaSeleccionada, setCitaSeleccionada] = useState<Cita | null>(null);

  const cargarCitas = async () => {
    try {
      setLoading(true);
      const token = await obtenerTokenLocal();
      if (!token) return;

      const res = await fetch('https://agenda-production-ae37.up.railway.app/api/citas/mis-citas/', {
        headers: {
          'Authorization': `Bearer ${token.access}`
        }
      });
      const data = await res.json();
      if (data.ok) {
        setCitas(data.datos);
      }
    } catch (error) {
      console.error('Error cargando citas:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarCitas();
    }, [])
  );

  // Marcas en el calendario (puntos para días con citas)
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

  const renderCita = ({ item }: { item: Cita }) => {
    const formatTime = (time: string) => {
      if (!time) return '';
      const parts = time.split(':');
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10);
        const m = parts[1];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;
        return `${h}:${m} ${ampm}`;
      }
      return time;
    };

    return (
      <TouchableOpacity 
        style={s.eventCard} 
        activeOpacity={0.7}
        onPress={() => setCitaSeleccionada(item)}
      >
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
  };

  const renderModal = () => {
    if (!citaSeleccionada) return null;

    return (
      <Modal transparent visible={!!citaSeleccionada} animationType="slide">
        <View style={s.modalOverlay}>
          <Pressable style={s.modalBackdrop} onPress={() => setCitaSeleccionada(null)} />
          <View style={s.modalContent}>
            <View style={s.modalHandle} />
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
                <Text style={s.detailValue}>{citaSeleccionada.profesional_nombre}</Text>
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

            <TouchableOpacity 
              style={s.closeBtn}
              onPress={() => setCitaSeleccionada(null)}
            >
              <Text style={s.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
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
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
  emptyText: { fontWeight: '500', marginTop: 12, fontSize: 14, color: '#94A3B8' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: '50%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontWeight: '500', fontSize: 20, color: '#1E293B', marginBottom: 24 },
  
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  detailTextCol: { marginLeft: 16, flex: 1 },
  detailLabel: { fontWeight: '500', fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  detailValue: { fontWeight: '500', fontSize: 16, color: '#1E293B' },
  detailSub: { fontSize: 14, color: '#64748B', marginTop: 2 },
  
  badgeInfo: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  badgeInfoText: { fontWeight: '500', fontSize: 12 },

  closeBtn: { marginTop: 'auto', backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontWeight: '500', fontSize: 15, color: '#1E293B' }
});


