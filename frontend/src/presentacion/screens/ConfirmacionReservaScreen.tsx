import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, SafeAreaView, ScrollView, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export const ConfirmacionReservaScreen = ({ route, navigation }: any) => {
  const { citaId, checkoutUrl, resumen, empresaId } = route.params || {};
  const [abriendo, setAbriendo] = useState(false);

  const abrirPago = async () => {
    if (!checkoutUrl) return;
    setAbriendo(true);
    try {
      if (Platform.OS === 'web') {
        window.open(checkoutUrl, '_blank');
      } else {
        await Linking.openURL(checkoutUrl);
      }
    } catch {
      alert('No se pudo abrir la página de pago.');
    } finally {
      setAbriendo(false);
    }
  };

  const codigoCita = citaId ? citaId.split('-')[0].toUpperCase() : 'XXXX';

  return (
    <SafeAreaView style={s.root}>
      {/* Fondo superior decorativo */}
      <View style={s.headerBg}>
        <View style={s.circleDecoration1} />
        <View style={s.circleDecoration2} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header Content */}
        <View style={s.headerContent}>
          <View style={s.iconWrapper}>
            <Feather name="check" size={32} color="#FFF" />
          </View>
          <Text style={s.title}>Cita Separada</Text>
          <Text style={s.subtitle}>
            Tu espacio ha sido reservado. Completa el pago para asegurar tu asistencia.
          </Text>
        </View>

        {/* Ticket Card */}
        <View style={s.ticketContainer}>
          <View style={s.ticketTop}>
            <Text style={s.ticketHeaderLabel}>CÓDIGO DE RESERVA</Text>
            <Text style={s.codeText}>{codigoCita}</Text>
            <View style={s.badgeContainer}>
              <View style={s.badgeDot} />
              <Text style={s.badgeText}>PENDIENTE DE PAGO</Text>
            </View>
          </View>

          {/* Línea divisoria estilo ticket */}
          <View style={s.ticketDivider}>
            <View style={s.notchLeft} />
            <View style={s.dashedLine} />
            <View style={s.notchRight} />
          </View>

          <View style={s.ticketBottom}>
            {resumen ? (
              <View style={s.detailsGrid}>
                <DetailItem label="Servicio" value={resumen.servicio_nombre} />
                <DetailItem label="Fecha" value={resumen.fecha} />
                <DetailItem label="Horario" value={`${resumen.hora_inicio} - ${resumen.hora_fin}`} />
                <DetailItem label="Total a Pagar" value={`$ ${Number(resumen.monto_total).toLocaleString('es-CO')} COP`} isHighlight />
              </View>
            ) : (
              <Text style={s.placeholderText}>Cargando detalles...</Text>
            )}
          </View>
        </View>

        {/* Info Box */}
        <View style={s.infoBox}>
          <Feather name="info" size={18} color="#2563EB" style={s.infoIcon} />
          <Text style={s.infoText}>
            Tienes <Text style={{ fontWeight: '500' }}>30 minutos</Text> para realizar el pago antes de que el espacio sea liberado.
          </Text>
        </View>

        {/* Acciones */}
        <View style={s.actionContainer}>
          {checkoutUrl && (
            <TouchableOpacity 
              style={s.btnPrimary} 
              onPress={abrirPago} 
              disabled={abriendo} 
              activeOpacity={0.8}
            >
              <Text style={s.btnPrimaryText}>
                {abriendo ? 'Redirigiendo...' : 'Pagar de forma segura'}
              </Text>
              {!abriendo && <Feather name="arrow-right" size={20} color="#FFF" />}
            </TouchableOpacity>
          )}

          {/* Ir al dashboard del cliente */}
          <TouchableOpacity
            style={s.btnCliente}
            onPress={() => navigation.navigate('ClienteHome')}
            activeOpacity={0.8}
          >
            <Feather name="user" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={s.btnClienteTxt}>Ver mis reservas</Text>
          </TouchableOpacity>

          {/* Volver al agendador público — NO al admin */}
          <TouchableOpacity
            style={s.btnSecondary}
            onPress={async () => {
              // Si viene del link de empresa, vuelve ahí; si no, solo goBack
              const id = empresaId || resumen?.empresa_id;
              if (id) {
                navigation.navigate('AgendarPublico', { empresaId: id });
              } else {
                navigation.goBack();
              }
            }}
            activeOpacity={0.6}
          >
            <Text style={s.btnSecondaryText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const DetailItem = ({ label, value, isHighlight = false }: any) => (
  <View style={s.detailItem}>
    <Text style={s.detailLabel}>{label}</Text>
    <Text style={[s.detailValue, isHighlight && s.detailHighlight]}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  
  headerBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 320,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  circleDecoration1: {
    position: 'absolute', top: -50, right: -20,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  circleDecoration2: {
    position: 'absolute', top: 120, left: -60,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },

  scrollContainer: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },

  headerContent: { alignItems: 'center', marginBottom: 30 },
  iconWrapper: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(34, 197, 94, 0.2)', // Verde suave translúcido
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.5)',
  },
  title: { fontSize: 28, fontWeight: '500', color: '#FFFFFF', marginBottom: 8, letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },

  ticketContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 8,
    marginBottom: 24,
  },
  ticketTop: { padding: 30, alignItems: 'center' },
  ticketHeaderLabel: { fontSize: 11, fontWeight: '500', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 8 },
  codeText: { fontSize: 42, fontWeight: '500', color: '#0F172A', letterSpacing: 4, marginBottom: 16 },
  badgeContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D97706', marginRight: 6 },
  badgeText: { fontSize: 11, fontWeight: '500', color: '#D97706', letterSpacing: 0.5 },

  ticketDivider: { height: 1, position: 'relative', justifyContent: 'center', marginVertical: 0 },
  dashedLine: {
    position: 'absolute', left: 20, right: 20,
    height: 1, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  notchLeft: {
    position: 'absolute', left: -10,
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#F0F4F8',
  },
  notchRight: {
    position: 'absolute', right: -10,
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#F0F4F8',
  },

  ticketBottom: { padding: 30 },
  detailsGrid: { gap: 16 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#1E293B', fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 10 },
  detailHighlight: { fontSize: 16, color: '#2563EB', fontWeight: '500' },
  placeholderText: { textAlign: 'center', color: '#94A3B8', fontStyle: 'italic' },

  infoBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#BFDBFE',
    marginBottom: 30,
  },
  infoIcon: { marginRight: 12 },
  infoText: { flex: 1, fontSize: 13, color: '#1D4ED8', lineHeight: 20 },

  actionContainer: { gap: 12 },
  btnPrimary: {
    backgroundColor: '#0F172A',
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    paddingVertical: 18, borderRadius: 16,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  
  btnSecondary: {
    paddingVertical: 16, borderRadius: 16, alignItems: 'center',
    backgroundColor: 'transparent',
  },
  btnSecondaryText: { color: '#64748B', fontSize: 15, fontWeight: '500' },
  btnCliente: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 16,
    borderWidth: 1.5, borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
  },
  btnClienteTxt: { color: colors.primary, fontSize: 15, fontWeight: '500' },
});
