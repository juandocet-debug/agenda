import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, SafeAreaView, Platform, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { useCarrito } from '../../core/aplicacion/carrito/CarritoContext';
import { calcularTotal, ItemCarrito } from '../../core/dominio/carrito/CarritoEntidad';
import { formatearMoneda } from '../../core/utils/currencyFormatter';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';


const ItemCard = ({ item, onQuitar, onCambiarCantidad, onCambiarPlan }: {
  item: ItemCarrito;
  onQuitar: () => void;
  onCambiarCantidad: (delta: number) => void;
  onCambiarPlan: (plan: 'sesion' | '30_dias' | '90_dias' | '120_dias') => void;
}) => {
  const mostrarPlanes = item.precio30Dias || item.precio90Dias || item.precio120Dias;

  return (
  <View style={s.itemCard}>
    {/* Imagen del servicio */}
    {item.imagenUrl ? (
      <Image source={{ uri: item.imagenUrl }} style={s.itemImagen} resizeMode="cover" />
    ) : (
      <View style={s.itemImagenPlaceholder}>
        <Feather name="image" size={22} color="#CBD5E1" />
      </View>
    )}
    <View style={s.itemHeader}>
      <View style={{ flex: 1 }}>
        <Text style={s.itemNombre}>{item.servicioNombre}</Text>
        {item.sedeNombre ? <Text style={s.itemSede}><Feather name="map-pin" size={11} /> {item.sedeNombre}</Text> : null}
      </View>
      <TouchableOpacity onPress={onQuitar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Feather name="x" size={18} color="#EF4444" />
      </TouchableOpacity>
    </View>
    <View style={s.itemDetalle}>
      <View style={s.itemFechaHora}>
        <Feather name="calendar" size={13} color="#64748B" />
        <Text style={s.itemFechaTxt}>{item.fechaLegible}</Text>
      </View>
      <View style={s.itemFechaHora}>
        <Feather name="clock" size={13} color="#64748B" />
        <Text style={s.itemFechaTxt}>{item.hora}</Text>
      </View>
    </View>
    {mostrarPlanes ? (
      <View style={s.planesContainer}>
        <Text style={s.planesTitle}>Elige tu paquete:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.planesRow}>
          {item.permiteSesion && (
            <TouchableOpacity 
              style={[s.planPill, item.tipoPlan === 'sesion' && s.planPillActive]}
              onPress={() => onCambiarPlan('sesion')}>
              <Text style={[s.planPillTxt, item.tipoPlan === 'sesion' && s.planPillTxtActive]}>1 Sesión</Text>
            </TouchableOpacity>
          )}
          {item.precio30Dias ? (
            <TouchableOpacity 
              style={[s.planPill, item.tipoPlan === '30_dias' && s.planPillActive]}
              onPress={() => onCambiarPlan('30_dias')}>
              <Text style={[s.planPillTxt, item.tipoPlan === '30_dias' && s.planPillTxtActive]}>30 Días</Text>
            </TouchableOpacity>
          ) : null}
          {item.precio90Dias ? (
            <TouchableOpacity 
              style={[s.planPill, item.tipoPlan === '90_dias' && s.planPillActive]}
              onPress={() => onCambiarPlan('90_dias')}>
              <Text style={[s.planPillTxt, item.tipoPlan === '90_dias' && s.planPillTxtActive]}>90 Días</Text>
            </TouchableOpacity>
          ) : null}
          {item.precio120Dias ? (
            <TouchableOpacity 
              style={[s.planPill, item.tipoPlan === '120_dias' && s.planPillActive]}
              onPress={() => onCambiarPlan('120_dias')}>
              <Text style={[s.planPillTxt, item.tipoPlan === '120_dias' && s.planPillTxtActive]}>120 Días</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      </View>
    ) : null}

    <View style={s.itemBottom}>
      {item.cantidad > 1 ? (
        <View style={s.cantRow}>
          <TouchableOpacity style={s.cantBtn} onPress={() => onCambiarCantidad(-1)}>
            <Feather name="minus" size={14} color={colors.primary} />
          </TouchableOpacity>
          <Text style={s.cantNum}>{item.cantidad}</Text>
          <TouchableOpacity style={s.cantBtn} onPress={() => onCambiarCantidad(1)}>
            <Feather name="plus" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : null}
      <Text style={s.itemPrecio}>
        {formatearMoneda((item.precio * item.cantidad).toString(), item.moneda)}
      </Text>
    </View>
  </View>
  );
};

export const CarritoScreen = ({ navigation }: any) => {
  const { estado, quitarItem, actualizarCantidad, cambiarPlan, vaciarCarrito } = useCarrito();
  const [confirmando, setConfirmando] = useState(false);
  const [clienteLogueado, setClienteLogueado] = useState<{nombre?: string; email?: string; usuario_id?: string; telefono?: string} | null>(null);

  // Verificar si hay sesión de CLIENTE guardada (no de empresa)
  const verificarCliente = async () => {
    try {
      const tokenRaw = await AsyncStorage.getItem('cliente_token');
      const nombre = await AsyncStorage.getItem('cliente_nombre');
      const email = await AsyncStorage.getItem('cliente_email');
      const usuario_id = await AsyncStorage.getItem('cliente_id');
      const telefono = await AsyncStorage.getItem('cliente_telefono');
      if (tokenRaw) {
        setClienteLogueado({ nombre: nombre || undefined, email: email || undefined, usuario_id: usuario_id || undefined, telefono: telefono || undefined });
      } else {
        setClienteLogueado(null);
      }
    } catch { setClienteLogueado(null); }
  };

  React.useEffect(() => {
    verificarCliente();
  }, []);

  // Re-verificar cuando la pantalla gana foco (vuelve del login/registro)
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', verificarCliente);
    return unsubscribe;
  }, [navigation]);

  const total = calcularTotal(estado.items);
  const moneda = estado.items[0]?.moneda ?? 'COP';
  const hayItems = estado.items.length > 0;
  const empresaId = estado.empresaId;

  // Cargar servicios sugeridos de la misma empresa
  const [serviciosSugeridos, setServiciosSugeridos] = useState<any[]>([]);
  useEffect(() => {
    if (!empresaId) return;
    const serviciosEnCarrito = new Set(estado.items.map(i => i.servicioId));
    fetch(`${API}/api/servicios/?empresa_id=${empresaId}`)
      .then(r => r.json())
      .then(data => {
        const lista = Array.isArray(data) ? data : (data.results || []);
        // Excluir servicios ya en el carrito
        setServiciosSugeridos(lista.filter((s: any) => !serviciosEnCarrito.has(s.id) && s.activo !== false));
      })
      .catch(() => {});
  }, [empresaId, estado.items.length]);

  const confirmarCompra = async () => {
    if (!clienteLogueado) return;
    setConfirmando(true);
    try {
      const tokenRaw = await AsyncStorage.getItem('cliente_token');
      const resultados = [];
      for (const item of estado.items) {
        const r = await fetch(`${API}/api/citas/reservar-guest/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            empresa_id: item.empresaId,
            servicio_id: item.servicioId,
            sede_id: item.sedeId,
            fecha: item.fecha,
            hora_inicio: item.hora,
            cantidad: item.cantidad,
            tipo_plan: item.tipoPlan || 'sesion',
            cliente_id: clienteLogueado.usuario_id,
            cliente_nombre: clienteLogueado.nombre || 'Cliente',
            cliente_telefono: clienteLogueado.telefono || '0000',
            cliente_email: clienteLogueado.email || '',
          }),
        });
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || 'Error al reservar');
        resultados.push(d.datos);
      }
      vaciarCarrito();
      if (resultados.length > 0) {
        navigation.navigate('ConfirmacionReserva', {
          citaId: resultados[0].cita_id,
          checkoutUrl: resultados[0].checkout_url,
          resumen: resultados[0],
          totalItems: resultados.length,
        });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo completar la reserva.');
    } finally {
      setConfirmando(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      if (clienteLogueado) {
        navigation.replace('ClienteHome');
      } else {
        navigation.replace('ExplorarEmpresas');
      }
    }
  };

  if (!hayItems) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={handleBack} style={s.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Mi Carrito</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.emptyBox}>
          <Feather name="shopping-cart" size={64} color="#D1D5DB" />
          <Text style={s.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={s.emptySubtitle}>Agrega servicios desde la pantalla de reserva.</Text>
          <TouchableOpacity style={s.btnVolver} onPress={handleBack}>
            <Text style={s.btnVolverTxt}>Explorar disponibilidad</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mi Carrito</Text>
        <TouchableOpacity onPress={() => {
          if (Platform.OS === 'web') {
            if (window.confirm('¿Seguro que deseas vaciar el carrito?')) vaciarCarrito();
          } else {
            Alert.alert('Vaciar carrito', '¿Seguro?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Vaciar', style: 'destructive', onPress: vaciarCarrito },
            ]);
          }
        }}>
          <Feather name="trash-2" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>
        {/* Lista de ítems */}
        {estado.items.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            onQuitar={() => quitarItem(item.id)}
            onCambiarCantidad={(delta) => actualizarCantidad(item.id, item.cantidad + delta)}
            onCambiarPlan={(plan) => cambiarPlan(item.id, plan)}
          />
        ))}

        {/* Total */}
        <View style={s.totalCard}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalValor}>{formatearMoneda(total.toString(), moneda)}</Text>
        </View>

        {/* Gate: no logueado — diseño minimal premium */}
        {!clienteLogueado && (
          <View style={s.gateCard}>
            <View style={s.gateDivider} />
            <Text style={s.gateTitle}>Identifícate para pagar</Text>
            <Text style={s.gateSub}>Crea una cuenta gratuita o ingresa para confirmar tu reserva.</Text>
            <View style={s.gateBtns}>
              <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('RegistroCliente')}>
                <Text style={s.btnPrimaryTxt}>Crear cuenta</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSecondary} onPress={() => navigation.navigate('Login')}>
                <Text style={s.btnSecondaryTxt}>Ya tengo cuenta</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Confirmación: logueado */}
        {clienteLogueado && (
          <View style={s.confirmCard}>
            <View style={s.usuarioRow}>
              <View style={s.avatarCircle}>
                <Feather name="user-check" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.usuarioNombre}>{clienteLogueado.nombre || 'Cliente'}</Text>
                {clienteLogueado.email ? <Text style={s.usuarioEmail}>{clienteLogueado.email}</Text> : null}
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('ClienteHome')}
                style={s.miCuentaBtn}>
                <Text style={s.miCuentaTxt}>Mi cuenta</Text>
                <Feather name="chevron-right" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[s.btnConfirmar, confirmando && { opacity: 0.7 }]}
              onPress={confirmarCompra}
              disabled={confirmando}>
              {confirmando
                ? <ActivityIndicator color="#fff" />
                : <><Feather name="zap" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={s.btnConfirmarTxt}>Confirmar y Pagar</Text></>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Servicios sugeridos */}
        {serviciosSugeridos.length > 0 && (
          <View style={s.sugeridosSection}>
            <Text style={s.sugeridosTitle}>Generalmente se compra con...</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sugeridosRow}>
              {serviciosSugeridos.map((serv: any) => (
                <TouchableOpacity
                  key={serv.id}
                  style={s.sugeridoCard}
                  activeOpacity={0.85}
                  onPress={handleBack}>
                  {serv.imagen_url ? (
                    <Image source={{ uri: serv.imagen_url }} style={s.sugeridoImg} resizeMode="cover" />
                  ) : (
                    <View style={[s.sugeridoImg, s.sugeridoImgPlaceholder]}>
                      <Feather name="image" size={24} color="#CBD5E1" />
                    </View>
                  )}
                  <View style={s.sugeridoInfo}>
                    <Text style={s.sugeridoNombre} numberOfLines={2}>{serv.nombre}</Text>
                    <Text style={s.sugeridoDesde}>Desde:</Text>
                    <Text style={s.sugeridoPrecio}>
                      {formatearMoneda(serv.precio_valor?.toString() || '0', 'COP')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 50,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '500', color: '#1E293B' },
  scroll: { padding: 20 },

  itemCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0', ...shadows.soft,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  itemNombre: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
  itemSede: { fontSize: 12, color: '#64748B', marginTop: 2 },
  itemDetalle: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  itemFechaHora: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemFechaTxt: { fontSize: 13, color: '#64748B' },
  itemBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cantRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cantBtn: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1.5,
    borderColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  cantNum: { fontSize: 16, fontWeight: '500', color: '#1E293B' },
  itemPrecio: { fontSize: 18, fontWeight: '500', color: colors.primary },

  planesContainer: { marginTop: 4, marginBottom: 14 },
  planesTitle: { fontSize: 12, fontWeight: '500', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  planesRow: { gap: 8, paddingBottom: 4 },
  planPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC',
  },
  planPillActive: {
    borderColor: colors.primary, backgroundColor: '#EFF6FF',
  },
  planPillTxt: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  planPillTxtActive: { color: colors.primary, fontWeight: '500' },

  totalCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EFF6FF', borderRadius: 16, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  totalLabel: { fontSize: 16, fontWeight: '500', color: '#1E3A5F' },
  totalValor: { fontSize: 22, fontWeight: '500', color: colors.primary },

  gateCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.soft,
    marginBottom: 20,
  },
  gateDivider: {
    width: 36, height: 3, borderRadius: 2,
    backgroundColor: colors.primary,
    marginBottom: 16, opacity: 0.5,
  },
  gateTitle: { fontSize: 17, fontWeight: '500', color: '#1E293B', textAlign: 'center', marginBottom: 6 },
  gateSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  gateBtns: { width: '100%', gap: 10 },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center',
  },
  btnPrimaryTxt: { color: '#fff', fontWeight: '500', fontSize: 15 },
  btnSecondary: {
    borderRadius: 14, paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  btnSecondaryTxt: { color: '#475569', fontWeight: '500', fontSize: 14 },

  confirmCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#E2E8F0', ...shadows.soft, marginBottom: 20,
  },
  usuarioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center',
  },
  usuarioNombre: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
  usuarioEmail: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  miCuentaBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8 },
  miCuentaTxt: { fontSize: 12, fontWeight: '500', color: colors.primary },
  btnConfirmar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 14, padding: 16,
  },
  btnConfirmarTxt: { color: '#fff', fontWeight: '500', fontSize: 16, letterSpacing: 0.2 },

  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '500', color: '#1E293B' },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  btnVolver: {
    backgroundColor: colors.primary, borderRadius: 30, paddingVertical: 14,
    paddingHorizontal: 32, marginTop: 10,
  },
  btnVolverTxt: { color: '#fff', fontWeight: '500', fontSize: 15 },

  // ── Servicios sugeridos ───────────────────────────────────────────────────
  sugeridosSection: { marginBottom: 12 },
  sugeridosTitle: {
    fontSize: 16, fontWeight: '500', color: '#1E293B',
    marginBottom: 14, letterSpacing: -0.2,
  },
  sugeridosRow: { gap: 12, paddingBottom: 4 },
  sugeridoCard: {
    width: 148,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...shadows.soft,
  },
  sugeridoImg: {
    width: '100%',
    height: 100,
    backgroundColor: '#F1F5F9',
  },
  sugeridoImgPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sugeridoInfo: { padding: 10 },
  sugeridoNombre: {
    fontSize: 13, fontWeight: '500', color: '#1E293B',
    lineHeight: 18, marginBottom: 6,
  },
  sugeridoDesde: { fontSize: 11, color: '#94A3B8', marginBottom: 1 },
  sugeridoPrecio: { fontSize: 15, fontWeight: '500', color: colors.primary },
});


