import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  TouchableOpacity, TextInput, ActivityIndicator, Image,
  Platform, RefreshControl, Animated, Linking, Modal,
  ScrollView
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, shadows } from '../theme/colors';
import { API_BASE as API } from '../../core/config/api';
import { DjangoBannerRepository } from '../../core/infraestructura/banners/DjangoBannerRepository';
import { ObtenerBannersPublicosCasoUso } from '../../core/aplicacion/banners/BannersCasosUso';
import { BannerPublicitario } from '../../core/domain/banners/Banner';
import { useWindowDimensions } from 'react-native';

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

interface Categoria {
  id: string;
  nombre: string;
  icono: string | null;
  empresas: EmpresaPublica[];
}

// ─── HeroBanner ────────────────────────────────────────────────────────────────
const HeroBanner = ({ banners }: { banners: any[] }) => {
  const { width } = useWindowDimensions();
  const bannerWidth = width - 32;
  const bannerHeight = bannerWidth * 0.55;
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % banners.length;
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
      <Image
        source={item.local_source ? item.local_source : { uri: item.imagen_url }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        locations={[0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={s.bannerContent}>
        <Text style={s.bannerTitle} numberOfLines={2}>{item.titulo}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ marginHorizontal: 16, marginTop: 8, alignItems: 'center' }}>
      <View style={[s.heroShadow, { width: bannerWidth, height: bannerHeight }]}>
        <FlatList
          ref={flatListRef}
          data={banners}
          keyExtractor={b => b.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          renderItem={renderItem}
          onMomentumScrollEnd={e =>
            setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / bannerWidth))
          }
        />
      </View>
      {banners.length > 1 && (
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
      )}
    </View>
  );
};

// ─── Tarjeta de empresa ─────────────────────────────────────────────────────────
const EmpresaCard = ({
  empresa,
  onPress,
}: {
  empresa: EmpresaPublica;
  onPress: (id: string) => void;
}) => (
  <TouchableOpacity style={s.horCard} activeOpacity={0.85} onPress={() => onPress(empresa.id)}>
    <View style={s.horPortadaWrap}>
      {empresa.foto_portada_url ? (
        <Image
          source={{ uri: empresa.foto_portada_url }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <LinearGradient
          colors={[colors.primary, '#1E40AF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {empresa.logo_url && empresa.foto_portada_url === '' && (
        <Image source={{ uri: empresa.logo_url }} style={s.fallbackLogo} resizeMode="contain" />
      )}
      {!empresa.foto_portada_url && !empresa.logo_url && (
        <Text style={s.fallbackText}>{empresa.nombre.charAt(0).toUpperCase()}</Text>
      )}
    </View>
    <Text style={s.horCardNombre} numberOfLines={1}>{empresa.nombre}</Text>
    {empresa.ciudad ? <Text style={s.horCardCiudad} numberOfLines={1}>{empresa.ciudad}</Text> : null}
  </TouchableOpacity>
);

// ─── Modal de Categorías ────────────────────────────────────────────────────────
const CategoriasModal = ({
  visible,
  categorias,
  onClose,
  onSelectCategoria,
}: {
  visible: boolean;
  categorias: Categoria[];
  onClose: () => void;
  onSelectCategoria: (cat: Categoria) => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose} />
    <View style={s.modalSheet}>
      <View style={s.modalHandle} />
      <Text style={s.modalTitle}>Explorar por categoría</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {categorias.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={s.modalCatRow}
            onPress={() => { onClose(); onSelectCategoria(cat); }}
          >
            <View style={s.modalCatIcon}>
              <Feather name={(cat.icono || 'grid') as any} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.modalCatNombre}>{cat.nombre}</Text>
              <Text style={s.modalCatCount}>{cat.empresas.length} empresa{cat.empresas.length !== 1 ? 's' : ''}</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ))}
        {categorias.length === 0 && (
          <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 24 }}>
            Sin categorías disponibles
          </Text>
        )}
      </ScrollView>
    </View>
  </Modal>
);

// ─── Pantalla principal ─────────────────────────────────────────────────────────
export const ExplorarEmpresasScreen = ({ navigation }: any) => {
  const [categorias, setCategorias]       = useState<Categoria[]>([]);
  const [banners, setBanners]             = useState<BannerPublicitario[]>([]);
  const [busqueda, setBusqueda]           = useState('');
  const [cargando, setCargando]           = useState(false);
  const [refresco, setRefresco]           = useState(false);
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [mostrarCategorias, setMostrarCategorias] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<Categoria | null>(null);
  const searchRef = useRef<TextInput>(null);

  const cargar = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const [bannersRes, catsRes] = await Promise.all([
        obtenerBannersCasoUso.ejecutar().catch(() => []),
        fetch(`${API}/api/empresas/publicas/categorias/`)
          .then(r => r.json())
          .catch(() => ({ ok: false, datos: [] })),
      ]);

      const bannersFinales =
        bannersRes && bannersRes.length > 0
          ? bannersRes
          : [{
              id: 'default',
              titulo: 'Encuentra los mejores servicios cerca de ti',
              imagen_url: '',
              local_source: require('../../../assets/images/scheduling_banner.png'),
              link_url: '',
              activo: true,
            }];

      setBanners(bannersFinales);
      if (catsRes.ok) setCategorias(catsRes.datos);
    } catch {
      // silencioso
    } finally {
      setCargando(false);
      setRefresco(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const onVerMuro = (id: string) => navigation.navigate('MuroPublicaciones', { empresaId: id });

  // ── Filtrado ────────────────────────────────────────────────────────────────
  const todasLasEmpresas: EmpresaPublica[] = categorias.flatMap(c => c.empresas);

  const empresasFiltradas = busqueda.trim()
    ? todasLasEmpresas.filter(e =>
        e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (e.ciudad || '').toLowerCase().includes(busqueda.toLowerCase())
      )
    : [];

  // ── Handlers botones ────────────────────────────────────────────────────────
  const handleExplorar = () => {
    setMostrarBusqueda(true);
    setTimeout(() => searchRef.current?.focus(), 150);
  };

  const handleCategorias = () => setMostrarCategorias(true);

  const handleSelectCategoria = (cat: Categoria) => {
    setCategoriaFiltro(cat);
    setBusqueda('');
  };

  const categoriasMostradas = categoriaFiltro
    ? categorias.filter(c => c.id === categoriaFiltro.id)
    : categorias;

  return (
    <SafeAreaView style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Image
          source={require('../../../assets/logo3.png')}
          style={s.logoImg}
          resizeMode="contain"
        />
        <TouchableOpacity style={s.loginBtn} onPress={() => navigation.navigate('Login')}>
          <Text style={s.loginBtnTxt}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* ── Barra de búsqueda ── */}
      {mostrarBusqueda && (
        <View style={s.searchContainer}>
          <View style={s.searchBarLight}>
            <Feather name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              ref={searchRef}
              style={s.searchInput}
              placeholder="Busca servicios, empresas..."
              placeholderTextColor="#94A3B8"
              value={busqueda}
              onChangeText={setBusqueda}
            />
            <TouchableOpacity onPress={() => { setBusqueda(''); setMostrarBusqueda(false); }}>
              <Feather name="x" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refresco}
            onRefresh={() => { setRefresco(true); cargar(true); }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* ── Banner hero ── */}
        {!busqueda && <HeroBanner banners={banners} />}

        {/* ── Botones de acción ── */}
        {!busqueda && !categoriaFiltro && (
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={handleExplorar}>
              <Feather name="search" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={s.actionBtnTxt}>EXPLORAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={handleCategorias}>
              <Feather name="grid" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={s.actionBtnTxt}>CATEGORÍAS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Filtro activo ── */}
        {categoriaFiltro && (
          <View style={s.filtroRow}>
            <Feather name={(categoriaFiltro.icono || 'grid') as any} size={16} color={colors.primary} />
            <Text style={s.filtroTxt}>{categoriaFiltro.nombre}</Text>
            <TouchableOpacity onPress={() => setCategoriaFiltro(null)} style={s.filtroClose}>
              <Feather name="x" size={14} color="#64748B" />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Contenido principal ── */}
        {cargando ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : busqueda ? (
          /* Resultados de búsqueda */
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={s.rowTitle}>
              {empresasFiltradas.length} resultado{empresasFiltradas.length !== 1 ? 's' : ''} para "{busqueda}"
            </Text>
            {empresasFiltradas.length === 0 ? (
              <View style={s.center}>
                <Feather name="search" size={44} color="#CBD5E1" />
                <Text style={s.emptyTxt}>Sin resultados</Text>
              </View>
            ) : (
              empresasFiltradas.map(item => (
                <TouchableOpacity key={item.id} style={s.searchCard} onPress={() => onVerMuro(item.id)}>
                  {item.foto_portada_url ? (
                    <Image source={{ uri: item.foto_portada_url }} style={s.searchImg} resizeMode="cover" />
                  ) : (
                    <View style={[s.searchImg, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ fontSize: 28, color: '#FFF', fontWeight: '700' }}>
                        {item.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, padding: 12 }}>
                    <Text style={s.searchTitle}>{item.nombre}</Text>
                    <Text style={s.searchSub}>{item.ciudad || 'Online'}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#94A3B8" style={{ marginRight: 12 }} />
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          /* Lista de categorías con sus empresas */
          <View style={{ marginTop: 16 }}>
            {categoriasMostradas.length === 0 ? (
              <View style={s.center}>
                <Feather name="inbox" size={44} color="#CBD5E1" />
                <Text style={s.emptyTxt}>Sin empresas disponibles</Text>
              </View>
            ) : (
              categoriasMostradas.map(cat => (
                <View key={cat.id} style={s.rowSection}>
                  <View style={s.rowHeader}>
                    <Feather name={(cat.icono || 'grid') as any} size={18} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={s.rowTitle}>{cat.nombre}</Text>
                    <Text style={s.rowCount}>{cat.empresas.length}</Text>
                  </View>
                  <FlatList
                    data={cat.empresas}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.rowList}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <EmpresaCard empresa={item} onPress={onVerMuro} />}
                  />
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Modal Categorías ── */}
      <CategoriasModal
        visible={mostrarCategorias}
        categorias={categorias}
        onClose={() => setMostrarCategorias(false)}
        onSelectCategoria={handleSelectCategoria}
      />
    </SafeAreaView>
  );
};

// ─── Estilos ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 44,
    paddingBottom: 12,
    backgroundColor: '#F8F9FA',
  },
  logoImg: { height: 48, width: 160 },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 24,
  },
  loginBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  // Búsqueda
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F8F9FA',
  },
  searchBarLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    ...shadows.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },

  // Hero Banner
  heroShadow: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  bannerContent: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },

  // Botones de acción
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E11D48',
    borderRadius: 10,
    paddingVertical: 14,
    shadowColor: '#E11D48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },

  // Filtro activo
  filtroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  filtroTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary },
  filtroClose: { padding: 2 },

  // Secciones de categoría
  rowSection: { marginBottom: 28 },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  rowTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1E293B' },
  rowCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  rowList: { paddingHorizontal: 12 },

  // Tarjeta horizontal de empresa
  horCard: { width: 140, marginHorizontal: 6 },
  horPortadaWrap: {
    width: 140,
    height: 190,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.soft,
  },
  fallbackLogo: { width: 70, height: 70 },
  fallbackText: { fontSize: 52, fontWeight: '800', color: 'rgba(255,255,255,0.6)' },
  horCardNombre: { fontSize: 13, fontWeight: '600', color: '#1E293B', marginTop: 8, marginLeft: 2 },
  horCardCiudad: { fontSize: 11, color: '#64748B', marginLeft: 2 },

  // Resultados de búsqueda
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    ...shadows.soft,
  },
  searchImg: { width: 80, height: 80 },
  searchTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  searchSub: { fontSize: 12, color: '#64748B', marginTop: 4 },

  // Modal de categorías
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  modalCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  modalCatIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCatNombre: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  modalCatCount: { fontSize: 12, color: '#64748B', marginTop: 2 },

  // Utilidades
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
    marginTop: 60,
  },
  emptyTxt: { fontSize: 16, fontWeight: '600', color: '#64748B', textAlign: 'center' },
});
