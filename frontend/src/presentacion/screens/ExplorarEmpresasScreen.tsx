/**
 * ExplorarEmpresasScreen — Capa Presentación.
 *
 * Muestra el catálogo público de empresas activas en la plataforma.
 * El cliente puede ver datos de la empresa y navegar directamente a su
 * agendador público sin necesidad de autenticación.
 *
 * ARQUITECTURA HEXAGONAL:
 *   - No llama a la BD directamente.
 *   - Consume el endpoint público GET /api/empresas/publicas/
 *     (sin JWT — AllowAny en backend).
 *   - La pantalla solo gestiona estado de UI y navegación.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  TouchableOpacity, TextInput, ActivityIndicator, Image,
  Animated, Platform, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '../theme/colors';


interface EmpresaPublica {
  id: string;
  nombre: string;
  logo_url: string;
  foto_portada_url: string;
  ciudad: string;
  direccion: string;
  telefono: string;
}

// ─── Avatar inicial ────────────────────────────────────────────────────────────
const AvatarLetra = ({ nombre }: { nombre: string }) => (
  <View style={s.avatarLetra}>
    <Text style={s.avatarLetraTxt}>
      {nombre?.charAt(0)?.toUpperCase() || 'E'}
    </Text>
  </View>
);

// ─── Tarjeta de empresa ─────────────────────────────────────────────────────────
const EmpresaCard = ({
  empresa, onReservar, onVerMuro
}: {
  empresa: EmpresaPublica;
  onReservar: (id: string) => void;
  onVerMuro: (id: string) => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.975, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <TouchableOpacity style={s.cardWrapper} activeOpacity={0.9} onPress={() => onVerMuro(empresa.id)}>
      <Animated.View style={[s.card, { transform: [{ scale }] }]}>
        {/* Cabecera con gradiente + logo/avatar */}
        <LinearGradient
        colors={[colors.primary, '#2635c5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.cardHeader}
      >
        {empresa.foto_portada_url ? (
          <Image
            source={{ uri: empresa.foto_portada_url }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : null}
        <View style={s.cardHeaderOverlay} />
        <View style={s.cardBadgeRow}>
          <View style={s.activaBadge}>
            <View style={s.activaDot} />
            <Text style={s.activaTxt}>Activa</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Avatar flotante */}
      <View style={s.avatarWrap}>
        {empresa.logo_url ? (
          <Image source={{ uri: empresa.logo_url }} style={s.avatarImg} />
        ) : (
          <AvatarLetra nombre={empresa.nombre} />
        )}
      </View>

      {/* Cuerpo */}
      <View style={s.cardBody}>
        <Text style={s.cardNombre} numberOfLines={1}>{empresa.nombre}</Text>

        {empresa.ciudad ? (
          <View style={s.metaRow}>
            <Feather name="map-pin" size={12} color="#94A3B8" />
            <Text style={s.metaTxt}>{empresa.ciudad}</Text>
          </View>
        ) : null}

        {empresa.direccion ? (
          <View style={s.metaRow}>
            <Feather name="navigation" size={12} color="#94A3B8" />
            <Text style={s.metaTxt} numberOfLines={1}>{empresa.direccion}</Text>
          </View>
        ) : null}

        {empresa.telefono ? (
          <View style={s.metaRow}>
            <Feather name="phone" size={12} color="#94A3B8" />
            <Text style={s.metaTxt}>{empresa.telefono}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={s.reservarBtn}
          onPress={() => onReservar(empresa.id)}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.85}
        >
          <Text style={s.reservarTxt}>Reservar</Text>
        </TouchableOpacity>
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Pantalla principal ─────────────────────────────────────────────────────────
export const ExplorarEmpresasScreen = ({ navigation }: any) => {
  const [empresas, setEmpresas] = useState<EmpresaPublica[]>([]);
  const [filtradas, setFiltradas] = useState<EmpresaPublica[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [refresco, setRefresco] = useState(false);
  const [error, setError] = useState('');

  const cargar = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/empresas/publicas/`);
      const data = await res.json();
      if (data.ok) {
        setEmpresas(data.datos);
        setFiltradas(data.datos);
      } else {
        setError('No se pudieron cargar las empresas.');
      }
    } catch {
      setError('Sin conexión al servidor. Verifica tu red.');
    } finally {
      setCargando(false);
      setRefresco(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const onBuscar = (texto: string) => {
    setBusqueda(texto);
    if (!texto.trim()) {
      setFiltradas(empresas);
    } else {
      const q = texto.toLowerCase();
      setFiltradas(
        empresas.filter(
          e =>
            e.nombre.toLowerCase().includes(q) ||
            e.ciudad.toLowerCase().includes(q),
        ),
      );
    }
  };

  const onReservar = (empresaId: string) => {
    navigation.navigate('AgendarPublico', { empresaId });
  };

  const onVerMuro = (empresaId: string) => {
    navigation.navigate('MuroPublicaciones', { empresaId });
  };

  const renderEmpty = () => (
    <View style={s.emptyWrap}>
      <Feather name="search" size={40} color="#CBD5E1" />
      <Text style={s.emptyTxt}>
        {busqueda ? 'Sin resultados para tu búsqueda' : 'Sin empresas disponibles'}
      </Text>
      <Text style={s.emptySub}>
        {busqueda
          ? 'Prueba con otro nombre o ciudad'
          : 'Pronto habrá más opciones para ti'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[colors.primary, '#2635c5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View style={s.headerDecoBig} />
        <View style={s.headerDecoSmall} />
        <View style={s.headerRow}>
          {navigation.canGoBack() ? (
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={20} color="#FFF" />
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1, marginLeft: navigation.canGoBack() ? 14 : 0 }}>
            <Text style={s.headerTitle}>Explorar</Text>
            <Text style={s.headerSub}>Descubre y reserva</Text>
          </View>
          <View style={s.headerIcon}>
            <Feather name="compass" size={22} color="#FFF" />
          </View>
        </View>

        {/* Barra de búsqueda integrada en el header */}
        <View style={s.searchBar}>
          <Feather name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar por nombre o ciudad…"
            placeholderTextColor="#94A3B8"
            value={busqueda}
            onChangeText={onBuscar}
            returnKeyType="search"
          />
          {busqueda ? (
            <TouchableOpacity onPress={() => onBuscar('')}>
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </LinearGradient>

      {/* ── Contenido ── */}
      {cargando ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingTxt}>Cargando empresas…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#CBD5E1" />
          <Text style={s.emptyTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => cargar()}>
            <Text style={s.retryTxt}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={s.columnWrap}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refresco}
              onRefresh={() => { setRefresco(true); cargar(true); }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <EmpresaCard empresa={item} onReservar={onReservar} onVerMuro={onVerMuro} />
          )}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Estilos ────────────────────────────────────────────────────────────────────
const CARD_W = '48%';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  header: {
    paddingTop: Platform.OS === 'web' ? 24 : 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 8,
  },
  headerDecoBig: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
  },
  headerDecoSmall: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 10, left: -30,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, color: '#FFF', fontWeight: '500' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  headerIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'web' ? 10 : 8,
    ...shadows.soft,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: '#1E293B',
    fontFamily: 'Inter_400Regular',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  columnWrap: { justifyContent: 'space-between', marginBottom: 14 },

  // Card
  cardWrapper: {
    width: CARD_W,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    ...shadows.medium,
  },
  cardHeader: { height: 90, justifyContent: 'flex-end', padding: 10 },
  cardHeaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30,42,100,0.25)',
  },
  cardBadgeRow: { flexDirection: 'row' },
  activaBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  activaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' },
  activaTxt: { fontSize: 10, color: '#FFF', fontWeight: '500' },

  // Avatar flotante
  avatarWrap: {
    position: 'absolute', top: 58, left: 14,
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: '#FFF',
    backgroundColor: '#FFF',
    overflow: 'hidden',
    ...shadows.soft,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarLetra: {
    flex: 1, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetraTxt: { fontSize: 20, color: '#FFF', fontWeight: '500' },

  // Card body
  cardBody: { paddingHorizontal: 12, paddingTop: 32, paddingBottom: 14 },
  cardNombre: { fontSize: 14, fontWeight: '500', color: '#1E293B', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  metaTxt: { fontSize: 11, color: '#64748B', flex: 1 },
  reservarBtn: {
    marginTop: 12, backgroundColor: colors.primary,
    borderRadius: 10, paddingVertical: 9,
    alignItems: 'center',
  },
  reservarTxt: { color: '#FFF', fontSize: 13, fontWeight: '500' },

  // Estados vacíos / errores
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyWrap: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTxt: { fontSize: 15, fontWeight: '500', color: '#94A3B8', textAlign: 'center' },
  emptySub: { fontSize: 13, color: '#CBD5E1', textAlign: 'center' },
  loadingTxt: { fontSize: 14, color: '#94A3B8', marginTop: 8 },
  retryBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 12, marginTop: 8,
  },
  retryTxt: { color: '#FFF', fontWeight: '500' },
});
