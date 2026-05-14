/**
 * HorariosConfigScreen.tsx
 *
 * Permite a la empresa configurar sus horarios de atención por día de la semana.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Switch, ActivityIndicator, Alert, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { HorarioDia } from '../../core/domain/citas/IHorarioRepository';
import { DjangoHorarioRepository } from '../../core/infraestructura/citas/DjangoHorarioRepository';
import { ObtenerHorariosCasoUso } from '../../core/aplicacion/citas/ObtenerHorariosCasoUso';
import { GuardarHorariosCasoUso } from '../../core/aplicacion/citas/GuardarHorariosCasoUso';

const DIAS = [
  { num: 0, nombre: 'Lunes',     short: 'LUN' },
  { num: 1, nombre: 'Martes',    short: 'MAR' },
  { num: 2, nombre: 'Miércoles', short: 'MIE' },
  { num: 3, nombre: 'Jueves',    short: 'JUE' },
  { num: 4, nombre: 'Viernes',   short: 'VIE' },
  { num: 5, nombre: 'Sábado',    short: 'SÁB' },
  { num: 6, nombre: 'Domingo',   short: 'DOM' },
];

const horarioDefault = (): HorarioDia[] =>
  DIAS.map(d => ({
    dia_semana: d.num,
    hora_inicio: '08:00',
    hora_fin: '18:00',
    activo: d.num < 5,
  }));

const horasValidas = (inicio: string, fin: string) => inicio < fin;

export const HorariosConfigScreen = ({ navigation }: any) => {
  const [horarios, setHorarios] = useState<HorarioDia[]>(horarioDefault());
  const [loading, setLoading]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);
  const empresaIdRef = useRef<string | null>(null);
  const tokenRef     = useRef<string | null>(null);

  // Picker State
  const [pickerInfo, setPickerInfo] = useState<{
    show: boolean;
    diaNum: number;
    campo: 'hora_inicio' | 'hora_fin';
    date: Date;
  } | null>(null);

  // Hexagonal dependencies
  const repo = new DjangoHorarioRepository();
  const obtenerHorarios = new ObtenerHorariosCasoUso(repo);
  const guardarHorariosCU = new GuardarHorariosCasoUso(repo);

  const cargarHorarios = useCallback(async () => {
    try {
      setLoading(true);
      const token = await obtenerTokenLocal();
      if (!token) return;
      tokenRef.current = token.access;
      const p = JSON.parse(atob(token.access.split('.')[1]));
      empresaIdRef.current = p.user_id;

      const datosBackend = await obtenerHorarios.ejecutar(empresaIdRef.current!);
      
      const base = horarioDefault();
      if (datosBackend.length > 0) {
        datosBackend.forEach(h => {
          const idx = base.findIndex(b => b.dia_semana === h.dia_semana);
          if (idx !== -1) {
            base[idx] = {
              dia_semana: h.dia_semana,
              hora_inicio: h.hora_inicio.substring(0, 5),
              hora_fin: h.hora_fin.substring(0, 5),
              activo: h.activo,
            };
          }
        });
      }
      setHorarios(base);
    } catch (e) {
      console.log('Error cargando horarios:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargarHorarios(); }, [cargarHorarios]));

  const actualizar = (diaNum: number, campo: keyof HorarioDia, valor: any) => {
    setHorarios(prev =>
      prev.map(h => h.dia_semana === diaNum ? { ...h, [campo]: valor } : h)
    );
    setGuardado(false);
  };

  const guardar = async () => {
    const invalidos = horarios.filter(h => h.activo && !horasValidas(h.hora_inicio, h.hora_fin));
    if (invalidos.length > 0) {
      const nombres = invalidos.map(h => DIAS[h.dia_semana].nombre).join(', ');
      Alert.alert('Horarios inválidos', `La apertura debe ser antes del cierre en: ${nombres}.`);
      return;
    }

    try {
      setGuardando(true);
      await guardarHorariosCU.ejecutar(empresaIdRef.current!, horarios, tokenRef.current!);
      setGuardado(true);
      if (Platform.OS !== 'web') Alert.alert('✅ Guardado', 'Horarios actualizados correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const parseToDate = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };

  const openPicker = (diaNum: number, campo: 'hora_inicio' | 'hora_fin', currentVal: string) => {
    if (Platform.OS === 'web') {
      // En web usamos prompt por ahora o el input nativo html5, pero react-native-web
      // no soporta datetimepicker fácilmente sin hacks. Como pidieron la "rueda de casino",
      // el datetimepicker funcionará en la app nativa IOS/Android.
      const val = prompt(`Nueva ${campo === 'hora_inicio' ? 'Apertura' : 'Cierre'} (HH:MM):`, currentVal);
      if (val && /^([01]\d|2[0-3]):([0-5]\d)$/.test(val)) {
        actualizar(diaNum, campo, val);
      }
    } else {
      setPickerInfo({
        show: true,
        diaNum,
        campo,
        date: parseToDate(currentVal)
      });
    }
  };

  const onPickerChange = (event: any, selectedDate?: Date) => {
    if (!pickerInfo) return;
    const { diaNum, campo } = pickerInfo;
    
    if (Platform.OS === 'android') {
      setPickerInfo(null);
    }

    if (selectedDate) {
      const h = String(selectedDate.getHours()).padStart(2, '0');
      const m = String(selectedDate.getMinutes()).padStart(2, '0');
      actualizar(diaNum, campo, `${h}:${m}`);
      if (Platform.OS === 'ios') {
        setPickerInfo(prev => prev ? { ...prev, date: selectedDate } : null);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Horarios de atención</Text>
          <View style={{ width: 40 }} />
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Horarios de atención</Text>
        <TouchableOpacity style={[s.saveBtn, guardado && s.saveBtnDone]} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name={guardado ? 'check' : 'save'} size={18} color="#FFF" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.infoBox}>
          <Feather name="info" size={16} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={s.infoText}>
            Estos horarios determinan qué horas aparecen disponibles cuando tus clientes reservan.
          </Text>
        </View>

        {DIAS.map(dia => {
          const h = horarios.find(x => x.dia_semana === dia.num)!;
          const invalido = h.activo && !horasValidas(h.hora_inicio, h.hora_fin);

          return (
            <View key={dia.num} style={[s.diaCard, invalido && s.diaCardError, !h.activo && s.diaCardInactive]}>
              <View style={s.diaRow}>
                <View style={s.diaLabel}>
                  <Text style={[s.diaNombre, !h.activo && { color: '#9CA3AF' }]}>{dia.nombre}</Text>
                </View>
                <Switch
                  value={h.activo}
                  onValueChange={v => actualizar(dia.num, 'activo', v)}
                  trackColor={{ false: '#E5E7EB', true: colors.primary + '80' }}
                  thumbColor={h.activo ? colors.primary : '#9CA3AF'}
                />
              </View>

              {h.activo && (
                <View style={s.horasRow}>
                  <TouchableOpacity style={[s.horaBtn, invalido && s.horaBtnError]} onPress={() => openPicker(dia.num, 'hora_inicio', h.hora_inicio)}>
                    <Text style={s.horaLabel}>Apertura</Text>
                    <Text style={[s.horaValue, invalido && s.horaValueError]}>{h.hora_inicio}</Text>
                  </TouchableOpacity>

                  <Feather name="arrow-right" size={20} color="#CBD5E1" style={{ marginTop: 15 }} />

                  <TouchableOpacity style={[s.horaBtn, invalido && s.horaBtnError]} onPress={() => openPicker(dia.num, 'hora_fin', h.hora_fin)}>
                    <Text style={s.horaLabel}>Cierre</Text>
                    <Text style={[s.horaValue, invalido && s.horaValueError]}>{h.hora_fin}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={[s.btnGuardar, guardado && s.btnGuardadoDone]} onPress={guardar} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Feather name={guardado ? 'check-circle' : 'save'} size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={s.btnGuardarText}>{guardado ? 'Guardado correctamente' : 'Guardar horarios'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {pickerInfo?.show && Platform.OS !== 'web' && (
        <View style={s.pickerContainer}>
          <View style={s.pickerHeader}>
            <TouchableOpacity onPress={() => setPickerInfo(null)}>
              <Text style={s.pickerDone}>Listo</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={pickerInfo.date}
            mode="time"
            display="spinner"
            onChange={onPickerChange}
            textColor="#000"
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 50, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  saveBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  saveBtnDone: { backgroundColor: '#10B981' },
  scroll: { padding: 16, paddingBottom: 100 },
  infoBox: { flexDirection: 'row', backgroundColor: '#E0F2FE', borderRadius: 12, padding: 14, marginBottom: 24, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 14, color: '#0369A1', lineHeight: 20 },
  diaCard: { backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  diaCardError: { borderWidth: 1, borderColor: '#FCA5A5' },
  diaCardInactive: { backgroundColor: '#F1F5F9', shadowOpacity: 0, elevation: 0 },
  diaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  diaLabel: { flexDirection: 'row', alignItems: 'center' },
  diaNombre: { fontSize: 18, fontWeight: '600', color: '#1E293B' },
  horasRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  horaBtn: { flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 12, borderRadius: 12, marginHorizontal: 8 },
  horaBtnError: { backgroundColor: '#FEF2F2' },
  horaLabel: { fontSize: 12, color: '#64748B', fontWeight: '500', marginBottom: 4, textTransform: 'uppercase' },
  horaValue: { fontSize: 22, fontWeight: '700', color: colors.primary },
  horaValueError: { color: '#EF4444' },
  btnGuardar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 18, marginTop: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  btnGuardadoDone: { backgroundColor: '#10B981', shadowColor: '#10B981' },
  btnGuardarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  pickerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', paddingBottom: 30, borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerDone: { color: colors.primary, fontSize: 16, fontWeight: '700' }
});
