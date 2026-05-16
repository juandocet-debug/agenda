/**
 * ExplorarEmpresasScreen — Catálogo público de empresas.
 * Diseño premium: tarjetas verticales full-width con imagen de portada,
 * avatar flotante, metadatos y botón de reserva.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  TouchableOpacity, TextInput, ActivityIndicator, Image,
  Platform, RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '../theme/colors';

const API = 'https://agenda-production-ae37.up.railway.app';

interface EmpresaPublica {
  id: string;
  nombre: string;
  logo_url: string;
  foto_portada_url: string;
  ciudad: string;
  direccion: string;
  telefono: string;
}

// ─── Avatar inicial ─────────────────────────────────────────────────────────────
const AvatarLetra = ({ nombre }: { nombre: string }) => (
  <View style={s.avatarLetra}>
    <Text style={s.avatarLetraTxt}>{nombre?.charAt(0)?.toUpperCase() || 'E'}</Text>
  </View>
);

// ─── Tarjeta de empresa (vertical, full-width) ──────────────────────────────────
const EmpresaCard = ({
  empresa, onReservar, onVerMuro,
}: {
  empresa: EmpresaPublica;
  onReservar: (id: string) => void;
  onVerMuro: (id: string) => void;
}) => (
  <TouchableOpacity
    style={s.card}
    activeOpacity={0.92}
    onPress={() => onVerMuro(empresa.id)}
  >
    {/* Imagen de portada */}
    <View style={s.portadaWrap}>
      {empresa.foto_portada_url ? (
        <Image
          source={{ uri: empresa.foto_portada_url }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[colors.primary, '#2635c5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {/* Overlay sutil */}
      <View style={s.portadaOverlay} />
      {/* Badge activa */}
      <View style={s.badgeActiva}>
        <View style={s.badgeDot} />
        <Text style={s.badgeTxt}>Activa</Text>
      </View>
    </View>

    {/* Cuerpo de la tarjeta */}
    <View style={s.cardBody}>
      {/* Avatar flotante */}
      <View style={s.avatarWrap}>
        {empresa.logo_url ? (
          <Image source={{ uri: empresa.logo_url }} style={s.avatarImg} />
        ) : (
          <AvatarLetra nombre={empresa.nombre} />
        )}
      </View>

      {/* Info */}
      <View style={s.infoCol}>
        <Text style={s.cardNombre} numberOfLines={1}>{empresa.nombre}</Text>

        <View style={s.metasRow}>
          {empresa.ciudad ? (
            <View style={s.metaChip}>
              <Feather name="map-pin" size={11} color={colors.primary} />
              <Text style={s.metaChipTxt}>{empresa.ciudad}</Text>
            </View>
          ) : null}
          {empresa.telefono ? (
            <View style={s.metaChip}>
              <Feather name="phone" size={11} color={colors.primary} />
              <Text style={s.metaChipTxt}>{empresa.telefono}</Text>
            </View>
          ) : null}
        </View>

        {empresa.direccion ? (
          <View style={s.dirRow}>
            <Feather name="navigation" size={11} color="#94A3B8" />
            <Text style={s.dirTxt} numberOfLines={1}>{empresa.direccion}</Text>
          </View>
        ) : null}
      </View>

      {/* Botón reservar */}
      <TouchableOpacity
        style={s.reservarBtn}
        onPress={() => onReservar(empresa.id)}
        activeOpacity={0.85}
      >
        <Feather name="calendar" size={15} color="#FFF" />
        <Text style={s.reservarTxt}>Reservar</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

// ─── Pantalla principal ─────────────────────────────────────────────────────────
export const ExplorarEmpresasScreen = ({ navigation }: any) => {
  const [empresas, setEmpresas]   = useState<EmpresaPublica[]>([]);
  const [filtradas, setFiltradas] = useState<EmpresaPublica[]>([]);
  const [busqueda, setBusqueda]   = useState('');
  const [cargando, setCargando]   = useState(false);
  const [refresco, setRefresco]   = useState(false);
  const [error, setError]         = useState('');

  const cargar = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError('');
    try {
      const res  = await fetch(`${API}/api/empresas/publicas/`);
      const data = await res.json();
      if (data.ok) {
        setEmpresas(data.datos);
        setFiltradas(data.datos);
      } else {
        setError('No se pudieron cargar las empresas.');
      }
    } catch {
      setError('Sin conexión al servidor.');
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
            (e.ciudad || '').toLowerCase().includes(q),
        ),
      );
    }
  };

  const onReservar = (id: string) => navigation.navigate('AgendarPublico', { empresaId: id });
  const onVerMuro  = (id: string) => navigation.navigate('MuroPublicaciones', { empresaId: id });

  return (
    <SafeAreaView style={s.root}>

      {/* ── Header gradiente ── */}
      <LinearGradient
        colors={[colors.primary, '#2635c5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        {/* Círculos decorativos */}
        <View style={s.decoBig} />
        <View style={s.decoSmall} />

        <View style={s.headerRow}>
          {navigation.canGoBack() && (
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1, marginLeft: navigation.canGoBack() ? 14 : 0 }}>
            <Text style={s.headerTitle}>Explorar</Text>
            <Text style={s.headerSub}>Descubre y reserva servicios</Text>
          </View>
          <View style={s.headerIcon}>
            <Feather name="compass" size={22} color="#FFF" />
          </View>
        </View>

        {/* Buscador */}
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
          <Feather name="wifi-off" size={44} color="#CBD5E1" />
          <Text style={s.emptyTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => cargar()}>
            <Text style={s.retryTxt}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refresco}
              onRefresh={() => { setRefresco(true); cargar(true); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={() => (
            <View style={s.center}>
              <Feather name="search" size={44} color="#CBD5E1" />
              <Text style={s.emptyTxt}>
                {busqueda ? 'Sin resultados para tu búsqueda' : 'Sin empresas disponibles'}
              </Text>
              <Text style={s.emptySub}>
                {busqueda ? 'Prueba con otro nombre o ciudad' : 'Pronto habrá más opciones'}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <EmpresaCard empresa={item} onReservar={onReservar} onVerMuro={onVerMuro} />
          )}
        />
      )}
    </SafeAreaView>
  );
};

// ─── Estilos ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F1F5F9' },

  // Header
  header: {
    paddingTop:    Platform.OS === 'web' ? 24 : 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius:  28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  decoBig: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)', top: -70, right: -50,
  },
  decoSmall: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: 0, left: -30,
  },
  headerRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, color: '#FFF', fontWeight: '600' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical:   Platform.OS === 'web' ? 12 : 10,
    ...shadows.soft,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: '#1E293B',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },

  // Lista
  listContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 48 },

  // Tarjeta vertical
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    ...shadows.medium,
  },
  portadaWrap: { height: 130, position: 'relative' },
  portadaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,25,80,0.22)',
  },
  badgeActiva: {
    position: 'absolute', bottom: 10, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  badgeDot:  { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4ADE80' },
  badgeTxt:  { fontSize: 11, color: '#FFF', fontWeight: '600' },

  // Cuerpo
  cardBody: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
    gap: 12,
  },
  avatarWrap: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2.5, borderColor: '#FFF',
    backgroundColor: '#FFF', overflow: 'hidden',
    ...shadows.soft,
    flexShrink: 0,
  },
  avatarImg:    { width: '100%', height: '100%' },
  avatarLetra: {
    flex: 1, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarLetraTxt: { fontSize: 22, color: '#FFF', fontWeight: '600' },

  infoCol: { flex: 1 },
  cardNombre: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 6 },

  metasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(76,91,238,0.08)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  metaChipTxt: { fontSize: 11, color: colors.primary, fontWeight: '500' },

  dirRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dirTxt: { fontSize: 11, color: '#94A3B8', flex: 1 },

  // Botón
  reservarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
    flexShrink: 0,
  },
  reservarTxt: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  // Estados
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  emptyTxt:   { fontSize: 15, fontWeight: '500', color: '#94A3B8', textAlign: 'center' },
  emptySub:   { fontSize: 13, color: '#CBD5E1', textAlign: 'center' },
  loadingTxt: { fontSize: 14, color: '#94A3B8', marginTop: 8 },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 12, marginTop: 4,
  },
  retryTxt: { color: '#FFF', fontWeight: '600' },
});
