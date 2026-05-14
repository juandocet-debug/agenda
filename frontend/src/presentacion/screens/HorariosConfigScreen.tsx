/**
 * HorariosConfigScreen.tsx — Configuración de horarios de la empresa.
 * UX: Acordeón. Todos los días visibles. Click = expandir y editar horas.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Switch, ActivityIndicator, Alert, Platform, Animated
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { HorarioDia } from '../../core/domain/citas/IHorarioRepository';
import { DjangoHorarioRepository } from '../../core/infraestructura/citas/DjangoHorarioRepository';
import { ObtenerHorariosCasoUso } from '../../core/aplicacion/citas/ObtenerHorariosCasoUso';
import { GuardarHorariosCasoUso } from '../../core/aplicacion/citas/GuardarHorariosCasoUso';

const DIAS = [
  { num: 0, nombre: 'Lunes',     short: 'Lun' },
  { num: 1, nombre: 'Martes',    short: 'Mar' },
  { num: 2, nombre: 'Miércoles', short: 'Mié' },
  { num: 3, nombre: 'Jueves',    short: 'Jue' },
  { num: 4, nombre: 'Viernes',   short: 'Vie' },
  { num: 5, nombre: 'Sábado',    short: 'Sáb' },
  { num: 6, nombre: 'Domingo',   short: 'Dom' },
];

const horarioDefault = (): HorarioDia[] =>
  DIAS.map(d => ({
    dia_semana: d.num,
    hora_inicio: '08:00',
    hora_fin:   '18:00',
    activo: d.num < 5,
  }));

const horasValidas = (i: string, f: string) =>
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(i) &&
  /^([01]\d|2[0-3]):([0-5]\d)$/.test(f) &&
  i < f;

const repo           = new DjangoHorarioRepository();
const obtenerCU      = new ObtenerHorariosCasoUso(repo);
const guardarCU      = new GuardarHorariosCasoUso(repo);

export const HorariosConfigScreen = ({ navigation }: any) => {
  const [horarios, setHorarios] = useState<HorarioDia[]>(horarioDefault());
  const [loading,   setLoading]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado,  setGuardado]  = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null); // día expandido

  const empresaIdRef = useRef<string | null>(null);
  const tokenRef     = useRef<string | null>(null);

  // ── Cargar horarios del backend ───────────────────────────────────────────
  const cargarHorarios = useCallback(async () => {
    try {
      setLoading(true);
      const token = await obtenerTokenLocal();
      if (!token) return;
      tokenRef.current     = token.access;
      const p              = JSON.parse(atob(token.access.split('.')[1]));
      empresaIdRef.current = p.user_id;

      const datosBackend = await obtenerCU.ejecutar(empresaIdRef.current!);
      const base = horarioDefault();

      if (datosBackend.length > 0) {
        datosBackend.forEach(h => {
          const idx = base.findIndex(b => b.dia_semana === h.dia_semana);
          if (idx !== -1) {
            base[idx] = {
              dia_semana:  h.dia_semana,
              hora_inicio: (h.hora_inicio || '08:00').substring(0, 5),
              hora_fin:    (h.hora_fin    || '18:00').substring(0, 5),
              activo:      !!h.activo,
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
    setHorarios(prev => prev.map(h => h.dia_semana === diaNum ? { ...h, [campo]: valor } : h));
    setGuardado(false);
  };

  const toggleDia = (diaNum: number) => {
    const h = horarios.find(x => x.dia_semana === diaNum)!;
    if (!h.activo) {
      // Al activar, expandir automáticamente
      actualizar(diaNum, 'activo', true);
      setExpandido(diaNum);
    } else {
      actualizar(diaNum, 'activo', false);
      if (expandido === diaNum) setExpandido(null);
    }
  };

  const guardar = async () => {
    const invalidos = horarios.filter(h => h.activo && !horasValidas(h.hora_inicio, h.hora_fin));
    if (invalidos.length > 0) {
      Alert.alert('Horarios inválidos', `Revisa las horas de: ${invalidos.map(h => DIAS[h.dia_semana].nombre).join(', ')}.\nApertura debe ser antes del cierre.`);
      return;
    }
    try {
      setGuardando(true);
      await guardarCU.ejecutar(empresaIdRef.current!, horarios, tokenRef.current!);
      setGuardado(true);
      if (Platform.OS !== 'web') Alert.alert('✅ Guardado', 'Horarios actualizados.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
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
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Horarios de atención</Text>
        <TouchableOpacity style={[s.saveBtn, guardado && s.saveBtnDone]} onPress={guardar} disabled={guardando}>
          {guardando
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Feather name={guardado ? 'check' : 'save'} size={18} color="#FFF" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Info */}
        <View style={s.infoBox}>
          <Feather name="info" size={15} color="#0369A1" style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={s.infoText}>Activa los días que atiendes y ajusta las horas tocando cada fila.</Text>
        </View>

        {/* ── Cards de Días ─────────────────────────────────────────────── */}
        {DIAS.map(dia => {
          const h         = horarios.find(x => x.dia_semana === dia.num)!;
          const abierto   = expandido === dia.num;
          const invalido  = h.activo && !horasValidas(h.hora_inicio, h.hora_fin);

          return (
            <View key={dia.num} style={[
              s.diaCard,
              !h.activo && s.diaCardOff,
              invalido   && s.diaCardError,
            ]}>
              {/* Fila principal: nombre + switch + botón expandir */}
              <TouchableOpacity
                style={s.diaRow}
                onPress={() => h.activo && setExpandido(abierto ? null : dia.num)}
                activeOpacity={h.activo ? 0.6 : 1}
              >
                {/* Indicador de color */}
                <View style={[s.diaIndicador, h.activo ? s.diaIndicadorOn : s.diaIndicadorOff]} />

                <Text style={[s.diaNombre, !h.activo && s.diaNombreOff]}>{dia.nombre}</Text>

                {h.activo && (
                  <Text style={s.horaResumen}>{h.hora_inicio} – {h.hora_fin}</Text>
                )}

                <View style={s.diaRowRight}>
                  {!h.activo && <Text style={s.cerradoText}>Cerrado</Text>}
                  <Switch
                    value={h.activo}
                    onValueChange={() => toggleDia(dia.num)}
                    trackColor={{ false: '#E5E7EB', true: colors.primary + '70' }}
                    thumbColor={h.activo ? colors.primary : '#CBD5E1'}
                  />
                  {h.activo && (
                    <Feather
                      name={abierto ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#94A3B8"
                      style={{ marginLeft: 6 }}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {/* Panel expandido con inputs de hora */}
              {abierto && h.activo && (
                <View style={s.horasPanel}>
                  <View style={s.horaGroup}>
                    <Text style={s.horaLabel}>APERTURA</Text>
                    <TextInput
                      style={[s.horaInput, invalido && !horasValidas(h.hora_inicio, h.hora_fin) && s.horaInputError]}
                      value={h.hora_inicio}
                      onChangeText={v => actualizar(dia.num, 'hora_inicio', v)}
                      placeholder="08:00"
                      maxLength={5}
                      selectTextOnFocus
                    />
                  </View>
                  <View style={s.horaSeparador}>
                    <Feather name="arrow-right" size={18} color="#CBD5E1" />
                  </View>
                  <View style={s.horaGroup}>
                    <Text style={s.horaLabel}>CIERRE</Text>
                    <TextInput
                      style={[s.horaInput, invalido && !horasValidas(h.hora_inicio, h.hora_fin) && s.horaInputError]}
                      value={h.hora_fin}
                      onChangeText={v => actualizar(dia.num, 'hora_fin', v)}
                      placeholder="18:00"
                      maxLength={5}
                      selectTextOnFocus
                    />
                  </View>
                </View>
              )}
              {invalido && abierto && (
                <Text style={s.errorText}>⚠ Verifica el formato HH:MM y que apertura sea antes del cierre</Text>
              )}
            </View>
          );
        })}

        {/* Botón guardar */}
        <TouchableOpacity
          style={[s.btnGuardar, guardado && s.btnGuardadoDone]}
          onPress={guardar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator color="#FFF" />
            : <>
                <Feather name={guardado ? 'check-circle' : 'save'} size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={s.btnGuardarText}>{guardado ? 'Guardado correctamente' : 'Guardar horarios'}</Text>
              </>}
        </TouchableOpacity>

        <Text style={s.footerHint}>
          💡 Los cambios afectan solo las nuevas reservas. Las citas existentes no se modifican.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8FAFC' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 50, paddingBottom: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn:      { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  saveBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  saveBtnDone:  { backgroundColor: '#10B981' },

  scroll: { padding: 16, paddingBottom: 80 },
  infoBox: { flexDirection: 'row', backgroundColor: '#E0F2FE', borderRadius: 12, padding: 12, marginBottom: 20, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 13, color: '#0369A1', lineHeight: 19 },

  diaCard:      { backgroundColor: '#FFF', borderRadius: 14, marginBottom: 10, overflow: 'hidden', borderWidth: 1.5, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  diaCardOff:   { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9', shadowOpacity: 0, elevation: 0 },
  diaCardError: { borderColor: '#FCA5A5' },

  diaRow:       { flexDirection: 'row', alignItems: 'center', padding: 16 },
  diaIndicador: { width: 4, height: 36, borderRadius: 4, marginRight: 14 },
  diaIndicadorOn:  { backgroundColor: colors.primary },
  diaIndicadorOff: { backgroundColor: '#E5E7EB' },

  diaNombre:    { flex: 1, fontSize: 16, fontWeight: '600', color: '#1E293B' },
  diaNombreOff: { color: '#9CA3AF' },

  horaResumen:  { fontSize: 13, fontWeight: '600', color: '#64748B', marginRight: 8 },

  diaRowRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cerradoText:  { fontSize: 12, color: '#9CA3AF', marginRight: 6 },

  horasPanel:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 34, paddingBottom: 18, paddingTop: 4, gap: 8 },
  horaGroup:    { flex: 1 },
  horaLabel:    { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 6, letterSpacing: 0.8 },
  horaInput:    { backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 20, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  horaInputError: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  horaSeparador: { paddingTop: 24 },

  errorText: { fontSize: 12, color: '#EF4444', paddingHorizontal: 34, paddingBottom: 12, fontWeight: '500' },

  btnGuardar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 18, marginTop: 10 },
  btnGuardadoDone: { backgroundColor: '#10B981' },
  btnGuardarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  footerHint:     { textAlign: 'center', color: '#94A3B8', fontSize: 12, lineHeight: 18, marginTop: 16 },
});
