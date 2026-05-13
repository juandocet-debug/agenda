import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, Dimensions, ScrollView, Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { ApiPublicacionRepository } from '../../core/infraestructura/publicaciones/ApiPublicacionRepository';
import { ListarPublicacionesUseCase, EliminarPublicacionUseCase } from '../../core/aplicacion/publicaciones/PublicacionesUseCases';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { useWindowDimensions } from 'react-native';

const BASE_URL = 'https://agenda-production-ae37.up.railway.app/api/publicaciones';

// --- Helpers ---
const formatFecha = (f?: string) => {
  if (!f) return '';
  const d = new Date(f), ahora = new Date();
  const diff = Math.floor((ahora.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} minutos`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} horas`;
  if (diff < 86400 * 7) return `Hace ${Math.floor(diff / 86400)} días`;
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

// --- Caption con hashtags en azul y "más" ---
const Caption = ({ autor, texto }: { autor: string; texto?: string }) => {
  const [expanded, setExpanded] = useState(false);
  if (!texto) return null;
  const limite = 90;
  const esLargo = texto.length > limite;
  const textoMostrado = expanded || !esLargo ? texto : texto.slice(0, limite);

  const renderTexto = (t: string) =>
    t.split(/(\s+)/).map((word, i) =>
      word.startsWith('#') ? (
        <Text key={i} style={cap.hashtag}>{word}</Text>
      ) : (
        <Text key={i}>{word}</Text>
      )
    );

  return (
    <View style={cap.row}>
      <Text style={cap.text}>
        <Text style={cap.autor}>{autor} </Text>
        {renderTexto(textoMostrado)}
        {esLargo && !expanded && (
          <Text style={cap.mas} onPress={() => setExpanded(true)}> ... más</Text>
        )}
      </Text>
    </View>
  );
};
const cap = StyleSheet.create({
  row: { paddingHorizontal: 12, marginBottom: 5 },
  text: { fontSize: 13.5, color: '#262626', lineHeight: 19 },
  autor: { fontWeight: '800', color: '#262626' },
  hashtag: { color: '#00376B', fontWeight: '600' },
  mas: { color: '#8E8E8E', fontWeight: '500' },
});

// --- Carrusel ---
const ImageCarousel = ({ imagenes }: { imagenes: string[] }) => {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();
  
  // Limitar el ancho máximo a 600 (como en Instagram Web)
  const cardWidth = Math.min(windowWidth, 600);

  if (!imagenes?.length) return null;

  const handleScroll = (index: number) => {
    if (index >= 0 && index < imagenes.length) {
      scrollRef.current?.scrollTo({ x: index * cardWidth, animated: true });
      setCurrent(index);
    }
  };

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setCurrent(Math.round(e.nativeEvent.contentOffset.x / cardWidth));
        }}
        scrollEventThrottle={16}
      >
        {imagenes.map((img, i) => (
          <Image key={i} source={{ uri: img }} style={{ width: cardWidth, height: cardWidth }} resizeMode="cover" />
        ))}
      </ScrollView>
      {imagenes.length > 1 && (
        <>
          {/* Flechas para Web */}
          {current > 0 && (
            <TouchableOpacity style={[car.arrow, { left: 10 }]} onPress={() => handleScroll(current - 1)}>
              <Feather name="chevron-left" size={24} color="#FFF" />
            </TouchableOpacity>
          )}
          {current < imagenes.length - 1 && (
            <TouchableOpacity style={[car.arrow, { right: 10 }]} onPress={() => handleScroll(current + 1)}>
              <Feather name="chevron-right" size={24} color="#FFF" />
            </TouchableOpacity>
          )}

          {/* Dots */}
          <View style={car.dots}>
            {imagenes.map((_, i) => (
              <View key={i} style={[car.dot, i === current && car.dotActive]} />
            ))}
          </View>
          {/* Counter badge */}
          <View style={car.counter}>
            <Text style={car.counterText}>{current + 1}/{imagenes.length}</Text>
          </View>
        </>
      )}
    </View>
  );
};
const car = StyleSheet.create({
  dots: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#3797EF', width: 6, height: 6, borderRadius: 3 },
  counter: {
    position: 'absolute', top: 12, right: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12,
  },
  counterText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  arrow: {
    position: 'absolute', top: '50%', marginTop: -18,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
  },
});

export const MuroPublicacionesScreen = ({ isOwner = false, empresaId }: { isOwner?: boolean; empresaId?: string }) => {
  const navigation = useNavigation<any>();
  const [publicaciones, setPublicaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Paginación
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const LIMIT = 5;

  const [empresaNombre, setEmpresaNombre] = useState('Mi Empresa');
  const [empresaLogo, setEmpresaLogo] = useState<string | null>(null);
  const [resolvedEmpresaId, setResolvedEmpresaId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      cargar(0, true);
    }, [empresaId])
  );

  const cargar = async (pageNum = 0, isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setHasMore(true);
      } else {
        setIsFetchingMore(true);
      }

      let idEmpresa = empresaId;
      const token = await obtenerTokenLocal();
      let userId = token?.usuario_id;
      if (!userId && token?.access) {
        try { const p = JSON.parse(atob(token.access.split('.')[1])); userId = p.user_id; } catch {}
      }
      if (!idEmpresa) idEmpresa = userId;
      if (!idEmpresa) return;
      setResolvedEmpresaId(idEmpresa);

      // Cargar nombre y logo (solo en carga inicial)
      if (isInitial) {
        try {
          const perfilRes = await fetch(`https://agenda-production-ae37.up.railway.app/api/empresas/${idEmpresa}/publico/`);
          const perfilData = await perfilRes.json();
          if (perfilData.ok && perfilData.datos) {
            if (perfilData.datos.nombre_empresa) setEmpresaNombre(perfilData.datos.nombre_empresa);
            if (perfilData.datos.logo_url) setEmpresaLogo(perfilData.datos.logo_url);
          }
        } catch {}
      }

      const repo = new ApiPublicacionRepository();
      const offset = pageNum * LIMIT;
      const lista = await new ListarPublicacionesUseCase(repo).ejecutar(idEmpresa, LIMIT, offset);
      
      if (lista.length < LIMIT) {
        setHasMore(false);
      }

      if (isInitial) {
        setPublicaciones(lista);
        setPage(1);
      } else {
        setPublicaciones(prev => {
          const newItems = lista.filter((item: any) => !prev.some(p => p.id === item.id));
          return [...prev, ...newItems];
        });
        setPage(prev => prev + 1);
      }
    } catch (e: any) { 
      console.error(e.message); 
    } finally { 
      setLoading(false); 
      setIsFetchingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    cargar(0, true);
  };

  const loadMore = () => {
    if (!hasMore || isFetchingMore || loading) return;
    cargar(page, false);
  };

  const handleLike = async (pub: any) => {
    try {
      const token = await obtenerTokenLocal();
      const res = await fetch(`${BASE_URL}/${pub.id}/like/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token?.access}` },
      });
      const data = await res.json();
      if (data.ok) {
        setPublicaciones(prev => prev.map(p =>
          p.id === pub.id
            ? { ...p, total_likes: data.datos.total_likes, usuario_dio_like: data.datos.usuario_dio_like }
            : p
        ));
      }
    } catch {}
  };

  const handleCompartir = async (item: any) => {
    try {
      await Share.share({
        title: item.titulo || 'Publicación',
        message: [
          item.titulo,
          item.descripcion,
          '\nVer más en Agenda App',
        ].filter(Boolean).join('\n'),
      });
    } catch {}
  };

  const handleEliminar = (pub: any) => {
    Alert.alert('Eliminar publicación', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          const repo = new ApiPublicacionRepository();
          await new EliminarPublicacionUseCase(repo).ejecutar(pub.id);
          setPublicaciones(prev => prev.filter(p => p.id !== pub.id));
        }
      }
    ]);
  };

  const renderPost = ({ item }: { item: any }) => {
    const imgs: string[] = item.imagenes?.length > 0
      ? item.imagenes
      : item.imagen_url ? [item.imagen_url] : [];

    return (
      <View style={s.card}>
        {/* ── Header ── */}
        <View style={s.header}>
          {/* Avatar con anillo estilo Instagram Stories */}
          <View style={s.avatarRing}>
            <View style={s.avatarInner}>
              {empresaLogo ? (
                <Image source={{ uri: empresaLogo }} style={{ width: '100%', height: '100%', borderRadius: 18 }} />
              ) : (
                <Feather name="briefcase" size={16} color={colors.primary} />
              )}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={s.autor}>{empresaNombre}</Text>
              <View style={s.verified}><Feather name="check" size={9} color="#FFF" /></View>
            </View>
          </View>
          {isOwner ? (
            <TouchableOpacity onPress={() => handleEliminar(item)} style={{ padding: 8 }}>
              <Feather name="more-horizontal" size={22} color="#262626" />
            </TouchableOpacity>
          ) : (
            <View style={{ padding: 8 }}>
              <Feather name="more-horizontal" size={22} color="#262626" />
            </View>
          )}
        </View>

        {/* ── Imágenes ── */}
        {imgs.length > 0 && <ImageCarousel imagenes={imgs} />}

        {/* ── Barra de acciones ── */}
        <View style={s.actionsBar}>
          {/* Izquierda: Like, Comentar, Compartir */}
          <View style={s.actionsLeft}>
            <TouchableOpacity style={s.actionGroup} onPress={() => handleLike(item)}>
              <Feather
                name="heart"
                size={24}
                color={item.usuario_dio_like ? '#ED4956' : '#262626'}
              />
              {item.total_likes > 0 && (
                <Text style={[s.actionCount, item.usuario_dio_like && { color: '#ED4956' }]}>
                  {item.total_likes}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.actionGroup}
              onPress={() => navigation.navigate('Comentarios', { publicacion: item })}
            >
              <Feather name="message-circle" size={23} color="#262626" />
              {item.total_comentarios > 0 && (
                <Text style={s.actionCount}>{item.total_comentarios}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.actionGroup} onPress={() => handleCompartir(item)}>
              <Feather name="send" size={22} color="#262626" />
            </TouchableOpacity>
          </View>

          {/* Derecha: Botón Reservar */}
          <TouchableOpacity
            style={s.reservarBtn}
            onPress={() => navigation.navigate('CrearCita', {
              empresaId: resolvedEmpresaId || item.empresa_id,
              empresa_id: resolvedEmpresaId || item.empresa_id,
              origen: 'publicacion',
            })}
            activeOpacity={0.8}
          >
            <Feather name="calendar" size={14} color="#FFF" />
            <Text style={s.reservarText}>Reservar</Text>
          </TouchableOpacity>
        </View>

        {/* ── Caption ── */}
        <Caption autor={empresaNombre} texto={item.descripcion || item.titulo} />

        {/* ── Timestamp ── */}
        <Text style={s.fecha}>{formatFecha(item.fecha_creacion)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header tipo Instagram */}
      <View style={s.topBar}>
        {navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color="#262626" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={s.topTitle}>Publicaciones</Text>
        {isOwner ? (
          <TouchableOpacity onPress={() => navigation.navigate('CrearPublicacion')}>
            <Feather name="plus-square" size={26} color="#262626" />
          </TouchableOpacity>
        ) : <View style={{ width: 26 }} />}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : publicaciones.length === 0 ? (
        <View style={s.empty}>
          <Feather name="camera" size={64} color="#C7C7C7" />
          <Text style={s.emptyTitle}>Sin publicaciones</Text>
          <Text style={s.emptySub}>
            {isOwner ? 'Comparte momentos de tu negocio con tus clientes.' : 'Esta empresa no ha publicado aún.'}
          </Text>
          {isOwner && (
            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('CrearPublicacion')}>
              <Text style={s.emptyBtnText}>+ Crear primera publicación</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={publicaciones}
          keyExtractor={i => i.id}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#EFEFEF', width: '100%', maxWidth: 600, alignSelf: 'center' }} />}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
            isFetchingMore ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : !hasMore && publicaciones.length > 0 ? (
              <Text style={{ textAlign: 'center', marginVertical: 20, color: '#8E8E8E', fontSize: 13 }}>No hay más publicaciones</Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFF', borderBottomWidth: 0.5, borderBottomColor: '#DBDBDB',
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#262626' },

  feedContainer: {
    paddingBottom: 100, // Para la barra inferior
  },

  card: { backgroundColor: '#FFF', width: '100%', maxWidth: 600, alignSelf: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 10, gap: 10,
  },
  avatarRing: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2, borderColor: '#C13584', // Instagram gradient border color
    padding: 2,
  },
  avatarInner: {
    flex: 1, borderRadius: 18,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  autor: { fontSize: 13.5, fontWeight: '800', color: '#262626' },
  verified: {
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: '#3797EF', justifyContent: 'center', alignItems: 'center',
  },

  /* Actions */
  actionsBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6,
  },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontSize: 14, fontWeight: '700', color: '#262626' },
  reservarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  reservarText: { color: '#FFF', fontSize: 13, fontWeight: '800' },

  /* Caption */
  verComentarios: { fontSize: 13.5, color: '#8E8E8E', marginBottom: 2 },

  /* Comment input row */
  commentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, gap: 10,
    borderTopWidth: 0.5, borderTopColor: '#EFEFEF',
  },
  commentAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
  },
  commentPlaceholder: { fontSize: 13.5, color: '#AAAAAA' },

  /* Fecha */
  fecha: {
    paddingHorizontal: 13, paddingBottom: 12,
    fontSize: 10, color: '#8E8E8E', textTransform: 'uppercase', letterSpacing: 0.5,
  },

  /* Empty */
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 12,
  },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#262626' },
  emptySub: { fontSize: 14, color: '#8E8E8E', textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 24,
    paddingVertical: 12, borderRadius: 8, marginTop: 8,
  },
  emptyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});
