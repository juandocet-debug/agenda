/**
 * HorariosConfigScreen.tsx — Configuración de horarios de la empresa.
 * Rediseño Premium: Glassmorphism, animaciones y tipografías envolventes.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, Switch, ActivityIndicator, Alert, Platform, LayoutAnimation, UIManager
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, shadows } from '../theme/colors';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { HorarioDia } from '../../core/domain/citas/IHorarioRepository';
import { DjangoHorarioRepository } from '../../core/infraestructura/citas/DjangoHorarioRepository';
import { ObtenerHorariosCasoUso } from '../../core/aplicacion/citas/ObtenerHorariosCasoUso';
import { GuardarHorariosCasoUso } from '../../core/aplicacion/citas/GuardarHorariosCasoUso';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const [expandido, setExpandido] = useState<number | null>(null);

  const empresaIdRef = useRef<string | null>(null);
  const tokenRef     = useRef<string | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargarHorarios = useCallback(async () => {
    try {
      setLoading(true);
      setErrorCarga(null);
      const token = await obtenerTokenLocal();
      if (!token || !token.access) { 
        setErrorCarga('Sesión expirada. Vuelve a iniciar sesión.'); 
        return; 
      }
      tokenRef.current = token.access;

      const empId = token.usuario_id || token.id ||
        (() => {
          try {
            const b64 = token.access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(b64)).user_id;
          } catch { return null; }
        })();

      if (!empId) { setErrorCarga(`No se pudo identificar tu empresa. Token: ${JSON.stringify(token)}`); return; }

      empresaIdRef.current = empId;
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
    } catch (e: any) {
      const msg = e?.name === 'AbortError'
        ? 'El servidor tardó demasiado. Toca aquí para reintentar.'
        : 'No se pudieron cargar los horarios. Toca aquí para reintentar.';
      setErrorCarga(msg);
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const h = horarios.find(x => x.dia_semana === diaNum)!;
    if (!h.activo) {
      actualizar(diaNum, 'activo', true);
      setExpandido(diaNum);
    } else {
      actualizar(diaNum, 'activo', false);
      if (expandido === diaNum) setExpandido(null);
    }
  };

  const handleExpand = (diaNum: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandido(expandido === diaNum ? null : diaNum);
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
      setTimeout(() => setGuardado(false), 3000); // Volver al estado normal después de 3s
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  if (loading || errorCarga) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="chevron-left" size={28} color="#1E293B" />
          </TouchableOpacity>
        </View>
        <View style={styles.centerBox}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <>
              <Feather name="wifi-off" size={48} color="#CBD5E1" />
              <Text style={styles.errorTextMsg}>{errorCarga}</Text>
              <TouchableOpacity style={styles.btnRetry} onPress={cargarHorarios}>
                <Text style={styles.btnRetryText}>Reintentar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Premium */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={28} color="#1E293B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Horarios de Atención</Text>
          <Text style={styles.headerSubtitle}>Define cuándo estás disponible</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.infoPill}>
          <Feather name="clock" size={16} color={colors.primary} />
          <Text style={styles.infoPillText}>Activa los días y personaliza tus jornadas.</Text>
        </View>

        {/* Tarjetas de Días */}
        {DIAS.map(dia => {
          const h = horarios.find(x => x.dia_semana === dia.num)!;
          const abierto = expandido === dia.num;
          const invalido = h.activo && !horasValidas(h.hora_inicio, h.hora_fin);

          return (
            <View key={dia.num} style={[styles.dayCard, !h.activo && styles.dayCardInactive, invalido && styles.dayCardError]}>
              
              <TouchableOpacity 
                style={styles.dayRow} 
                onPress={() => h.activo && handleExpand(dia.num)}
                activeOpacity={h.activo ? 0.7 : 1}
              >
                <View style={[styles.statusIndicator, h.activo ? styles.statusIndicatorActive : styles.statusIndicatorInactive]} />
                
                <View style={styles.dayInfo}>
                  <Text style={[styles.dayName, !h.activo && styles.dayNameInactive]}>{dia.nombre}</Text>
                  {h.activo && !abierto && (
                    <Text style={styles.daySummary}>{h.hora_inicio} — {h.hora_fin}</Text>
                  )}
                  {!h.activo && <Text style={styles.daySummaryClosed}>Cerrado</Text>}
                </View>

                <View style={styles.dayControls}>
                  <Switch
                    value={h.activo}
                    onValueChange={() => toggleDia(dia.num)}
                    trackColor={{ false: '#E2E8F0', true: colors.primary + '80' }}
                    thumbColor={h.activo ? colors.primary : '#F8FAFC'}
                  />
                  {h.activo && (
                    <View style={[styles.chevronBox, abierto && styles.chevronBoxActive]}>
                      <Feather name={abierto ? "chevron-up" : "chevron-down"} size={20} color={abierto ? "#FFF" : colors.primary} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Panel de Edición de Horas (Expandido) */}
              {abierto && h.activo && (
                <View style={styles.timeEditor}>
                  <View style={styles.timeBlock}>
                    <View style={styles.timeHeader}>
                      <Feather name="sun" size={14} color="#F59E0B" />
                      <Text style={styles.timeLabel}>APERTURA</Text>
                    </View>
                    <TextInput
                      style={[styles.timeInput, invalido && !horasValidas(h.hora_inicio, h.hora_fin) && styles.timeInputError]}
                      value={h.hora_inicio}
                      onChangeText={v => actualizar(dia.num, 'hora_inicio', v)}
                      placeholder="08:00"
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>

                  <View style={styles.timeDivider}>
                    <Feather name="arrow-right" size={20} color="#CBD5E1" />
                  </View>

                  <View style={styles.timeBlock}>
                    <View style={styles.timeHeader}>
                      <Feather name="moon" size={14} color="#6366F1" />
                      <Text style={styles.timeLabel}>CIERRE</Text>
                    </View>
                    <TextInput
                      style={[styles.timeInput, invalido && !horasValidas(h.hora_inicio, h.hora_fin) && styles.timeInputError]}
                      value={h.hora_fin}
                      onChangeText={v => actualizar(dia.num, 'hora_fin', v)}
                      placeholder="18:00"
                      maxLength={5}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              )}
              {invalido && abierto && (
                <View style={styles.errorBanner}>
                  <Feather name="alert-triangle" size={14} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerTxt}>La hora de apertura debe ser antes del cierre.</Text>
                </View>
              )}

            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Save Button */}
      <View style={styles.floatingFooter}>
        <TouchableOpacity 
          style={[styles.saveFab, guardado && styles.saveFabDone]} 
          onPress={guardar} 
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Feather name={guardado ? 'check' : 'save'} size={22} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveFabTxt}>{guardado ? '¡Guardado!' : 'Guardar Cambios'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 40,
    paddingBottom: 24,
    backgroundColor: '#F4F6F9',
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', ...shadows.soft },
  headerTitle: { fontSize: 24, fontWeight: '500', color: '#1E293B', textAlign: 'center' },
  headerSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 4 },

  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  errorTextMsg: { fontSize: 15, color: '#64748B', textAlign: 'center', marginTop: 16, lineHeight: 22 },
  btnRetry: { marginTop: 24, backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30, ...shadows.medium },
  btnRetryText: { color: '#FFF', fontWeight: '500', fontSize: 15 },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  
  infoPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76, 91, 238, 0.1)', alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginBottom: 24 },
  infoPillText: { fontSize: 13, fontWeight: '500', color: colors.primary, marginLeft: 8 },

  dayCard: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 16, ...shadows.medium, borderWidth: 1, borderColor: '#F8FAFC', overflow: 'hidden' },
  dayCardInactive: { opacity: 0.6, elevation: 1, shadowOpacity: 0.02 },
  dayCardError: { borderColor: '#FCA5A5', borderWidth: 2 },

  dayRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  statusIndicator: { width: 6, height: 32, borderRadius: 4, marginRight: 16 },
  statusIndicatorActive: { backgroundColor: colors.primary },
  statusIndicatorInactive: { backgroundColor: '#E2E8F0' },

  dayInfo: { flex: 1 },
  dayName: { fontSize: 18, fontWeight: '500', color: '#1E293B' },
  dayNameInactive: { color: '#94A3B8' },
  daySummary: { fontSize: 13, fontWeight: '500', color: colors.primary, marginTop: 4 },
  daySummaryClosed: { fontSize: 13, fontWeight: '500', color: '#94A3B8', marginTop: 4 },

  dayControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chevronBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(76, 91, 238, 0.1)', justifyContent: 'center', alignItems: 'center' },
  chevronBoxActive: { backgroundColor: colors.primary },

  timeEditor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 24, paddingTop: 4 },
  timeBlock: { flex: 1, alignItems: 'center', backgroundColor: '#F8FAFC', paddingVertical: 16, borderRadius: 16 },
  timeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  timeLabel: { fontSize: 11, fontWeight: '500', color: '#64748B', letterSpacing: 1 },
  timeInput: { fontSize: 26, fontWeight: '500', color: '#1E293B', textAlign: 'center' },
  timeInputError: { color: '#EF4444' },
  
  timeDivider: { paddingHorizontal: 16 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 20, paddingVertical: 12 },
  errorBannerTxt: { fontSize: 12, fontWeight: '500', color: '#EF4444' },

  floatingFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, backgroundColor: 'transparent' },
  saveFab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, height: 60, borderRadius: 30, ...shadows.strong },
  saveFabDone: { backgroundColor: '#10B981' },
  saveFabTxt: { color: '#FFF', fontSize: 17, fontWeight: '500', letterSpacing: 0.5 },
});
