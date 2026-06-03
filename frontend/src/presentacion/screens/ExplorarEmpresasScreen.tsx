import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  TouchableOpacity, TextInput, ActivityIndicator, Image,
  Platform, RefreshControl, Dimensions, Animated, ScrollView, Linking
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '../theme/colors';
import { API_BASE as API } from '../../core/config/api';
import { DjangoBannerRepository } from '../../core/infraestructura/banners/DjangoBannerRepository';
import { ObtenerBannersPublicosCasoUso } from '../../core/aplicacion/banners/BannersCasosUso';
import { BannerPublicitario } from '../../core/domain/banners/Banner';

const { width } = Dimensions.get('window');

// ─── Capa Aplicación / Dominio ──────────────────────────────────────────────────
const bannerRepo = new DjangoBannerRepository();
const obtenerBannersCasoUso = new ObtenerBannersPublicosCasoUso(bannerRepo);

interface EmpresaPublica {
  id: string;
  nombre: string;
  logo_url: string;
  foto_portada_url: string;
  ciudad: string;
  direccion: string;
  telefono: string;
}

// ─── Componentes UI ─────────────────────────────────────────────────────────────

const AvatarLetra = ({ nombre }: { nombre: string }) => (
  <View style={s.avatarLetra}>
    <Text style={s.avatarLetraTxt}>{nombre?.charAt(0)?.toUpperCase() || 'E'}</Text>
  </View>
);

const EmpresaHorizontalCard = ({
  empresa, onVerMuro,
}: {
  empresa: EmpresaPublica;
  onVerMuro: (id: string) => void;
}) => (
  <TouchableOpacity
    style={s.horCard}
    activeOpacity={0.8}
    onPress={() => onVerMuro(empresa.id)}
  >
    <View style={s.horPortadaWrap}>
      {empresa.foto_portada_url ? (
        <Image
          source={{ uri: empresa.foto_portada_url }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={[colors.primary, '#1E293B']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {empresa.logo_url ? (
            <Image source={{ uri: empresa.logo_url }} style={s.fallbackLogo} resizeMode="contain" />
          ) : (
            <View style={s.fallbackTextWrap}>
              <Text style={s.fallbackText}>{empresa.nombre.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
      )}
    </View>
    <Text style={s.horCardNombre} numberOfLines={1}>{empresa.nombre}</Text>
  </TouchableOpacity>
);

import { useWindowDimensions } from 'react-native';

const HeroBanner = ({ banners }: { banners: any[] }) => {
  const { width } = useWindowDimensions();
  const bannerWidth = width - 32;
  const bannerHeight = bannerWidth * 0.65;
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= banners.length) nextIndex = 0;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    }, 4000);
    return () => clearInterval(interval);
  }, [currentIndex, banners]);

  if (banners.length === 0) return null;

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={item.link_url ? 0.8 : 1}
      onPress={() => item.link_url && Linking.openURL(item.link_url)}
      style={{ width: bannerWidth, height: bannerHeight, borderRadius: 16, overflow: 'hidden' }}
    >
      <Image source={item.local_source ? item.local_source : { uri: item.imagen_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        locations={[0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={s.bannerContent}>
        <Text style={s.bannerTitle} numberOfLines={2}>{item.titulo}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ marginTop: 16, alignItems: 'center' }}>
      <View style={[s.heroShadow, { width: bannerWidth, height: bannerHeight }]}>
        <FlatList
          ref={flatListRef}
          data={banners}
          keyExtractor={b => b.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
          renderItem={renderItem}
          onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / bannerWidth))}
        />
      </View>
      <View style={s.dotsContainer}>
        {banners.map((_, i) => {
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * bannerWidth, i * bannerWidth, (i + 1) * bannerWidth],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return <Animated.View key={i} style={[s.dot, { opacity }]} />;
        })}
      </View>
    </View>
  );
};

// ─── Pantalla principal ─────────────────────────────────────────────────────────
export const ExplorarEmpresasScreen = ({ navigation }: any) => {
  const [empresas, setEmpresas]   = useState<EmpresaPublica[]>([]);
  const [banners, setBanners]     = useState<BannerPublicitario[]>([]);
  const [busqueda, setBusqueda]   = useState('');
  const [cargando, setCargando]   = useState(false);
  const [refresco, setRefresco]   = useState(false);
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);

  const cargar = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const [bannersRes, empresasRes] = await Promise.all([
        obtenerBannersCasoUso.ejecutar().catch(() => []),
        fetch(`${API}/api/empresas/publicas/`).then(r => r.json()).catch(() => ({ ok: false, datos: [] }))
      ]);

      const bannersFinales = bannersRes && bannersRes.length > 0 ? bannersRes : [{
        id: 'default',
        titulo: 'Encuentra los mejores servicios cerca de ti',
        imagen_url: '',
        local_source: require('../../../assets/images/scheduling_banner.png'),
        link_url: '',
        activo: true
      }];

      setBanners(bannersFinales);
      if (empresasRes.ok) setEmpresas(empresasRes.datos);
      
    } catch {
    } finally {
      setCargando(false);
      setRefresco(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const onVerMuro = (id: string) => navigation.navigate('MuroPublicaciones', { empresaId: id });

  let empresasMostradas = empresas;
  if (busqueda.trim()) {
    const q = busqueda.toLowerCase();
    empresasMostradas = empresas.filter(e => 
      e.nombre.toLowerCase().includes(q) || (e.ciudad || '').toLowerCase().includes(q)
    );
  }

  const destacadas = [...empresasMostradas].reverse().slice(0, 5);
  const populares = [...empresasMostradas].slice(0, 10);
  const cercaDeTi = [...empresasMostradas].filter(e => e.ciudad).slice(0, 8);

  const RowCategoria = ({ titulo, data }: { titulo: string, data: EmpresaPublica[] }) => {
    if (data.length === 0) return null;
    return (
      <View style={s.rowSection}>
        <View style={s.rowHeader}>
          <Text style={s.rowTitle}>{titulo}</Text>
          <Feather name="arrow-right" size={20} color="#1E293B" />
        </View>
        <FlatList
          data={data}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.rowList}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <EmpresaHorizontalCard empresa={item} onVerMuro={onVerMuro} />}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={s.root}>
      {/* ── Header Light Theme ── */}
      <View style={s.lightHeader}>
        <TouchableOpacity style={s.headerBtn}>
          <Feather name="menu" size={24} color="#1E293B" />
        </TouchableOpacity>
        
        <Image source={require('../../../assets/logo3.png')} style={s.lightLogo} resizeMode="contain" />
        
        <TouchableOpacity style={s.headerBtn} onPress={() => setMostrarBusqueda(!mostrarBusqueda)}>
          <Feather name="search" size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>

      {/* ── Barra de Búsqueda Desplegable ── */}
      {mostrarBusqueda && (
        <View style={s.searchBarContainer}>
          <View style={s.searchBarLight}>
            <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={s.searchInputLight}
              placeholder="Busca servicios, empresas..."
              placeholderTextColor="#94A3B8"
              value={busqueda}
              onChangeText={setBusqueda}
              autoFocus
            />
            {busqueda ? (
              <TouchableOpacity onPress={() => setBusqueda('')}>
                <Feather name="x" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refresco} onRefresh={() => { setRefresco(true); cargar(true); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* ── Hero Banner ── */}
        {!busqueda && banners.length > 0 && <HeroBanner banners={banners} />}

        {/* ── Action Buttons ── */}
        {!busqueda && (
          <View style={s.actionButtonsRow}>
            <TouchableOpacity style={s.actionBtn}>
              <Text style={s.actionBtnTxt}>EXPLORAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn}>
              <Text style={s.actionBtnTxt}>CATEGORÍAS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Contenido ── */}
        {cargando ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : empresasMostradas.length === 0 ? (
          <View style={s.center}>
            <Feather name="search" size={44} color="#CBD5E1" />
            <Text style={s.emptyTxt}>Sin resultados</Text>
          </View>
        ) : busqueda ? (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={[s.rowTitle, { marginBottom: 16 }]}>Resultados de búsqueda</Text>
            {empresasMostradas.map(item => (
              <TouchableOpacity key={item.id} style={s.searchCard} onPress={() => onVerMuro(item.id)}>
                <Image source={{ uri: item.foto_portada_url || item.logo_url }} style={s.searchImg} />
                <View style={{ flex: 1, padding: 12 }}>
                  <Text style={s.searchTitle}>{item.nombre}</Text>
                  <Text style={s.searchSub}>{item.ciudad || 'Online'}</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#94A3B8" style={{ marginRight: 12 }} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{ marginTop: 16 }}>
            <RowCategoria titulo="Destacados de hoy" data={destacadas} />
            <RowCategoria titulo="Nuevas opciones" data={populares} />
            <RowCategoria titulo="Cerca de ti" data={cercaDeTi} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Estilos ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },

  // Header Light Theme
  lightHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 40,
    paddingBottom: 16, backgroundColor: '#F8F9FA',
  },
  headerBtn: { padding: 4 },
  lightLogo: { height: 36, width: 120 },

  // Barra de Búsqueda Light
  searchBarContainer: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#F8F9FA' },
  searchBarLight: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: Platform.OS === 'web' ? 12 : 10,
    ...shadows.soft,
  },
  searchInputLight: {
    flex: 1, fontSize: 15, color: '#1E293B',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },

  // Hero Banner Light
  heroShadow: {
    borderRadius: 16, backgroundColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  bannerContent: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
  },
  bannerTitle: {
    fontSize: 22, fontWeight: '800', color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  dotsContainer: {
    flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1' },

  // Action Buttons
  actionButtonsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    marginHorizontal: 16, marginTop: 24, marginBottom: 32,
  },
  actionBtn: {
    flex: 1, backgroundColor: '#E11D48', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: '#E11D48', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  actionBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },

  // Listas Horizontales
  rowSection: { marginBottom: 32 },
  rowHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 16 
  },
  rowTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  rowList: { paddingHorizontal: 12 },

  // Tarjeta Horizontal
  horCard: { width: 130, marginHorizontal: 6 },
  horPortadaWrap: {
    width: 130, height: 180, borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#FFFFFF', ...shadows.medium,
    justifyContent: 'center', alignItems: 'center',
  },
  fallbackLogo: { width: 70, height: 70, alignSelf: 'center', marginTop: 50 },
  fallbackTextWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fallbackText: { fontSize: 50, fontWeight: '800', color: 'rgba(30,41,59,0.1)' },
  horCardNombre: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginTop: 8 },

  // Búsqueda en grilla
  searchCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, marginBottom: 12, ...shadows.soft, overflow: 'hidden',
  },
  searchImg: { width: 80, height: 80, backgroundColor: '#CBD5E1' },
  searchTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  searchSub: { fontSize: 12, color: '#64748B', marginTop: 4 },

  // Utils
  avatarLetra: { flex: 1, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarLetraTxt: { fontSize: 22, color: '#FFF', fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, marginTop: 100 },
  emptyTxt: { fontSize: 16, fontWeight: '600', color: '#64748B', textAlign: 'center' },
});
