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

  useEffect(() => {
    console.log('[ReservarScreen] params:', route.params);
    console.log('[ReservarScreen] idToUse:', idToUse);
    if (idToUse) cargarServicios();
  }, [idToUse]);

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
    
    try {
      setLoading(true);
      const res = await fetch(`https://agenda-production-ae37.up.railway.app/api/citas/reservar-guest/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (e) {
      setLoading(false);
      Alert.alert('Error', 'Hubo un problema de conexión.');
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

  const renderStep3 = () => (
    <View style={s.stepContainer}>
      <Text style={s.stepTitle}>Elige fecha y hora</Text>
      
      {/* Selector de fecha muy básico por ahora */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
        {['2026-05-13', '2026-05-14', '2026-05-15'].map(f => (
          <TouchableOpacity 
            key={f}
            style={[s.dateChip, fechaSeleccionada === f && s.dateChipActive]}
            onPress={() => { setFechaSeleccionada(f); cargarSlots(f); setHoraSeleccionada(''); }}
          >
            <Text style={[s.dateChipText, fechaSeleccionada === f && s.dateChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.stepSubtitle}>Horas disponibles:</Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : (
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
          {!slots.length && fechaSeleccionada && <Text>No hay horarios este día.</Text>}
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
    
    return (
      <View style={s.stepContainer}>
        <Text style={s.stepTitle}>Resumen</Text>
        
        <View style={s.resumenCard}>
          <Text style={s.resumenRow}>Servicio: {servicioSeleccionado?.nombre}</Text>
          <Text style={s.resumenRow}>Precio: {formatearMoneda(servicioSeleccionado?.precio || 0, moneda)}</Text>
          {isCita && <Text style={s.resumenRow}>Día: {fechaSeleccionada}</Text>}
          {isCita && <Text style={s.resumenRow}>Hora: {horaSeleccionada}</Text>}
          <Text style={s.resumenRow}>A nombre de: {clienteNombre}</Text>
        </View>

        <TouchableOpacity style={s.btnNext} onPress={confirmarReserva}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnNextText}>Confirmar y Pagar</Text>}
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
});
