import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Image, TextInput, ActivityIndicator, Alert, Platform, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatearMoneda } from '../../core/utils/currencyFormatter';

// Interfaces
interface Servicio { id: string; nombre: string; precio: string; tipo_servicio?: string; duracion?: number; descripcion?: string; imagen_url?: string; }
interface Profesional { id: string; nombre: string; foto_url?: string; especialidad?: string; }
interface Slot { hora: string; }

export const ReservarScreen = ({ route, navigation }: any) => {
  // empresaId puede llegar como param directo, empresa_id (desde el Muro),
  // o como empresaId (desde el deep link /reservar/:empresaId)
  const { empresaId, empresa_id, servicioIdInicial } = route.params || {};
  const idToUse = empresaId || empresa_id;

  // Estado del Wizard
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  // Cuando el cliente cierra el wizard, mostramos pantalla neutra
  // en vez de navegar al dashboard de la empresa (que es privado)
  const [cancelada, setCancelada] = useState(false);

  // Selecciones
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<Profesional | null>(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(''); // YYYY-MM-DD
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>(''); // HH:MM
  
  // Datos Cliente (Guest)
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');

  // Datos Remotos
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [moneda, setMoneda] = useState('COP');
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  // dias_semana (0=Lun..6=Dom) que la empresa tiene habilitados
  const [diasHabilitados, setDiasHabilitados] = useState<number[]>([]);
  const [cargandoCalendario, setCargandoCalendario] = useState(false);

  useEffect(() => {
    if (idToUse) {
      cargarServicios();
      cargarDiasHabilitados();
    }
  }, [idToUse]);

  const cargarDiasHabilitados = async () => {
    try {
      const res = await fetch(`https://agenda-production-ae37.up.railway.app/api/citas/horario/${idToUse}/`);
      const data = await res.json();
      if (data.ok) {
        setDiasHabilitados(data.datos.filter((h: any) => h.activo).map((h: any) => h.dia_semana));
      }
    } catch (e) {
      console.log('Error cargando dias habilitados:', e);
    }
  };

  // Genera los próximos `cantidad` días hábiles desde hoy según diasHabilitados
  const generarFechasDisponibles = (cantidad = 30): string[] => {
    if (diasHabilitados.length === 0) return [];
    const fechas: string[] = [];
    const hoy = new Date();
    for (let i = 0; i < 90 && fechas.length < cantidad; i++) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i + 1); // empezamos mañana
      // getDay() retorna 0=Dom,1=Lun...6=Sáb → convertir a Python weekday (0=Lun..6=Dom)
      const jsDay = d.getDay(); // 0=Dom
      const pyDay = jsDay === 0 ? 6 : jsDay - 1; // 0=Dom→6, 1=Lun→0, etc.
      if (diasHabilitados.includes(pyDay)) {
        const iso = d.toISOString().split('T')[0];
        fechas.push(iso);
      }
    }
    return fechas;
  };

  // Formato legible para chips de fecha: "Lun 14 may"
  const formatearFecha = (iso: string): { linea1: string; linea2: string } => {
    const d = new Date(iso + 'T00:00:00');
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return {
      linea1: dias[d.getDay()],
      linea2: `${d.getDate()} ${meses[d.getMonth()]}`,
    };
  };

  const cargarServicios = async () => {
    try {
      setLoading(true);
      const res = await fetch(`https://agenda-production-ae37.up.railway.app/api/servicios/?empresa_id=${idToUse}`);
      const data = await res.json();
      if (data.ok) {
        setServicios(data.datos);
        if (data.moneda) setMoneda(data.moneda);
      }
    } catch (e) {
      console.log('Error servicios', e);
    } finally {
      setLoading(false);
    }
  };

  const cargarProfesionales = async () => {
    try {
      setLoading(true);
      const res = await fetch(`https://agenda-production-ae37.up.railway.app/api/profesionales/publico/${idToUse}/`);
      const data = await res.json();
      if (data.ok) setProfesionales(data.datos);
    } catch (e) {
      console.log('Error profesionales', e);
    } finally {
      setLoading(false);
    }
  };

  const cargarSlots = async (fecha: string) => {
    if (!servicioSeleccionado) return;
    try {
      setLoading(true);
      const profId = profesionalSeleccionado ? `&profesional_id=${profesionalSeleccionado.id}` : '';
      const res = await fetch(`https://agenda-production-ae37.up.railway.app/api/citas/slots/?empresa_id=${idToUse}&fecha=${fecha}&servicio_id=${servicioSeleccionado.id}${profId}`);
      const data = await res.json();
      if (data.ok) setSlots(data.datos);
    } catch (e) {
      console.log('Error slots', e);
    } finally {
      setLoading(false);
    }
  };

  const confirmarReserva = async () => {
    if (!clienteNombre || !clienteTelefono) {
      Alert.alert('Faltan datos', 'Nombre y teléfono son obligatorios.');
      return;
    }
    
    // Timeout de 20s para no dejar el spinner colgado si Railway está durmiendo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      setLoading(true);
      const res = await fetch(`https://agenda-production-ae37.up.railway.app/api/citas/reservar-guest/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          empresa_id: idToUse,
          servicio_id: servicioSeleccionado?.id,
          profesional_id: profesionalSeleccionado?.id,
          fecha: fechaSeleccionada,
          hora_inicio: horaSeleccionada,
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono,
          cliente_email: clienteEmail
        })
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      setLoading(false);
      
      if (res.status === 409 && data.codigo === 'TRASLAPE') {
        // Hay traslape — sugerir profesional alternativo
        const alternativos: any[] = data.alternativos || [];
        if (alternativos.length > 0) {
          const nombres = alternativos.map((p: any) => `• ${p.nombre}${p.especialidad ? ` (${p.especialidad})` : ''}`).join('\n');
          Alert.alert(
            '⚠️ Horario ocupado',
            `Ese horario ya está reservado para el profesional seleccionado.\n\nProfesionales disponibles en ese horario:\n${nombres}\n\n¿Deseas elegir otro profesional?`,
            [
              { text: 'Elegir otro horario', onPress: () => setStep(3) },
              { text: 'Cambiar profesional', onPress: () => setStep(2) },
            ]
          );
        } else {
          Alert.alert('⚠️ Horario ocupado', 'Todos los profesionales están ocupados en ese horario. Por favor elige otro.', [
            { text: 'Elegir otro horario', onPress: () => setStep(3) }
          ]);
        }
        return;
      }

      if (data.ok) {
        // El backend ya devuelve checkout_url directamente
        navigation.navigate('ConfirmacionReserva', {
          citaId: data.datos.cita_id,
          checkoutUrl: data.datos.checkout_url,
          resumen: data.datos,
        });
      } else {
        Alert.alert('Error', data.error || 'No se pudo crear la cita.');
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      setLoading(false);
      if (e?.name === 'AbortError') {
        Alert.alert(
          'Servidor tardando en responder',
          'El servidor está iniciando. Espera 10 segundos y vuelve a intentarlo.'
        );
      } else {
        Alert.alert('Error de conexión', 'No se pudo completar la reserva. Verifica tu internet e intenta de nuevo.');
      }
    }
  };


  // --- RENDERIZADO DE PASOS ---

  const renderStep1 = () => (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>¿Qué servicio deseas?</Text>
      <FlatList
        data={servicios}
        keyExtractor={s => s.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[s.card, servicioSeleccionado?.id === item.id && s.cardSelected]}
            onPress={() => setServicioSeleccionado(item)}
          >
            {item.imagen_url ? (
              <Image source={{ uri: item.imagen_url }} style={s.servicioImage} />
            ) : (
              <View style={s.servicioPlaceholder}><Feather name="image" size={24} color="#CCC" /></View>
            )}
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={s.cardTitle}>{item.nombre}</Text>
              <Text style={s.cardSubtitle}>
                {item.tipo_servicio === 'CITA' ? `${item.duracion} min | ` : ''}{formatearMoneda(item.precio, moneda)}
              </Text>
            </View>
            {servicioSeleccionado?.id === item.id && <Feather name="check-circle" size={20} color={colors.primary} />}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity 
        style={[s.btnNext, !servicioSeleccionado && s.btnDisabled]} 
        disabled={!servicioSeleccionado}
        onPress={() => { 
          if (servicioSeleccionado?.tipo_servicio !== 'CITA') {
            // Salto rápido para Suscripciones/Experiencias
            setStep(4);
          } else {
            setStep(2); 
            cargarProfesionales(); 
          }
        }}
      >
        <Text style={s.btnNextText}>Siguiente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>¿Con quién te atiendes?</Text>
      
      <TouchableOpacity 
        style={[s.card, !profesionalSeleccionado && s.cardSelected]}
        onPress={() => setProfesionalSeleccionado(null)}
      >
        <View style={s.avatarPlaceholder}><Feather name="users" size={24} color={colors.text} /></View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={s.cardTitle}>Cualquiera disponible</Text>
          <Text style={s.cardSubtitle}>Te asignaremos el primero libre</Text>
        </View>
        {!profesionalSeleccionado && <Feather name="check-circle" size={20} color={colors.primary} />}
      </TouchableOpacity>

      <FlatList
        data={profesionales}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[s.card, profesionalSeleccionado?.id === item.id && s.cardSelected]}
            onPress={() => setProfesionalSeleccionado(item)}
          >
            {item.foto_url ? (
              <Image source={{ uri: item.foto_url }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}><Feather name="user" size={24} color={colors.text} /></View>
            )}
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={s.cardTitle}>{item.nombre}</Text>
              <Text style={s.cardSubtitle}>{item.especialidad}</Text>
            </View>
            {profesionalSeleccionado?.id === item.id && <Feather name="check-circle" size={20} color={colors.primary} />}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={s.btnNext} onPress={() => setStep(3)}>
        <Text style={s.btnNextText}>Siguiente</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => {
    const fechasDisponibles = generarFechasDisponibles(30);

    return (
      <View style={s.stepContainer}>
        <Text style={s.stepTitle}>Elige una fecha</Text>

        {/* ── Sin horarios configurados ─── */}
        {diasHabilitados.length === 0 && (
          <View style={s.emptyBox}>
            <Feather name="clock" size={40} color="#D1D5DB" style={{ marginBottom: 12 }} />
            <Text style={s.emptyText}>Esta empresa aún no ha configurado sus horarios de atención.</Text>
          </View>
        )}

        {/* ── Chips de fechas habilitadas ─── */}
        {fechasDisponibles.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            <View style={s.fechasRow}>
              {fechasDisponibles.map(f => {
                const { linea1, linea2 } = formatearFecha(f);
                const activa = fechaSeleccionada === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[s.fechaChip, activa && s.fechaChipActive]}
                    onPress={() => {
                      setFechaSeleccionada(f);
                      setHoraSeleccionada('');
                      setSlots([]);
                      cargarSlots(f);
                    }}
                  >
                    <Text style={[s.fechaChipDia, activa && s.fechaChipTextActive]}>{linea1}</Text>
                    <Text style={[s.fechaChipNum, activa && s.fechaChipTextActive]}>{linea2}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* ── Slots de hora ─── */}
        {fechaSeleccionada !== '' && (
          <View style={{ marginTop: 20 }}>
            <Text style={s.stepSubtitle}>Horas disponibles:</Text>
            {loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} /> : (
              <View style={s.slotsGrid}>
                {slots.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[s.slotChip, horaSeleccionada === h && s.slotChipActive]}
                    onPress={() => setHoraSeleccionada(h)}
                  >
                    <Text style={[s.slotText, horaSeleccionada === h && s.slotTextActive]}>{h}</Text>
                  </TouchableOpacity>
                ))}
                {slots.length === 0 && (
                  <View style={s.emptyBox}>
                    <Feather name="calendar" size={28} color="#D1D5DB" style={{ marginBottom: 8 }} />
                    <Text style={s.emptyText}>No hay horas disponibles para este día.</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[s.btnNext, (!fechaSeleccionada || !horaSeleccionada) && s.btnDisabled]}
          disabled={!fechaSeleccionada || !horaSeleccionada}
          onPress={() => setStep(4)}
        >
          <Text style={s.btnNextText}>Siguiente</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep4 = () => (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>Tus Datos</Text>
      <Text style={s.stepSubtitle}>Para confirmar tu reserva</Text>

      <TextInput
        style={s.input}
        placeholder="Nombre completo *"
        value={clienteNombre}
        onChangeText={setClienteNombre}
      />
      <TextInput
        style={s.input}
        placeholder="Teléfono (WhatsApp) *"
        keyboardType="phone-pad"
        value={clienteTelefono}
        onChangeText={setClienteTelefono}
      />
      <TextInput
        style={s.input}
        placeholder="Email (opcional)"
        keyboardType="email-address"
        value={clienteEmail}
        onChangeText={setClienteEmail}
      />

      <TouchableOpacity style={s.btnNext} onPress={() => setStep(5)}>
        <Text style={s.btnNextText}>Revisar y Confirmar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep5 = () => {
    const isCita = servicioSeleccionado?.tipo_servicio === 'CITA';

    // Formatea la fecha a algo legible: "domingo, 25 de mayo"
    const fechaLegible = fechaSeleccionada ? (() => {
      const d = new Date(fechaSeleccionada + 'T00:00:00');
      return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    })() : '';

    return (
      <View style={s.stepContainer}>
        {/* Ícono grande de confirmación */}
        <View style={s.resumenIcono}>
          <Feather name="check-circle" size={48} color={colors.primary} />
        </View>
        <Text style={s.resumenTitulo}>¡Casi listo!</Text>
        <Text style={s.resumenSubtitulo}>Revisa los detalles antes de confirmar tu reserva</Text>

        {/* Card de detalles */}
        <View style={s.resumenCardPremium}>
          {/* Servicio */}
          <View style={s.resumenFila}>
            <View style={s.resumenIconoBadge}>
              <Feather name="scissors" size={16} color={colors.primary} />
            </View>
            <View style={s.resumenFilaTexto}>
              <Text style={s.resumenFilaLabel}>Servicio</Text>
              <Text style={s.resumenFilaValor}>{servicioSeleccionado?.nombre}</Text>
            </View>
          </View>
          <View style={s.resumenDivider} />

          {/* Precio */}
          <View style={s.resumenFila}>
            <View style={s.resumenIconoBadge}>
              <Feather name="tag" size={16} color={colors.primary} />
            </View>
            <View style={s.resumenFilaTexto}>
              <Text style={s.resumenFilaLabel}>Total a pagar</Text>
              <Text style={[s.resumenFilaValor, { color: colors.primary, fontSize: 20 }]}>
                {formatearMoneda(servicioSeleccionado?.precio || 0, moneda)}
              </Text>
            </View>
          </View>

          {isCita && (
            <>
              <View style={s.resumenDivider} />
              {/* Fecha */}
              <View style={s.resumenFila}>
                <View style={s.resumenIconoBadge}>
                  <Feather name="calendar" size={16} color={colors.primary} />
                </View>
                <View style={s.resumenFilaTexto}>
                  <Text style={s.resumenFilaLabel}>Fecha</Text>
                  <Text style={s.resumenFilaValor}>{fechaLegible}</Text>
                </View>
              </View>
              <View style={s.resumenDivider} />
              {/* Hora */}
              <View style={s.resumenFila}>
                <View style={s.resumenIconoBadge}>
                  <Feather name="clock" size={16} color={colors.primary} />
                </View>
                <View style={s.resumenFilaTexto}>
                  <Text style={s.resumenFilaLabel}>Hora</Text>
                  <Text style={s.resumenFilaValor}>{horaSeleccionada}</Text>
                </View>
              </View>
            </>
          )}

          <View style={s.resumenDivider} />
          {/* Profesional */}
          {profesionalSeleccionado && (
            <>
              <View style={s.resumenFila}>
                <View style={s.resumenIconoBadge}>
                  <Feather name="user" size={16} color={colors.primary} />
                </View>
                <View style={s.resumenFilaTexto}>
                  <Text style={s.resumenFilaLabel}>Profesional</Text>
                  <Text style={s.resumenFilaValor}>{profesionalSeleccionado.nombre}</Text>
                </View>
              </View>
              <View style={s.resumenDivider} />
            </>
          )}

          {/* Cliente */}
          <View style={s.resumenFila}>
            <View style={s.resumenIconoBadge}>
              <Feather name="user-check" size={16} color={colors.primary} />
            </View>
            <View style={s.resumenFilaTexto}>
              <Text style={s.resumenFilaLabel}>A nombre de</Text>
              <Text style={s.resumenFilaValor}>{clienteNombre}</Text>
              <Text style={s.resumenFilaDetalle}>{clienteTelefono}{clienteEmail ? ` · ${clienteEmail}` : ''}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[s.btnNext, s.btnConfirmar]}
          onPress={confirmarReserva}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Feather name="check" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={s.btnNextText}>Confirmar y Pagar</Text>
              </>}
        </TouchableOpacity>
      </View>
    );
  };

  // Pantalla neutra cuando el cliente cierra el wizard
  if (cancelada) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
          <Feather name="x-circle" size={64} color="#CBD5E0" />
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 20, textAlign: 'center' }}>
            Reserva cancelada
          </Text>
          <Text style={{ fontSize: 15, color: colors.textSubtitle, marginTop: 10, textAlign: 'center', lineHeight: 22 }}>
            Puedes cerrar esta ventana o volver a intentarlo cuando quieras.
          </Text>
          <TouchableOpacity
            style={[s.btnNext, { marginTop: 40, width: '100%' }]}
            onPress={() => { setCancelada(false); setStep(1); }}
          >
            <Text style={s.btnNextText}>Volver a intentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header limpio — sin título ni puntos */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.headerNavBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => {
            if (step === 1) setCancelada(true);
            else if (step === 4 && servicioSeleccionado?.tipo_servicio !== 'CITA') setStep(1);
            else setStep(prev => prev - 1);
          }}
        >
          <Feather name="arrow-left" size={22} color={colors.primary} />
        </TouchableOpacity>

        {/* Centro vacío — sin texto ni puntos */}
        <View />

        <TouchableOpacity
          style={s.headerNavBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => setCancelada(true)}
        >
          <Feather name="x" size={22} color="#E53E3E" />
        </TouchableOpacity>
      </View>

      {/* Barra de progreso */}
      <View style={s.progressBg}>
        <View style={[s.progressFill, { width: `${(step / 5) * 100}%` }]} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 50,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  headerNavBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  stepDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#DDD',
  },
  stepDotActive: {
    width: 18, height: 7, borderRadius: 4,
    backgroundColor: colors.primary,
  },
  stepDotDone: {
    backgroundColor: '#93C5FD',
  },
  progressBg: { height: 4, backgroundColor: '#E0E0E0', width: '100%' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  
  stepContainer: { flex: 1 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 10, color: colors.text },
  stepSubtitle: { fontSize: 16, color: colors.textSubtitle, marginBottom: 20 },
  
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 2, borderColor: 'transparent' },
  cardSelected: { borderColor: colors.primary },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  cardSubtitle: { fontSize: 14, color: colors.textSubtitle, marginTop: 4 },
  
  servicioImage: { width: 50, height: 50, borderRadius: 12 },
  servicioPlaceholder: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  
  avatar: { width: 50, height: 50, borderRadius: 25 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  
  dateChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#EEE' },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateChipText: { color: colors.text },
  dateChipTextActive: { color: '#FFF', fontWeight: 'bold' },
  
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  slotChip: { width: '30%', paddingVertical: 12, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  slotChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotText: { color: colors.text, fontWeight: '500' },
  slotTextActive: { color: '#FFF', fontWeight: 'bold' },
  
  input: { backgroundColor: colors.surface, padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16, borderColor: '#EEE', borderWidth: 1 },
  
  resumenCard: { backgroundColor: colors.surface, padding: 20, borderRadius: 12, marginBottom: 30 },
  resumenRow: { fontSize: 16, marginBottom: 10, color: colors.text },
  
  btnNext: { backgroundColor: colors.primary, padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 'auto' },
  btnDisabled: { opacity: 0.5 },
  btnNextText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Chips de fecha (calendario horizontal)
  fechasRow: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  fechaChip: {
    width: 68, paddingVertical: 12, borderRadius: 14,
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center', justifyContent: 'center',
  },
  fechaChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  fechaChipDia:    { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 2 },
  fechaChipNum:    { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  fechaChipTextActive: { color: '#FFF' },

  // Estado vacío
  emptyBox: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },

  // Resumen premium (Step 5)
  resumenIcono:       { alignItems: 'center', marginBottom: 10, marginTop: 10 },
  resumenTitulo:      { fontSize: 26, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  resumenSubtitulo:   { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  resumenCardPremium: { backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1.5, borderColor: '#F1F5F9', marginBottom: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  resumenFila:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14 },
  resumenIconoBadge:  { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary + '12', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  resumenFilaTexto:   { flex: 1 },
  resumenFilaLabel:   { fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  resumenFilaValor:   { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  resumenFilaDetalle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  resumenDivider:     { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 18 },
  btnConfirmar:       { flexDirection: 'row', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
});
