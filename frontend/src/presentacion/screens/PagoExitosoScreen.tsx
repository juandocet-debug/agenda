import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  Animated, ScrollView, Platform, Dimensions, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { API_BASE as API } from '../../core/config/api';

const { width, height } = Dimensions.get('window');

// ── Pieza de confeti animada ──────────────────────────────────────────────────
const CONFETTI_EMOJIS = ['🎊', '🎉', '✨', '🌟', '💛', '🎈', '🎀', '⭐'];

const ConfettiPiece = ({ delay, x, emoji }: { delay: number; x: number; emoji: string }) => {
  const y = useRef(new Animated.Value(-40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(y, { toValue: height * 0.85, duration: 3500 + delay * 0.3, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1, duration: 3000, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        fontSize: 22,
        transform: [{ translateY: y }, { rotate: spin }],
        opacity,
        zIndex: 10,
      }}
    >
      {emoji}
    </Animated.Text>
  );
};

// ── Pantalla principal ────────────────────────────────────────────────────────
export const PagoExitosoScreen = ({ route, navigation }: any) => {
  const { citaId } = route.params || {};
  const [empresaId, setEmpresaId] = useState('');
  const [verificando, setVerificando] = useState(true);
  const [estadoPago, setEstadoPago] = useState<'CONFIRMADA' | 'PENDIENTE' | 'ERROR'>('PENDIENTE');

  const checkAnim  = useRef(new Animated.Value(0)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;

  const codigoCita = (citaId && citaId !== 'undefined') ? citaId.toString().split('-')[0].toUpperCase() : '';

  // ── Verificación automática: fallback en caso de que el webhook falló ────────
  const verificarPago = async (id: string) => {
    if (!id || id === 'undefined') { setVerificando(false); return; }
    try {
      const resp = await fetch(`${API}/api/citas/pago/verificar/?cita_id=${id}`);
      const data = await resp.json();
      if (data.ok && data.estado === 'CONFIRMADA') {
        setEstadoPago('CONFIRMADA');
      } else {
        setEstadoPago('PENDIENTE');
      }
    } catch {
      setEstadoPago('ERROR');
    } finally {
      setVerificando(false);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('ultima_empresa_id').then(id => { if (id) setEmpresaId(id); });

    // Verificar pago automáticamente al llegar a esta pantalla
    if (citaId && citaId !== 'undefined') {
      verificarPago(citaId);
    } else {
      setVerificando(false);
    }

    // Secuencia de entrada
    Animated.sequence([
      Animated.spring(checkAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);


  // Generar confeti
  const confetti = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * (width - 30),
    delay: i * 180,
    emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
  }));

  return (
    <SafeAreaView style={s.root}>
      {/* Confeti */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {confetti.map(c => (
          <ConfettiPiece key={c.id} x={c.x} delay={c.delay} emoji={c.emoji} />
        ))}
      </View>

      {/* Fondo decorativo superior */}
      <View style={s.bgTop}>
        <View style={s.circle1} />
        <View style={s.circle2} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Ícono animado ── */}
        <Animated.View style={[s.iconWrapper, { transform: [{ scale: checkAnim }] }]}>
          <Text style={s.iconEmoji}>🎉</Text>
        </Animated.View>

        {/* ── Textos ── */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={s.title}>¡Felicitaciones!</Text>
          <Text style={s.subtitle}>
            Acabas de adquirir una experiencia.{'\n'}Tu cita ha sido confirmada y te estamos esperando.
          </Text>
        </Animated.View>

        {/* ── Código de reserva ── */}
        {codigoCita ? (
          <Animated.View style={[s.codeCard, { opacity: fadeAnim }]}>
            <Text style={s.codeLabel}>CÓDIGO DE RESERVA</Text>
            <Text style={s.codeText}>{codigoCita}</Text>
            <View style={s.confirmedBadge}>
              <View style={s.confirmedDot} />
              <Text style={s.confirmedText}>CONFIRMADA</Text>
            </View>
          </Animated.View>
        ) : null}

        {/* ── Info box ── */}
        <Animated.View style={[s.infoBox, { opacity: fadeAnim }]}>
          <Feather name="mail" size={18} color="#059669" />
          <Text style={s.infoText}>
            Recibirás un correo con todos los detalles de tu reserva.
          </Text>
        </Animated.View>

        {/* ── Botones ── */}
        <Animated.View style={[s.actionsContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={s.btnPrimary}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'ClienteHome' }] })}
          >
            <Feather name="calendar" size={18} color="#FFF" />
            <Text style={s.btnPrimaryText}>Ver mis citas</Text>
          </TouchableOpacity>

          {empresaId ? (
            <TouchableOpacity
              style={s.btnSecondary}
              onPress={() => navigation.navigate('AgendarPublico', { empresaId })}
            >
              <Text style={s.btnSecondaryText}>Volver al inicio</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F9FF' },

  bgTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 300,
    backgroundColor: '#0F172A', borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', top: -50, right: -30, width: 200, height: 200,
    borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  circle2: {
    position: 'absolute', bottom: 20, left: -50, width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.03)',
  },

  scroll: { paddingHorizontal: 24, paddingTop: 70, paddingBottom: 60, alignItems: 'center' },

  iconWrapper: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(52, 211, 153, 0.4)',
    marginBottom: 24,
  },
  iconEmoji: { fontSize: 48 },

  title: {
    fontSize: 34, fontWeight: '700', color: '#FFFFFF',
    textAlign: 'center', marginBottom: 10, letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15, color: '#94A3B8', textAlign: 'center',
    lineHeight: 24, paddingHorizontal: 16, marginBottom: 36,
  },

  codeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, width: '100%',
    padding: 28, alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
  },
  codeLabel: {
    fontSize: 11, fontWeight: '600', color: '#94A3B8',
    letterSpacing: 1.5, marginBottom: 8,
  },
  codeText: {
    fontSize: 44, fontWeight: '700', color: '#0F172A',
    letterSpacing: 5, marginBottom: 16,
  },
  confirmedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: '#A7F3D0',
  },
  confirmedDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#10B981', marginRight: 6,
  },
  confirmedText: { fontSize: 11, fontWeight: '600', color: '#059669', letterSpacing: 0.5 },

  infoBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#A7F3D0', width: '100%', marginBottom: 28, gap: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: '#065F46', lineHeight: 20 },

  actionsContainer: { width: '100%', gap: 12 },
  btnPrimary: {
    backgroundColor: '#0F172A', flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 10,
    paddingVertical: 18, borderRadius: 16,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  btnSecondary: {
    paddingVertical: 15, borderRadius: 16, alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  btnSecondaryText: { color: '#475569', fontSize: 15, fontWeight: '500' },
});
