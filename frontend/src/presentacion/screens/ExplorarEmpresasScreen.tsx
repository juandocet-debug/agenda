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
      <View style={s.horPortadaOverlay} />
      
      {/* Play button indicator para dar el toque Netflix */}
      <View style={s.playBtnOverlay}>
        <Feather name="play" size={16} color="#FFF" style={{ marginLeft: 2 }} />
      </View>
    </View>
    <Text style={s.horCardNombre} numberOfLines={1}>{empresa.nombre}</Text>
  </TouchableOpacity>
);

const HeroBanner = ({ banners }: { banners: BannerPublicitario[] }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-play
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

  const renderItem = ({ item }: { item: BannerPublicitario }) => (
    <TouchableOpacity 
      activeOpacity={item.link_url ? 0.8 : 1}
      onPress={() => item.link_url && Linking.openURL(item.link_url)}
      style={s.bannerContainer}
    >
      <Image source={{ uri: item.imagen_url }} style={s.bannerImage} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'rgba(15,25,80,0.8)', colors.background]}
        locations={[0.4, 0.8, 1]}
        style={s.bannerGradient}
      />
      <View style={s.bannerContent}>
        <Text style={s.bannerTitle} numberOfLines={2}>{item.titulo}</Text>
        {item.link_url && (
          <View style={s.bannerAction}>
            <Feather name="info" size={14} color="#FFF" />
            <Text style={s.bannerActionTxt}>Más información</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.heroWrapper}>
      <FlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={b => b.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        renderItem={renderItem}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />
      <View style={s.dotsContainer}>
        {banners.map((_, i) => {
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
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

  const cargar = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const [bannersRes, empresasRes] = await Promise.all([
        obtenerBannersCasoUso.ejecutar().catch(() => []),
        fetch(`${API}/api/empresas/publicas/`).then(r => r.json()).catch(() => ({ ok: false, datos: [] }))
      ]);

      // Si no hay banners del admin, mostramos uno por defecto muy premium
      const bannersFinales = bannersRes && bannersRes.length > 0 ? bannersRes : [{
        id: 'default',
        titulo: 'Encuentra los mejores servicios cerca de ti',
        imagen_url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32d7?q=80&w=1632&auto=format&fit=crop',
        link_url: '',
        activo: true
      }];

      setBanners(bannersFinales);
      if (empresasRes.ok) setEmpresas(empresasRes.datos);
      
    } catch {
      // Error silencioso
    } finally {
      setCargando(false);
      setRefresco(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const onVerMuro = (id: string) => navigation.navigate('MuroPublicaciones', { empresaId: id });

  // ─── Filtrado y categorización (Estilo Netflix) ───
  let empresasMostradas = empresas;
  if (busqueda.trim()) {
    const q = busqueda.toLowerCase();
    empresasMostradas = empresas.filter(e => 
      e.nombre.toLowerCase().includes(q) || (e.ciudad || '').toLowerCase().includes(q)
    );
  }

  // Dividir artificialmente para tener varias filas (solo visual, en Netflix real vendría categorizado del backend)
  const destacadas = [...empresasMostradas].reverse().slice(0, 5);
  const populares = [...empresasMostradas].slice(0, 10);
  const cercaDeTi = [...empresasMostradas].filter(e => e.ciudad).slice(0, 8);

  const RowCategoria = ({ titulo, data }: { titulo: string, data: EmpresaPublica[] }) => {
    if (data.length === 0) return null;
    return (
      <View style={s.rowSection}>
        <Text style={s.rowTitle}>{titulo}</Text>
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
      {/* ── Header Flotante ── */}
      <View style={s.headerAbs}>
        <LinearGradient colors={['rgba(15,25,80,0.8)', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <View style={s.searchBar}>
          <Feather name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Series, películas... o servicios"
            placeholderTextColor="#94A3B8"
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda ? (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Feather name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refresco} onRefresh={() => { setRefresco(true); cargar(true); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* ── Hero Banner (Solo si no hay búsqueda) ── */}
        {!busqueda && banners.length > 0 && <HeroBanner banners={banners} />}
        {!busqueda && banners.length === 0 && <View style={{ height: 120 }} />}
        {busqueda ? <View style={{ height: 120 }} /> : null}

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
          // Vista en grilla si hay búsqueda (simulado en lista vertical por ahora)
          <View style={{ paddingHorizontal: 16 }}>
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
          // Filas tipo Netflix
          <View style={{ marginTop: -20, zIndex: 10 }}>
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
  root: { flex: 1, backgroundColor: colors.background }, // #0A0A0A por ejemplo, si colors.background es oscuro

  // Header Absoluto
  headerAbs: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    paddingTop: Platform.OS === 'web' ? 20 : 40,
    paddingHorizontal: 16, paddingBottom: 20,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', // Glassmorphism
    borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    flex: 1, fontSize: 14, color: '#FFF',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },

  // Hero
  heroWrapper: { width, height: width * 1.3, position: 'relative' },
  bannerContainer: { width, height: width * 1.3, position: 'relative' },
  bannerImage: { ...StyleSheet.absoluteFillObject },
  bannerGradient: { ...StyleSheet.absoluteFillObject },
  bannerContent: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 32, fontWeight: '800', color: '#FFF',
    textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
    marginBottom: 16,
  },
  bannerAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  bannerActionTxt: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  dotsContainer: {
    position: 'absolute', bottom: 16, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },

  // Listas Horizontales
  rowSection: { marginBottom: 28 },
  rowTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginLeft: 16, marginBottom: 12 },
  rowList: { paddingHorizontal: 12 },

  // Tarjeta Horizontal
  horCard: { width: 140, marginHorizontal: 4 },
  horPortadaWrap: {
    width: 140, height: 200, borderRadius: 8, overflow: 'hidden',
    backgroundColor: '#1E293B', ...shadows.soft,
    justifyContent: 'center', alignItems: 'center',
  },
  horPortadaOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.15)' },
  fallbackLogo: { width: 80, height: 80, alignSelf: 'center', marginTop: 60 },
  fallbackTextWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fallbackText: { fontSize: 60, fontWeight: '800', color: 'rgba(255,255,255,0.2)' },
  playBtnOverlay: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  horCardNombre: { fontSize: 13, fontWeight: '500', color: '#1E293B', marginTop: 8, textAlign: 'center' },

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
  emptyTxt: { fontSize: 15, fontWeight: '500', color: '#94A3B8', textAlign: 'center' },
});
