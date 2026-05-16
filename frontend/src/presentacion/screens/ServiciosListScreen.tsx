import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import { colors } from '../theme/colors';
import { formatearMoneda } from '../../core/utils/currencyFormatter';

// ── Caché en memoria — evita ir al servidor si ya cargamos los servicios ──────
// Los servicios rara vez cambian, con 30 seg de cache es suficiente.
let cacheServicios: any[] | null = null;
let cacheMoneda: string = 'COP';
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 30_000; // 30 segundos

export const ServiciosListScreen = () => {
  const navigation = useNavigation<any>();
  const [servicios, setServicios] = useState<any[]>(cacheServicios ?? []);
  const [moneda, setMoneda] = useState(cacheMoneda);
  // Si hay caché válida, arrancamos con loading=false (pantalla instantánea)
  const [loading, setLoading] = useState(cacheServicios === null);
  const empresaIdRef = useRef<string | null>(null);

  const cargarServicios = useCallback(async (forzar = false) => {
    try {
      // Servir desde caché si no han pasado 30 seg y no se fuerza recarga
      if (!forzar && cacheServicios !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
        setServicios(cacheServicios);
        setMoneda(cacheMoneda);
        return;
      }

      setLoading(true);

      // Reutilizar empresaId si ya lo tenemos (evita decodificar el JWT otra vez)
      if (!empresaIdRef.current) {
        const token = await obtenerTokenLocal();
        if (!token) return;
        const p = JSON.parse(atob(token.access.split('.')[1]));
        empresaIdRef.current = p.user_id;
      }

      const res = await fetch(
        `https://agenda-production-ae37.up.railway.app/api/servicios/?empresa_id=${empresaIdRef.current}`
      );
      const data = await res.json();

      if (data.ok) {
        // Guardar en caché
        cacheServicios = data.datos;
        cacheMoneda = data.moneda ?? 'COP';
        cacheTimestamp = Date.now();

        setServicios(data.datos);
        if (data.moneda) setMoneda(data.moneda);
      }
    } catch (e) {
      console.log('Error cargando servicios:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Al volver de crear/editar un servicio, invalidar el caché
      // para que se reflejen los cambios nuevos
      const debeForzar = navigation.getState()?.routes?.slice(-1)[0]?.params?.refrescar;
      cargarServicios(!!debeForzar);
    }, [cargarServicios])
  );

  const renderItem = ({ item }: { item: any }) => {
    let typeLabel = 'Cita';
    let typeColor = colors.primary;
    let iconName = 'calendar';

    if (item.tipo_servicio === 'MENSUALIDAD') {
      typeLabel = 'Suscripción';
      typeColor = '#10B981';
      iconName = 'refresh-cw';
    } else if (item.tipo_servicio === 'EXPERIENCIA') {
      typeLabel = 'Paquete';
      typeColor = '#F59E0B';
      iconName = 'star';
    }

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CrearEditarServicio', { servicioId: item.id })}
      >
        {item.imagen_url ? (
          <Image source={{ uri: item.imagen_url }} style={s.image} />
        ) : (
          <View style={s.imagePlaceholder}>
            <Feather name="image" size={24} color="#CCC" />
          </View>
        )}

        <View style={s.cardInfo}>
          <View style={s.titleRow}>
            <Text style={s.cardTitle}>{item.nombre}</Text>
          </View>
          <View style={s.subtitleRow}>
            <View style={[s.badge, { backgroundColor: typeColor + '20' }]}>
              <Feather name={iconName as any} size={10} color={typeColor} style={{ marginRight: 4 }} />
              <Text style={[s.badgeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            <Text style={s.cardSubtitle}>
              {item.tipo_servicio === 'CITA' ? `${item.duracion} min • ` : ''}{formatearMoneda(item.precio, moneda)}
            </Text>
          </View>
        </View>

        <Feather name="edit-2" size={20} color={colors.textSubtitle} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={s.title}>Mis Servicios</Text>
        </View>
        <TouchableOpacity
          style={s.headerAddBtn}
          onPress={() => {
            // Invalidar caché al crear nuevo servicio
            cacheServicios = null;
            navigation.navigate('CrearEditarServicio');
          }}
        >
          <Feather name="plus" size={20} color="#FFF" />
          <Text style={s.headerAddText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Skeleton: muestra la lista anterior mientras recarga en background */}
      {loading && servicios.length === 0 ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : servicios.length === 0 ? (
        <View style={s.emptyState}>
          <Feather name="briefcase" size={60} color="#DDD" />
          <Text style={s.emptyTitle}>Sin servicios</Text>
          <Text style={s.emptySub}>No has creado ningún servicio para tu portafolio aún.</Text>
        </View>
      ) : (
        <FlatList
          data={servicios}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          // Indicador sutil de recarga en el pull-to-refresh
          refreshing={loading}
          onRefresh={() => {
            cacheServicios = null; // Forzar recarga al hacer pull-to-refresh
            cargarServicios(true);
          }}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EFEFEF'
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '500', color: colors.textTitle },
  headerAddBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 4
  },
  headerAddText: { color: '#FFF', fontSize: 13, fontWeight: '500' },

  listContent: { padding: 15, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', padding: 12, borderRadius: 16, marginBottom: 15,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  image: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#EEE' },
  imagePlaceholder: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '500', color: colors.textTitle, flex: 1 },
  cardSubtitle: { fontSize: 14, color: colors.primary, fontWeight: '500' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '500' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '500', color: colors.textTitle, marginTop: 15, marginBottom: 5 },
  emptySub: { fontSize: 15, color: colors.textSubtitle, textAlign: 'center', paddingHorizontal: 20 }
});

