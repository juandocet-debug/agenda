/**
 * HorariosConfigScreen.tsx
 *
 * Permite a la empresa configurar sus horarios de atención por día de la semana.
 * Estos horarios determinan qué slots aparecen disponibles en la pantalla
 * de reservas del cliente y evitan traslapes de citas.
 *
 * Backend: GET/POST /api/citas/horario/<empresa_id>/
 * Convención: dia_semana 0=Lunes ... 6=Domingo (Python weekday())
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Switch, TextInput, ActivityIndicator, Alert, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

const API = 'https://agenda-production-ae37.up.railway.app';

const DIAS = [
  { num: 0, nombre: 'Lunes',     short: 'LUN' },
  { num: 1, nombre: 'Martes',    short: 'MAR' },
  { num: 2, nombre: 'Miércoles', short: 'MIE' },
  { num: 3, nombre: 'Jueves',    short: 'JUE' },
  { num: 4, nombre: 'Viernes',   short: 'VIE' },
  { num: 5, nombre: 'Sábado',    short: 'SÁB' },
  { num: 6, nombre: 'Domingo',   short: 'DOM' },
];

interface HorarioDia {
  dia_semana: number;
  hora_inicio: string; // 'HH:MM'
  hora_fin: string;    // 'HH:MM'
  activo: boolean;
}

// Estado inicial: Lun-Vie activos 08:00–18:00, fin de semana cerrado
const horarioDefault = (): HorarioDia[] =>
  DIAS.map(d => ({
    dia_semana: d.num,
    hora_inicio: '08:00',
    hora_fin: '18:00',
    activo: d.num < 5, // Lunes a Viernes activos
  }));

/** Valida formato HH:MM */
const esHoraValida = (h: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(h);

/** Devuelve true si hora_inicio < hora_fin */
const horasValidas = (inicio: string, fin: string) => {
  if (!esHoraValida(inicio) || !esHoraValida(fin)) return false;
  return inicio < fin;
};

export const HorariosConfigScreen = ({ navigation }: any) => {
  const [horarios, setHorarios] = useState<HorarioDia[]>(horarioDefault());
  const [loading, setLoading]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);
  const empresaIdRef = useRef<string | null>(null);
  const tokenRef     = useRef<string | null>(null);

  // ── Cargar horarios actuales del backend ──────────────────────────────────
  const cargarHorarios = useCallback(async () => {
    try {
      setLoading(true);
      const token = await obtenerTokenLocal();
      if (!token) return;
      tokenRef.current = token.access;
      const p = JSON.parse(atob(token.access.split('.')[1]));
      empresaIdRef.current = p.user_id;

      const res = await fetch(`${API}/api/citas/horario/${empresaIdRef.current}/`);
      const data = await res.json();

      if (data.ok && data.datos.length > 0) {
        // Mezclar los horarios del backend con los defaults para días no configurados
        const base = horarioDefault();
        data.datos.forEach((h: any) => {
          const idx = base.findIndex(b => b.dia_semana === h.dia_semana);
          if (idx !== -1) {
            base[idx] = {
              dia_semana: h.dia_semana,
              hora_inicio: h.hora_inicio,
              hora_fin: h.hora_fin,
              activo: true, // El GET solo devuelve activos
            };
          }
        });
        // Los días que NO vienen del backend están inactivos
        base.forEach(b => {
          const existeEnBackend = data.datos.some((h: any) => h.dia_semana === b.dia_semana);
          if (!existeEnBackend) b.activo = false;
        });
        setHorarios(base);
      }
    } catch (e) {
      console.log('Error cargando horarios:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargarHorarios(); }, [cargarHorarios]));

  // ── Actualizar un campo de un día ─────────────────────────────────────────
  const actualizar = (diaNum: number, campo: keyof HorarioDia, valor: any) => {
    setHorarios(prev =>
      prev.map(h => h.dia_semana === diaNum ? { ...h, [campo]: valor } : h)
    );
    setGuardado(false);
  };

  // ── Guardar horarios en el backend ────────────────────────────────────────
  const guardar = async () => {
    // Validar horas de días activos
    const invalidos = horarios.filter(
      h => h.activo && !horasValidas(h.hora_inicio, h.hora_fin)
    );
    if (invalidos.length > 0) {
      const nombres = invalidos.map(h => DIAS[h.dia_semana].nombre).join(', ');
      Alert.alert(
        'Horarios inválidos',
        `Revisa las horas de: ${nombres}.\n\nAsegúrate de usar formato HH:MM y que la hora de inicio sea menor que la de cierre.`
      );
      return;
    }

    try {
      setGuardando(true);
      const res = await fetch(`${API}/api/citas/horario/${empresaIdRef.current}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ horarios }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setGuardado(true);
        if (Platform.OS === 'web') {
          // En web Alert puede ser bloqueante; usamos el indicador de éxito visual
        } else {
          Alert.alert('✅ Guardado', 'Horarios actualizados correctamente.');
        }
      } else {
        Alert.alert('Error', data.error || 'No se pudo guardar. Intenta de nuevo.');
      }
    } catch (e) {
      Alert.alert('Error de conexión', 'Verifica tu conexión a internet.');
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
        <TouchableOpacity
          style={[s.saveBtn, guardado && s.saveBtnDone]}
          onPress={guardar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Feather name={guardado ? 'check' : 'save'} size={18} color="#FFF" />
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Leyenda */}
        <View style={s.infoBox}>
          <Feather name="info" size={16} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={s.infoText}>
            Estos horarios determinan qué horas aparecen disponibles cuando tus clientes reservan.
            Activa los días que atiendes y configura la hora de apertura y cierre.
          </Text>
        </View>

        {/* Un card por día */}
        {DIAS.map(dia => {
          const h = horarios.find(x => x.dia_semana === dia.num)!;
          const invalido = h.activo && !horasValidas(h.hora_inicio, h.hora_fin);

          return (
            <View key={dia.num} style={[s.diaCard, invalido && s.diaCardError, !h.activo && s.diaCardInactive]}>
              {/* Fila principal: día + toggle */}
              <View style={s.diaRow}>
                <View style={s.diaLabel}>
                  <View style={[s.diaBadge, h.activo ? s.diaBadgeActivo : s.diaBadgeInactivo]}>
                    <Text style={[s.diaBadgeText, h.activo ? s.diaBadgeTextActivo : s.diaBadgeTextInactivo]}>
                      {dia.short}
                    </Text>
                  </View>
                  <Text style={[s.diaNombre, !h.activo && { color: '#AAA' }]}>{dia.nombre}</Text>
                </View>

                <View style={s.diaRight}>
                  {!h.activo && <Text style={s.cerradoText}>Cerrado</Text>}
                  <Switch
                    value={h.activo}
                    onValueChange={v => actualizar(dia.num, 'activo', v)}
                    trackColor={{ false: '#E5E7EB', true: colors.primary + '80' }}
                    thumbColor={h.activo ? colors.primary : '#9CA3AF'}
                  />
                </View>
              </View>

              {/* Horas (solo si está activo) */}
              {h.activo && (
                <View style={s.horasRow}>
                  <View style={s.horaGroup}>
                    <Text style={s.horaLabel}>Apertura</Text>
                    <TextInput
                      style={[s.horaInput, invalido && !esHoraValida(h.hora_inicio) && s.horaInputError]}
                      value={h.hora_inicio}
                      onChangeText={v => actualizar(dia.num, 'hora_inicio', v)}
                      placeholder="08:00"
                      placeholderTextColor="#CCC"
                      maxLength={5}
                      keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'}
                    />
                  </View>

                  <View style={s.horaArrow}>
                    <Feather name="arrow-right" size={16} color="#9CA3AF" />
                  </View>

                  <View style={s.horaGroup}>
                    <Text style={s.horaLabel}>Cierre</Text>
                    <TextInput
                      style={[s.horaInput, invalido && !esHoraValida(h.hora_fin) && s.horaInputError]}
                      value={h.hora_fin}
                      onChangeText={v => actualizar(dia.num, 'hora_fin', v)}
                      placeholder="18:00"
                      placeholderTextColor="#CCC"
                      maxLength={5}
                      keyboardType={Platform.OS === 'web' ? 'default' : 'numeric'}
                    />
                  </View>

                  {invalido && (
                    <Text style={s.horaError}>
                      {!esHoraValida(h.hora_inicio) || !esHoraValida(h.hora_fin)
                        ? 'Usa formato HH:MM'
                        : 'Apertura debe ser antes del cierre'}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Botón guardar inferior (redundante con el del header, pero más visible) */}
        <TouchableOpacity
          style={[s.btnGuardar, guardado && s.btnGuardadoDone]}
          onPress={guardar}
          disabled={guardando}
        >
          {guardando
            ? <ActivityIndicator color="#FFF" />
            : <>
                <Feather name={guardado ? 'check-circle' : 'save'} size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={s.btnGuardarText}>{guardado ? '¡Guardado!' : 'Guardar horarios'}</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={s.footerHint}>
          💡 Los cambios se aplican inmediatamente para nuevas reservas. Las citas existentes no se modifican.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 20 : 50, paddingBottom: 16,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  saveBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  saveBtnDone: { backgroundColor: '#10B981' },

  scroll: { padding: 16, paddingBottom: 60 },

  infoBox: {
    flexDirection: 'row', backgroundColor: colors.primary + '10',
    borderRadius: 12, padding: 14, marginBottom: 20, alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, color: colors.primary, lineHeight: 20 },

  diaCard: {
    backgroundColor: '#FFF', borderRadius: 16, marginBottom: 12,
    padding: 16, borderWidth: 1.5, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  diaCardError: { borderColor: '#FCA5A5' },
  diaCardInactive: { backgroundColor: '#FAFAFA', borderColor: '#F1F5F9' },

  diaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  diaLabel: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  diaBadge: {
    width: 44, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  diaBadgeActivo:   { backgroundColor: colors.primary + '18' },
  diaBadgeInactivo: { backgroundColor: '#F3F4F6' },
  diaBadgeText:     { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  diaBadgeTextActivo:   { color: colors.primary },
  diaBadgeTextInactivo: { color: '#9CA3AF' },

  diaNombre:   { fontSize: 16, fontWeight: '600', color: '#1E293B' },

  diaRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cerradoText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  horasRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 14,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9',
    flexWrap: 'wrap', gap: 8,
  },
  horaGroup: { flex: 1, minWidth: 100 },
  horaLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  horaInput: {
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'center',
  },
  horaInputError: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  horaArrow: { paddingTop: 22, paddingHorizontal: 4 },
  horaError: { width: '100%', fontSize: 12, color: '#EF4444', marginTop: 4, fontWeight: '500' },

  btnGuardar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 30,
    paddingVertical: 16, marginTop: 8,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  btnGuardadoDone: { backgroundColor: '#10B981' },
  btnGuardarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  footerHint: {
    textAlign: 'center', color: '#94A3B8', fontSize: 13, lineHeight: 20,
    marginTop: 20, paddingHorizontal: 10,
  },
});
