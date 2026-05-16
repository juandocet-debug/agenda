import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, SafeAreaView, Modal, TextInput,
  Animated, LayoutAnimation, Platform, UIManager, Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { formatearMoneda } from '../../core/utils/currencyFormatter';
import { useCarrito } from '../../core/aplicacion/carrito/CarritoContext';
import { ItemCarrito } from '../../core/dominio/carrito/CarritoEntidad';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { API_BASE as API } from '../../core/config/api';

WebBrowser.maybeCompleteAuthSession();

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar', 'Abr', 'May', 'Jun', 'Jul.', 'Ago', 'Sept.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: "Hoy"
};
LocaleConfig.defaultLocale = 'es';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Sede { id: string; nombre: string; direccion?: string; ciudad?: string; }
interface Servicio { 
  id: string; 
  nombre: string; 
  descripcion?: string;
  precio: string; 
  tipo_servicio?: string; 
  duracion_minutos?: number; 
  imagen_url?: string; 
  capacidad_por_slot?: number; 
  activo?: boolean;
  permite_sesion?: boolean;
  precio_30_dias?: string;
  precio_90_dias?: string;
  precio_120_dias?: string;
}
interface SlotInfo { hora: string; cupos_disponibles: number; capacidad_total: number; }

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const formatFecha = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return { dia: DIAS[d.getDay()], num: `${d.getDate()} ${MESES[d.getMonth()]}` };
};

const fechaLegible = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
};

const parseHoraToMinutes = (horaStr: string) => {
  if (!horaStr) return 0;
  // "08:00:00" -> 480
  const [h, m] = horaStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const isAM = (horaStr: string) => parseHoraToMinutes(horaStr) < 720; // 12:00 PM is 720

const formatHoraAmPm = (horaStr: string) => {
  if (!horaStr) return '';
  const [hStr, mStr] = horaStr.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 becomes 12
  return `${h}:${mStr || '00'} ${ampm}`;
};

export const AgendarPublicoScreen = ({ route, navigation }: any) => {
  const { empresaId, empresa_id } = route.params || {};
  const idEmpresa = empresaId || empresa_id;

  const { agregarItem, totalItems, esEmpresaDiferente } = useCarrito();

  // Datos remotos
  const [empresa, setEmpresa] = useState<any>(null);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [moneda, setMoneda] = useState('COP');
  const [diasHabilitados, setDiasHabilitados] = useState<number[]>([]);
  const [slots, setSlots] = useState<SlotInfo[]>([]);

  // Selecciones
  const [sedeSeleccionada, setSedeSeleccionada] = useState<Sede | null>(null);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [slotAbierto, setSlotAbierto] = useState<string | null>(null);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [tabFiltro, setTabFiltro] = useState<'AM' | 'PM'>('AM');

  // UI
  const [cargandoSedes, setCargandoSedes] = useState(false);
  const [cargandoServicios, setCargandoServicios] = useState(false);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [mostrarSedes, setMostrarSedes] = useState(false);
  const [mostrarServicios, setMostrarServicios] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [agregadoHora, setAgregadoHora] = useState<string | null>(null);
  const [mostrarDisponibilidad, setMostrarDisponibilidad] = useState(false);
  const badgeAnim = useRef(new Animated.Value(1)).current;

  // ── Auth de Cliente ──────────────────────────────────────────────────────────
  const [clienteToken, setClienteToken] = useState<string | null>(null);
  const [clienteNombre, setClienteNombre] = useState<string | null>(null);
  const [mostrarAuthCliente, setMostrarAuthCliente] = useState(false);
  const [authPaso, setAuthPaso] = useState<'inicio' | 'formulario'>('inicio');
  const [authModo, setAuthModo] = useState<'login' | 'registro'>('login');
  const [authNombre, setAuthNombre] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authTelefono, setAuthTelefono] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authCargando, setAuthCargando] = useState(false);
  const [authError, setAuthError] = useState('');
  // Guarda la acción pendiente (slot) para ejecutar tras login
  const [slotPendiente, setSlotPendiente] = useState<{slot: SlotInfo, rapida: boolean} | null>(null);

  // ── Google Auth ──────────────────────────────────────────────────────────────
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '776135233648-4cisjd6nonsphm2qklc95irnod7cqtf5.apps.googleusercontent.com', 
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken || authentication?.idToken) {
        const token = authentication.idToken || authentication.accessToken;
        if (token) {
          loginConGoogle(token);
        }
      }
    }
  }, [response]);

  useEffect(() => {
    // Cargar token de cliente guardado
    AsyncStorage.getItem('cliente_token').then(t => {
      if (t) setClienteToken(t);
    });
    AsyncStorage.getItem('cliente_nombre').then(n => {
      if (n) setClienteNombre(n);
    });
  }, []);

  useEffect(() => { 
    if (idEmpresa) { 
      cargarEmpresa();
      cargarSedes(); 
      cargarServicios(); 
      cargarDias();
    } 
  }, [idEmpresa]);

  useEffect(() => {
    // Ya no recargamos días basados en sede
  }, [sedeSeleccionada]);

  // Autoseleccionar primer servicio y sede si no hay nada
  useEffect(() => {
    if (servicios.length > 0 && !servicioSeleccionado) {
      setServicioSeleccionado(servicios[0]);
    }
  }, [servicios]);

  useEffect(() => {
    if (sedes.length > 0 && !sedeSeleccionada) {
      setSedeSeleccionada(sedes[0]);
    }
  }, [sedes]);

  const cargarEmpresa = async () => {
    try {
      const r = await fetch(`${API}/api/empresas/${idEmpresa}/publico/`);
      const d = await r.json();
      if (d.ok) setEmpresa(d.datos);
    } catch {}
  };

  const cargarSedes = async () => {
    setCargandoSedes(true);
    try {
      const r = await fetch(`${API}/api/sedes/publicas/?empresa_id=${idEmpresa}`);
      const d = await r.json();
      if (d.ok) setSedes(d.datos);
    } catch {} finally { setCargandoSedes(false); }
  };

  const cargarServicios = async () => {
    setCargandoServicios(true);
    try {
      const r = await fetch(`${API}/api/servicios/?empresa_id=${idEmpresa}`);
      const d = await r.json();
      if (d.ok) { setServicios(d.datos); if (d.moneda) setMoneda(d.moneda); }
    } catch {} finally { setCargandoServicios(false); }
  };

  const cargarDias = async () => {
    try {
      const r = await fetch(`${API}/api/citas/horario/${idEmpresa}/`);
      const d = await r.json();
      if (d.ok) {
        setDiasHabilitados(d.datos.filter((h: any) => h.activo).map((h: any) => h.dia_semana));
      }
    } catch {}
  };

  const getMarkedDates = () => {
    if (!diasHabilitados.length) return {};
    const marks: any = {};
    const hoy = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(hoy); d.setDate(hoy.getDate() + i);
      const pyDay = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      if (diasHabilitados.includes(pyDay)) {
        // ✅ Día disponible: verde brillante de marca
        marks[dateString] = {
          disabled: false,
          customStyles: {
            container: { backgroundColor: '#DCFCE7', borderRadius: 8, borderWidth: 1, borderColor: '#4ADE80' },
            text: { color: '#15803D', fontWeight: '600' },
          },
        };
      } else {
        // ❌ Día no disponible: gris muy suave
        marks[dateString] = {
          disabled: true,
          disableTouchEvent: true,
          customStyles: {
            container: { backgroundColor: '#F1F5F9', borderRadius: 8 },
            text: { color: '#CBD5E1' },
          },
        };
      }
    }

    if (fechaSeleccionada) {
      // 🔵 Día seleccionado: color primario de Flowy
      marks[fechaSeleccionada] = {
        selected: true,
        customStyles: {
          container: { backgroundColor: colors.primary, borderRadius: 8, elevation: 3 },
          text: { color: '#FFF', fontWeight: '700' },
        },
      };
    }
    return marks;
  };

  const consultar = async () => {
    if (!servicioSeleccionado || !fechaSeleccionada) {
      Alert.alert('Faltan datos', 'Selecciona un servicio y una fecha.'); return;
    }
    setCargandoSlots(true);
    setSlotAbierto(null);
    setMostrarDisponibilidad(true);
    try {
      const sedeParam = sedeSeleccionada ? `&sede_id=${sedeSeleccionada.id}` : '';
      const r = await fetch(`${API}/api/citas/slots/?empresa_id=${idEmpresa}&fecha=${fechaSeleccionada}&servicio_id=${servicioSeleccionado.id}${sedeParam}`);
      const d = await r.json();
      if (d.ok) {
        const nuevosSlots = Array.isArray(d.datos) ? d.datos : [];
        setSlots(nuevosSlots);
        // Si hay slots PM y no AM, cambiar tab automáticamente
        if (nuevosSlots.length > 0) {
          const tieneAM = nuevosSlots.some((s: any) => s.hora && isAM(s.hora));
          if (!tieneAM) setTabFiltro('PM');
          else setTabFiltro('AM');
        }
      } else {
        setSlots([]);
        Alert.alert('Aviso', d.error || d.mensaje || 'No hay horarios disponibles para esta fecha.');
      }
    } catch { Alert.alert('Error', 'No se pudo consultar disponibilidad.'); setSlots([]); }
    finally { setCargandoSlots(false); }
  };

  const toggleSlot = (hora: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSlotAbierto(prev => prev === hora ? null : hora);
    if (!cantidades[hora]) setCantidades(prev => ({ ...prev, [hora]: 1 }));
  };

  const cambiarCantidad = (hora: string, delta: number) => {
    const slotInfo = slots.find(s => s.hora === hora);
    const max = slotInfo?.cupos_disponibles ?? 1;
    setCantidades(prev => ({
      ...prev,
      [hora]: Math.max(1, Math.min((prev[hora] ?? 1) + delta, max)),
    }));
  };

  const agregarAlCarrito = (slotInfo: SlotInfo, compraRapida: boolean = false) => {
    if (!servicioSeleccionado) return;

    if (esEmpresaDiferente(idEmpresa)) {
      if (Platform.OS === 'web') {
        if (window.confirm('Tu carrito tiene ítems de otra empresa. ¿Deseas vaciarlo y agregar este?')) {
          _agregar(slotInfo, compraRapida);
        }
      } else {
        Alert.alert(
          'Carrito de otra empresa',
          'Tu carrito tiene ítems de otra empresa. ¿Deseas vaciarlo y agregar este?',
          [{ text: 'Cancelar', style: 'cancel' }, { text: 'Vaciar y agregar', style: 'destructive', onPress: () => _agregar(slotInfo, compraRapida) }]
        );
      }
      return;
    }
    _agregar(slotInfo, compraRapida);
  };

  const loginCliente = async () => {
    if (!authEmail || !authPassword) { setAuthError('Email y contraseña son obligatorios.'); return; }
    setAuthCargando(true); setAuthError('');
    try {
      const res = await fetch(`${API}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Credenciales incorrectas.');
      // Guardar token de cliente (clave separada de empresa)
      await AsyncStorage.setItem('cliente_token', data.access);
      await AsyncStorage.setItem('cliente_nombre', data.datos?.nombre || authEmail);
      setClienteToken(data.access);
      setClienteNombre(data.datos?.nombre || authEmail);
      setMostrarAuthCliente(false);
      // Ejecutar acción pendiente
      if (slotPendiente) {
        _agregar(slotPendiente.slot, slotPendiente.rapida);
        setSlotPendiente(null);
      }
    } catch (e: any) {
      setAuthError(e.message || 'Error al iniciar sesión.');
    } finally {
      setAuthCargando(false);
    }
  };

  const registrarCliente = async () => {
    if (!authNombre || !authEmail || !authPassword) { setAuthError('Nombre, email y contraseña son obligatorios.'); return; }
    if (authPassword.length < 6) { setAuthError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setAuthCargando(true); setAuthError('');
    try {
      const res = await fetch(`${API}/api/auth/registro-cliente/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: authNombre, email: authEmail, telefono: authTelefono, password: authPassword }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al registrarse.');
      await AsyncStorage.setItem('cliente_token', data.access);
      await AsyncStorage.setItem('cliente_nombre', authNombre);
      setClienteToken(data.access);
      setClienteNombre(authNombre);
      setMostrarAuthCliente(false);
      if (slotPendiente) {
        _agregar(slotPendiente.slot, slotPendiente.rapida);
        setSlotPendiente(null);
      }
    } catch (e: any) {
      setAuthError(e.message || 'Error al registrarse.');
    } finally {
      setAuthCargando(false);
    }
  };

  const loginConGoogle = async (token: string) => {
    setAuthCargando(true); setAuthError('');
    try {
      const res = await fetch(`${API}/api/auth/google/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error autenticando con Google.');
      
      await AsyncStorage.setItem('cliente_token', data.access);
      await AsyncStorage.setItem('cliente_nombre', data.datos?.nombre);
      setClienteToken(data.access);
      setClienteNombre(data.datos?.nombre);
      setMostrarAuthCliente(false);
      
      if (slotPendiente) {
        _agregar(slotPendiente.slot, slotPendiente.rapida);
        setSlotPendiente(null);
      }
    } catch (e: any) {
      setAuthError(e.message || 'Error al iniciar con Google.');
    } finally {
      setAuthCargando(false);
    }
  };

  const _agregar = (slotInfo: SlotInfo, compraRapida: boolean) => {
    if (!servicioSeleccionado) return;
    const item: ItemCarrito = {
      id: `${servicioSeleccionado.id}-${fechaSeleccionada}-${slotInfo.hora}-${Date.now()}`,
      empresaId: idEmpresa,
      sedeId: sedeSeleccionada?.id,
      sedeNombre: sedeSeleccionada?.nombre,
      servicioId: servicioSeleccionado.id,
      servicioNombre: servicioSeleccionado.nombre,
      precio: parseFloat(servicioSeleccionado.precio),
      moneda,
      fecha: fechaSeleccionada,
      fechaLegible: fechaLegible(fechaSeleccionada),
      hora: slotInfo.hora,
      cantidad: cantidades[slotInfo.hora] ?? 1,
      duracion: servicioSeleccionado.duracion_minutos,
      permiteSesion: servicioSeleccionado.permite_sesion,
      precio30Dias: servicioSeleccionado.precio_30_dias ? parseFloat(servicioSeleccionado.precio_30_dias) : null,
      precio90Dias: servicioSeleccionado.precio_90_dias ? parseFloat(servicioSeleccionado.precio_90_dias) : null,
      precio120Dias: servicioSeleccionado.precio_120_dias ? parseFloat(servicioSeleccionado.precio_120_dias) : null,
      tipoPlan: 'sesion',
      precioBase: parseFloat(servicioSeleccionado.precio),
      imagenUrl: servicioSeleccionado.imagen_url || undefined,
    };
    agregarItem(item);

    const irAlCarrito = async () => {
      try {
        const token = await AsyncStorage.getItem('cliente_token');
        if (token) {
          navigation.navigate('Carrito');
        } else {
          navigation.navigate('Login');
        }
      } catch {
        navigation.navigate('Login');
      }
    };

    if (compraRapida) {
      irAlCarrito();
    } else {
      setAgregadoHora(slotInfo.hora);
      Animated.sequence([
        Animated.spring(badgeAnim, { toValue: 1.4, useNativeDriver: true }),
        Animated.spring(badgeAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setAgregadoHora(null), 1500);
      setSlotAbierto(null); // Ocultar accordion
    }
  };

  const onLogoPress = async () => {
    try {
      const token = await AsyncStorage.getItem('cliente_token');
      if (token) {
        navigation.navigate('ClienteHome');
      } else {
        navigation.navigate('Login');
      }
    } catch {
      navigation.navigate('Login');
    }
  };

  const puedoConsultar = !!servicioSeleccionado && !!fechaSeleccionada;

  const slotsFiltrados = slots.filter(s => tabFiltro === 'AM' ? isAM(s.hora) : !isAM(s.hora));

  return (
    <SafeAreaView style={s.root}>
      {/* Top Bar Flowy */}
      <View style={s.topBarFlowy}>
        <TouchableOpacity onPress={onLogoPress} activeOpacity={0.8}>
          <Image source={require('../../../assets/logo4.png')} style={s.logoFlowy} />
        </TouchableOpacity>
      </View>

      {/* Header Estético: Empresa + Carrito */}
      <View style={s.header}>
        <View style={s.empresaHeader}>
          <View style={s.avatarContainer}>
            {empresa?.logo_url ? (
              <Image source={{ uri: empresa.logo_url }} style={s.avatarImg} />
            ) : (
              <Feather name="briefcase" size={24} color="#4F46E5" />
            )}
          </View>
          <Text style={s.empresaNombre} numberOfLines={1}>
            {empresa?.nombre_empresa || 'Empresa Local'}
          </Text>
          <View style={s.verifiedBadge}>
            <Feather name="check" size={12} color="#fff" />
          </View>
        </View>

        <TouchableOpacity style={s.carritoBtn} onPress={async () => {
          try {
            const token = await AsyncStorage.getItem('cliente_token');
            if (token) {
              navigation.navigate('Carrito');
            } else {
              navigation.navigate('Login');
            }
          } catch {
            navigation.navigate('Login');
          }
        }}>
          <Feather name="shopping-cart" size={24} color="#4B5563" />
          {totalItems > 0 && (
            <Animated.View style={[s.badge, { transform: [{ scale: badgeAnim }] }]}>
              <Text style={s.badgeText}>{totalItems}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll}>
        
        {/* Selector sutil de servicio (si tienen mas de 1) */}
        {servicios.length > 1 && (
          <TouchableOpacity style={s.btnSelectServicio} onPress={() => setMostrarServicios(!mostrarServicios)}>
            <Text style={s.btnSelectServicioTxt}>
              {servicioSeleccionado ? servicioSeleccionado.nombre : 'Cambiar Servicio'}
            </Text>
            <Feather name="chevron-down" size={16} color="#666" />
          </TouchableOpacity>
        )}
        {mostrarServicios && (
          <View style={s.dropdown}>
            {servicios.map(sv => (
              <TouchableOpacity key={sv.id} style={s.dropItem} onPress={() => { setServicioSeleccionado(sv); setMostrarServicios(false); setMostrarDisponibilidad(false); }}>
                <Text style={s.dropItemTxt}>{sv.nombre}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* HERO IMAGE */}
        <View style={s.heroContainer}>
          {servicioSeleccionado?.imagen_url ? (
            <Image source={{ uri: servicioSeleccionado.imagen_url }} style={s.heroImage} resizeMode="contain" />
          ) : (
            <View style={[s.heroImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
              <Feather name="image" size={40} color="#9CA3AF" />
            </View>
          )}
          <View style={s.dotsContainer}>
            <View style={s.dotActive} />
            <View style={s.dotInactive} />
          </View>
        </View>

        {/* TITULO, DESCRIPCIÓN Y PRECIO */}
        <View style={s.infoContainer}>
          <Text style={s.serviceTitle}>{servicioSeleccionado?.nombre || 'Selecciona un servicio'}</Text>
          
          {servicioSeleccionado?.descripcion ? (
            <Text style={s.serviceDesc}>{servicioSeleccionado.descripcion}</Text>
          ) : null}

          <View style={s.divider} />
          
          <Text style={s.servicePrice}>
            {servicioSeleccionado?.duracion_minutos ? `${servicioSeleccionado.duracion_minutos} min | ` : ''}
            {formatearMoneda(servicioSeleccionado?.precio || '0', moneda)}
          </Text>

          {/* Sede Select */}
          <View style={[s.inputRow, { zIndex: 999, elevation: 5, position: 'relative' }]}>
            <Text style={s.labelForm}>Lugar:</Text>
            <TouchableOpacity style={s.selectInput} onPress={() => setMostrarSedes(!mostrarSedes)}>
              <Text style={s.selectInputTxt}>
                {sedes.length === 0 ? 'Sin sedes registradas' : (sedeSeleccionada?.nombre || 'Seleccione Sede')}
              </Text>
              <Feather name="chevron-down" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          {mostrarSedes && (
            <View style={s.dropdownFloat}>
              {sedes.length === 0 ? (
                <Text style={[s.dropItemTxt, { padding: 14, color: '#9CA3AF' }]}>No hay sedes configuradas</Text>
              ) : (
                sedes.map(sd => (
                  <TouchableOpacity key={sd.id} style={s.dropItem} onPress={() => { setSedeSeleccionada(sd); setMostrarSedes(false); setMostrarDisponibilidad(false); }}>
                    <Text style={s.dropItemTxt}>{sd.nombre}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* Fecha Select */}
          <View style={[s.inputRow, { marginTop: 16, zIndex: 1 }]}>
            <Text style={s.labelForm}>Fecha:</Text>
            <TouchableOpacity style={s.selectInput} onPress={() => setMostrarCalendario(true)}>
              <Text style={[s.selectInputTxt, !fechaSeleccionada && { color: '#9CA3AF' }]}>
                {fechaSeleccionada ? fechaLegible(fechaSeleccionada) : 'Selecciona Fecha'}
              </Text>
              <Feather name="calendar" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={s.orangeUnderline} />
        </View>

        {/* Sección "Ten en cuenta" (dinámica) */}
        {empresa?.mensaje_advertencia ? (
          <View style={s.warningBox}>
            <View style={s.warningHeader}>
              <Feather name="alert-circle" size={16} color="#F97316" />
              <Text style={s.warningTitle}>¡Ten en cuenta!</Text>
            </View>
            <Text style={s.warningText}>{empresa.mensaje_advertencia}</Text>
          </View>
        ) : null}

        {/* BOTON CONSULTAR DISPONIBILIDAD */}
        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <TouchableOpacity 
            style={[s.btnEligeDisp, !puedoConsultar && s.btnDisabled]} 
            onPress={consultar} 
            disabled={!puedoConsultar || cargandoSlots}>
            {cargandoSlots ? <ActivityIndicator color="#fff" /> : <Text style={s.btnEligeDispTxt}>Elige una disponibilidad &gt;</Text>}
          </TouchableOpacity>
        </View>

        {/* RESULTADOS DISPONIBILIDAD */}
        {mostrarDisponibilidad && (
          <View style={s.dispContainer}>
            <Text style={s.dispEncontradaTxt}>Esta es la disponibilidad encontrada:</Text>
            
            {/* TABS AM / PM */}
            <View style={s.tabsContainer}>
              <TouchableOpacity style={[s.tab, tabFiltro === 'AM' && s.tabActive]} onPress={() => setTabFiltro('AM')}>
                <Text style={[s.tabTxt, tabFiltro === 'AM' && s.tabTxtActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tab, tabFiltro === 'PM' && s.tabActive]} onPress={() => setTabFiltro('PM')}>
                <Text style={[s.tabTxt, tabFiltro === 'PM' && s.tabTxtActive]}>PM</Text>
              </TouchableOpacity>
            </View>

            <View style={s.slotsListContainer}>
              {slotsFiltrados.length === 0 ? (
                <Text style={s.emptySlots}>No hay disponibilidad en este horario.</Text>
              ) : (
                slotsFiltrados.map(slot => {
                  const abierto = slotAbierto === slot.hora;
                  const cant = cantidades[slot.hora] ?? 1;
                  
                  // Calcular hora fin (duración)
                  let horaFin = '';
                  if (servicioSeleccionado?.duracion_minutos) {
                    const min = parseHoraToMinutes(slot.hora) + servicioSeleccionado.duracion_minutos;
                    const hStr = Math.floor(min / 60).toString().padStart(2, '0');
                    const mStr = (min % 60).toString().padStart(2, '0');
                    horaFin = formatHoraAmPm(`${hStr}:${mStr}`);
                  }

                  return (
                    <View key={slot.hora} style={s.slotItem}>
                      <View style={s.slotHeader}>
                        <View style={s.slotHeaderLeft}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Feather name="clock" size={14} color="#000" style={{ marginRight: 6 }} />
                            <Text style={s.slotFechaHora}>
                              {fechaSeleccionada}, {formatHoraAmPm(slot.hora)}{horaFin ? ` a ${horaFin}` : ''}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Feather name="tag" size={14} color="#000" style={{ marginRight: 6 }} />
                            <Text style={s.slotPrecio}>{formatearMoneda(servicioSeleccionado?.precio || '0', moneda)}</Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => toggleSlot(slot.hora)}>
                          <Text style={s.btnOcultarTxt}>
                            {abierto ? 'Ocultar disponibilidad ' : 'Ver disponibilidad '}
                            <Feather name={abierto ? 'chevron-up' : 'chevron-down'} size={14} />
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {abierto && (
                        <View style={s.slotBody}>
                          {/* Fila Lugar */}
                          <View style={s.bodyRow}>
                            <Text style={s.bodyLabel}>Lugar</Text>
                            <Text style={s.bodyValue}>{sedeSeleccionada?.nombre}</Text>
                          </View>
                          
                          {/* Fila Cantidad y Botones Accion (En una sola linea) */}
                          <View style={s.accionesLineaUnica}>
                            <View style={s.cantidadWrapper}>
                              <Text style={s.bodyLabelInline}>Cantidad</Text>
                              <View style={s.cantidadSelector}>
                                <Text style={s.cantNum}>{cant}</Text>
                                <View style={s.cantControls}>
                                  <TouchableOpacity onPress={() => cambiarCantidad(slot.hora, 1)}><Feather name="chevron-up" size={16} color="#666" /></TouchableOpacity>
                                  <TouchableOpacity onPress={() => cambiarCantidad(slot.hora, -1)}><Feather name="chevron-down" size={16} color="#666" /></TouchableOpacity>
                                </View>
                              </View>
                            </View>

                            <View style={s.botonesWrapper}>
                              <TouchableOpacity style={s.btnAgregarBlanco} onPress={() => agregarAlCarrito(slot, false)}>
                                <Text style={s.btnAgregarBlancoTxt}>Agregar</Text>
                                <Feather name="shopping-cart" size={16} color="#666" style={{ marginLeft: 6 }} />
                              </TouchableOpacity>
                              <TouchableOpacity style={s.btnCompraRapida} onPress={() => agregarAlCarrito(slot, true)}>
                                <Text style={s.btnCompraRapidaTxt}>Compra rápida</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal Calendario */}
      <Modal visible={mostrarCalendario} animationType="fade" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Selecciona una fecha</Text>
              <TouchableOpacity onPress={() => setMostrarCalendario(false)} style={{ padding: 5 }}>
                <Feather name="x" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Calendar
              minDate={(() => {
                const d = new Date();
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
              })()}
              markingType={'custom'}
              markedDates={getMarkedDates()}
              onDayPress={(day: any) => {
                // Solo permitir selección de días habilitados
                const d = new Date(day.dateString + 'T00:00:00');
                const pyDay = d.getDay() === 0 ? 6 : d.getDay() - 1;
                if (!diasHabilitados.includes(pyDay)) return;
                setFechaSeleccionada(day.dateString);
                setMostrarDisponibilidad(false);
                setMostrarCalendario(false);
              }}
              theme={{
                backgroundColor: '#FFFFFF',
                calendarBackground: '#FFFFFF',
                todayTextColor: colors.primary,
                arrowColor: colors.primary,
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
                textMonthFontSize: 16,
                monthTextColor: '#1E293B',
                textSectionTitleColor: '#64748B',
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Flotante WhatsApp (Decorativo para match de UI) */}
      <View style={s.fabWhatsapp}>
        <Image source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' }} style={{ width: 40, height: 40 }} />
      </View>

      {/* ── Modal Auth Cliente ───────────────────────────────────────────────── */}
      <Modal visible={mostrarAuthCliente} animationType="slide" transparent={true}>
        {authPaso === 'inicio' ? (
          <View style={s.authInicioContainer}>
            <TouchableOpacity style={s.authCloseTopBtn} onPress={() => { setMostrarAuthCliente(false); setAuthPaso('inicio'); }}>
              <Feather name="x" size={28} color="#FFF" />
            </TouchableOpacity>
            
            <Text style={s.authInicioTitle}>Agenda tu servicio en segundos.</Text>
            
            {/* Ilustración central */}
            <View style={s.authIllustrationContainer}>
              {/* En caso de no tener la imagen exacta, usamos un icono grande o placeholder que de la misma vibra */}
              <Text style={s.authFlowyLogo}>Flowy</Text>
              <View style={s.authIllustrationCircle}>
                <Feather name="user-check" size={80} color="#4F46E5" />
              </View>
            </View>

            <TouchableOpacity 
              style={s.authInicioBtnBlack} 
              onPress={() => { setAuthModo('login'); setAuthPaso('formulario'); }}
            >
              <Text style={s.authInicioBtnTxt}>INGRESAR</Text>
            </TouchableOpacity>

            <Text style={s.authInicioLinkTxt}>¿No tienes una cuenta?</Text>

            <TouchableOpacity 
              style={s.authInicioBtnBlack} 
              onPress={() => { setAuthModo('registro'); setAuthPaso('formulario'); }}
            >
              <Text style={s.authInicioBtnTxt}>REGISTRARSE</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.authInicioBtnBlack, { backgroundColor: '#FFF', marginTop: 16 }]} 
              onPress={() => promptAsync()}
              disabled={!request || authCargando}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {authCargando ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Feather name="globe" size={18} color="#000" style={{ marginRight: 8 }} />
                    <Text style={[s.authInicioBtnTxt, { color: '#000' }]}>CONTINUAR CON GOOGLE</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.authOverlay}>
            <View style={s.authSheet}>
              {/* Handle bar */}
              <View style={s.authHandle} />

              <View style={s.authTopRow}>
                <Text style={s.authTitle}>
                  {authModo === 'login' ? '¡Bienvenido de vuelta!' : 'Crea tu cuenta gratis'}
                </Text>
                <TouchableOpacity onPress={() => { setAuthPaso('inicio'); setAuthError(''); }}>
                  <Feather name="x" size={22} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              <Text style={s.authSubtitle}>
                {authModo === 'login'
                  ? 'Inicia sesión para continuar con tu compra.'
                  : 'Regístrate para guardar tus reservas y compras.'}
              </Text>

              {authError ? (
                <View style={s.authErrorBox}>
                  <Feather name="alert-circle" size={14} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={s.authErrorTxt}>{authError}</Text>
                </View>
              ) : null}

              {authModo === 'registro' && (
                <>
                  <TextInput style={s.authInput} placeholder="Tu nombre completo" value={authNombre} onChangeText={setAuthNombre} />
                  <TextInput style={s.authInput} placeholder="Celular (opcional)" keyboardType="phone-pad" value={authTelefono} onChangeText={setAuthTelefono} />
                </>
              )}
              <TextInput style={s.authInput} placeholder="Correo electrónico" keyboardType="email-address" autoCapitalize="none" value={authEmail} onChangeText={setAuthEmail} />
              <TextInput style={s.authInput} placeholder="Contraseña (mínimo 6 caracteres)" secureTextEntry value={authPassword} onChangeText={setAuthPassword} />

              <TouchableOpacity
                style={s.authBtn}
                onPress={authModo === 'login' ? loginCliente : registrarCliente}
                disabled={authCargando}
              >
                {authCargando
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={s.authBtnTxt}>{authModo === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta y Continuar'}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={s.authSwitchRow}
                onPress={() => { setAuthModo(authModo === 'login' ? 'registro' : 'login'); setAuthError(''); }}
              >
                <Text style={s.authSwitchTxt}>
                  {authModo === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                  <Text style={{ color: '#4F46E5', fontWeight: '500' }}>
                    {authModo === 'login' ? 'Regístrate' : 'Inicia sesión'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  topBarFlowy: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logoFlowy: {
    height: 44,
    width: 160,
    resizeMode: 'contain',
  },
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    paddingTop: Platform.OS === 'web' ? 14 : 50,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  empresaHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarContainer: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: '#D946EF', // Rosa/Morado
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#EEF2FF', marginRight: 12,
    overflow: 'hidden'
  },
  avatarImg: { width: '100%', height: '100%' },
  empresaNombre: { fontSize: 18, fontWeight: '500', color: '#1E293B', marginRight: 6 },
  verifiedBadge: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#3B82F6',
    justifyContent: 'center', alignItems: 'center',
  },

  carritoBtn: { position: 'relative', padding: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6 },
  badge: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#4F46E5', borderRadius: 10,
    minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  
  scroll: { flexGrow: 1 },

  btnSelectServicio: { flexDirection: 'row', alignItems: 'center', padding: 12, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  btnSelectServicioTxt: { fontSize: 14, color: '#666', marginRight: 6 },
  dropdown: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', marginHorizontal: 20, marginBottom: 10, borderRadius: 8 },
  dropdownFloat: { 
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', 
    borderRadius: 6, marginLeft: 60, marginTop: 4, marginBottom: 16 
  },
  dropItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropItemTxt: { fontSize: 15, color: '#333' },

  heroContainer: { width: '100%', alignItems: 'center', marginBottom: 20, backgroundColor: '#4F46E5' },
  heroImage: { width: '100%', height: 220 },
  dotsContainer: { flexDirection: 'row', marginTop: 12, gap: 8, position: 'absolute', bottom: 10 },
  dotActive: { width: 24, height: 8, backgroundColor: '#4F46E5', borderRadius: 4 },
  dotInactive: { width: 8, height: 8, backgroundColor: '#818CF8', borderRadius: 4, opacity: 0.6 },

  infoContainer: { paddingHorizontal: 24, marginBottom: 20 },
  serviceTitle: { fontSize: 24, color: '#4B5563', marginBottom: 4 },
  serviceDesc: { fontSize: 15, color: '#6B7280', marginBottom: 8, lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  servicePrice: { fontSize: 22, color: '#9CA3AF', marginBottom: 24, fontWeight: '500' },

  inputRow: { flexDirection: 'row', alignItems: 'center' },
  labelForm: { fontSize: 15, color: '#4B5563', width: 60 },
  
  selectInput: { 
    flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, 
    borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6,
    backgroundColor: '#fff'
  },
  selectInputTxt: { fontSize: 15, color: '#1E293B' },

  fechaChip: { paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, backgroundColor: '#fff' },
  fechaChipActiva: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF', borderWidth: 1.5 },
  chipText: { fontSize: 15, color: '#1E293B' },
  chipTextActiva: { color: '#4F46E5', fontWeight: '500' },

  orangeUnderline: { height: 3, backgroundColor: '#4F46E5', marginTop: 16, borderRadius: 2 },

  btnEligeDisp: { backgroundColor: '#A8B1B8', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 4 },
  btnDisabled: { opacity: 0.6 },
  btnEligeDispTxt: { color: '#fff', fontSize: 16, fontWeight: '500' },

  dispContainer: { paddingHorizontal: 20 },
  dispEncontradaTxt: { textAlign: 'center', color: '#9CA3AF', fontSize: 16, marginBottom: 16 },

  tabsContainer: { flexDirection: 'row', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  tabActive: { backgroundColor: '#4F46E5' },
  tabTxt: { fontSize: 16, fontWeight: '500', color: '#000' },
  tabTxtActive: { color: '#fff' },

  slotsListContainer: { borderWidth: 1, borderColor: '#E5E7EB', borderTopWidth: 0 },
  emptySlots: { padding: 24, textAlign: 'center', color: '#6B7280', fontSize: 15 },

  slotItem: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  slotHeader: { backgroundColor: '#F9FAFB', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  slotHeaderLeft: { flex: 1 },
  slotFechaHora: { fontSize: 15, color: '#000', fontWeight: '500' },
  slotPrecio: { fontSize: 15, fontWeight: '500', color: '#000' },
  btnOcultarTxt: { fontSize: 14, color: '#4F46E5', fontWeight: '500' },

  slotBody: { padding: 16, paddingBottom: 24, backgroundColor: '#fff' },
  bodyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bodyLabel: { width: 90, fontSize: 15, color: '#000' },
  bodyValue: { flex: 1, fontSize: 15, color: '#000' },
  
  cantidadSelector: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4 },
  cantNum: { paddingHorizontal: 18, fontSize: 15, color: '#000', fontWeight: '500' },
  cantControls: { borderLeftWidth: 1, borderLeftColor: '#D1D5DB' },

  accionesLineaUnica: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'nowrap', gap: 8, marginTop: 16 },
  cantidadWrapper: { flexDirection: 'row', alignItems: 'center' },
  bodyLabelInline: { fontSize: 14, color: '#000', marginRight: 6 },
  botonesWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' },
  
  accionesRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  btnAgregarBlanco: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4 },
  btnAgregarBlancoTxt: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  btnCompraRapida: { paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#4F46E5', borderRadius: 4 },
  btnCompraRapidaTxt: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },

  warningBox: { paddingHorizontal: 24, marginBottom: 10 },
  warningHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  warningTitle: { fontSize: 15, fontWeight: '500', color: '#F97316', marginLeft: 6 },
  warningText: { fontSize: 14, color: '#6B7280', lineHeight: 22 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '90%', borderRadius: 12, padding: 16, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '500', color: '#4B5563' },

  fabWhatsapp: { position: 'absolute', bottom: 24, right: 24, zIndex: 100 },

  // ── Auth Modal ───────────────────────────────────────────────────────────────
  authOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  authSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },
  authHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  authTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  authTitle: { fontSize: 22, fontWeight: '500', color: '#1E293B' },
  authSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 20, lineHeight: 20 },
  authErrorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, marginBottom: 14 },
  authErrorTxt: { color: '#DC2626', fontSize: 13, flex: 1 },
  authInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1E293B', marginBottom: 12 },
  authBtn: { backgroundColor: '#4F46E5', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  authBtnTxt: { color: '#FFF', fontWeight: '500', fontSize: 16 },
  authSwitchRow: { alignItems: 'center', marginTop: 16 },
  authSwitchTxt: { fontSize: 14, color: '#64748B' },

  // ── Pantalla de Inicio Flowy (Auth) ──────────────────────────────────────────
  authInicioContainer: { flex: 1, backgroundColor: '#4F46E5', padding: 24, justifyContent: 'center' },
  authCloseTopBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, right: 20, zIndex: 10 },
  authInicioTitle: { fontSize: 26, fontWeight: '500', color: '#FFF', textAlign: 'center', marginBottom: 40 },
  authIllustrationContainer: { alignItems: 'center', marginBottom: 60 },
  authFlowyLogo: { fontSize: 48, fontWeight: '500', color: '#FFF', marginBottom: 20, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 8 },
  authIllustrationCircle: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  authInicioBtnBlack: { backgroundColor: '#000', borderRadius: 30, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', width: '100%', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  authInicioBtnTxt: { color: '#FFF', fontWeight: '500', fontSize: 15, letterSpacing: 1 },
  authInicioLinkTxt: { color: '#FFF', textAlign: 'center', fontSize: 14, marginVertical: 16, opacity: 0.9 },
});
