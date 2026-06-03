import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  ScrollView, TextInput, Alert, Platform, ActivityIndicator, Image
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, shadows } from '../theme/colors';
import { typography } from '../theme/typography';
import { DjangoEmpresaRepository } from '../../core/infraestructura/empresas/DjangoEmpresaRepository';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

const empresaRepository = new DjangoEmpresaRepository();

export const EditarEmpresaScreen = ({ route, navigation }: any) => {
  const onGuardado = route?.params?.onGuardado;

  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [loadingFetch, setLoadingFetch] = useState(true);
  
  const [nombre, setNombre] = useState('');
  const [pais, setPais] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correoContacto, setCorreoContacto] = useState('');
  const [moneda, setMoneda] = useState('');
  const [mensajeAdvertencia, setMensajeAdvertencia] = useState('');
  
  // Categoría
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [categoriaNombre, setCategoriaNombre] = useState('');
  const [categorias, setCategorias] = useState<{ id: string; nombre: string; icono: string | null }[]>([]);
  const [showCategoriaModal, setShowCategoriaModal] = useState(false);
  
  const [showMonedaModal, setShowMonedaModal] = useState(false);
  
  // API Data
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingCities, setLoadingCities] = useState(false);
  
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const token = await obtenerTokenLocal();
        if (token && token.access) {
          const p = JSON.parse(atob(token.access.split('.')[1]));
          const id = p.user_id;
          setEmpresaId(id);
          
          // Fetch enterprise data
          const data = await empresaRepository.obtenerEmpresaPrivada(id);
          if (data) {
            setNombre(data.nombre || '');
            setPais(data.pais || '');
            setCiudad(data.ciudad || '');
            setDireccion(data.direccion || '');
            setTelefono(data.telefono || '');
            setCorreoContacto(data.correo_contacto || '');
            setMoneda(data.moneda || 'COP');
            setMensajeAdvertencia(data.mensaje_advertencia || '');
            setLogoUrl(data.logo_url || null);
            setCategoriaId(data.categoria_id || null);
            setCategoriaNombre(data.categoria_nombre || '');

            // Fetch cities if country is already set
            if (data.pais) {
              fetchCities(data.pais);
            }
          }
          
          // Fetch countries
          fetch('https://countriesnow.space/api/v0.1/countries/positions')
            .then(res => res.json())
            .then(json => {
              if (!json.error) setCountries(json.data);
            }).catch(e => console.error("Error fetching countries:", e));

          // Fetch categorías (endpoint público, sin auth)
          fetch('https://agenda-production-ae37.up.railway.app/api/empresas/publicas/categorias/')
            .then(res => res.json())
            .then(json => {
              if (json.ok) setCategorias(json.datos || []);
            }).catch(() => {});
        }
      } catch (e) {
        console.error("Error init EditarEmpresa:", e);
      } finally {
        setLoadingFetch(false);
      }
    };
    init();
  }, []);

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setLogoUrl(asset.uri);
      if (asset.base64) {
        setLogoBase64(`data:image/jpeg;base64,${asset.base64}`);
      }
    }
  };

  const fetchCities = async (countryName: string) => {
    setLoadingCities(true);
    try {
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: countryName })
      });
      const json = await res.json();
      if (!json.error) {
        setCities(json.data);
      } else {
        setCities([]);
      }
    } catch (e) {
      console.error("Error fetching cities:", e);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleGuardar = async () => {
    if (!empresaId) {
      Alert.alert('Error', 'No se pudo identificar la empresa.');
      return;
    }
    
    setLoading(true);
    try {
      // Guardar imagenes si cambió
      if (logoBase64) {
        await empresaRepository.actualizarImagenes(empresaId, logoBase64);
      }

      // Guardar categoría si cambió
      if (categoriaId !== undefined) {
        const token = await (await import('../../core/infraestructura/auth/TokenStorageAdapter')).obtenerTokenLocal();
        await fetch(`https://agenda-production-ae37.up.railway.app/api/empresas/admin/${empresaId}/categoria/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token?.access ? { Authorization: `Bearer ${token.access}` } : {}),
          },
          body: JSON.stringify({ categoria_id: categoriaId }),
        });
      }

      // Guardar datos
      const ok = await empresaRepository.actualizarDatos(empresaId, {
        nombre: nombre.trim() || null,
        pais: pais.trim() || null,
        ciudad: ciudad.trim() || null,
        direccion: direccion.trim() || null,
        telefono: telefono.trim() || null,
        correo_contacto: correoContacto.trim() || null,
        moneda: moneda.trim() || 'COP',
        mensaje_advertencia: mensajeAdvertencia.trim() || null,
      });

      if (ok) {
        if (onGuardado) onGuardado({ nombre, pais, ciudad, direccion, telefono, correo_contacto: correoContacto, moneda });
        Alert.alert('Éxito', 'Perfil actualizado correctamente.');
        navigation.goBack();
      } else {
        Alert.alert('Error', 'No se pudieron guardar los cambios.');
      }
    } catch {
      Alert.alert('Error', 'Problema de conexión al guardar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="x" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.primary }]}>Editar Empresa</Text>
        <TouchableOpacity onPress={handleGuardar} disabled={loading || loadingFetch} style={styles.saveButton}>
          {loading
            ? <ActivityIndicator size="small" color={colors.surface} />
            : <Text style={[typography.button, { color: colors.surface }]}>Guardar</Text>}
        </TouchableOpacity>
      </View>

      {loadingFetch ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Logo Upload */}
          <View style={styles.logoSection}>
            <TouchableOpacity style={styles.logoContainer} onPress={handlePickImage}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.logoImage} />
              ) : (
                <Feather name="camera" size={40} color={colors.textSubtitle} />
              )}
              <View style={styles.editBadge}>
                <Feather name="edit-2" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.logoHint}>Toca para cambiar el logotipo</Text>
          </View>

          <Text style={styles.sectionLabel}>INFORMACIÓN BÁSICA</Text>
          <View style={styles.fieldCard}>
            <InputRow icon="briefcase" label="Nombre de la Empresa" value={nombre} onChangeText={setNombre} placeholder="Ej: Mi Negocio" />
            <View style={styles.divider} />
            <SelectRow
              icon="grid"
              label="Categoría"
              value={categoriaNombre}
              onPress={() => setShowCategoriaModal(true)}
            />
          </View>

          <Text style={styles.sectionLabel}>INFORMACIÓN DE UBICACIÓN</Text>
          <View style={styles.fieldCard}>
            <SelectRow 
              icon="globe" 
              label="País" 
              value={pais} 
              onPress={() => { setSearchQuery(''); setShowCountryModal(true); }} 
            />
            <View style={styles.divider} />
            <SelectRow 
              icon="map-pin" 
              label="Ciudad" 
              value={ciudad} 
              onPress={() => {
                if (!pais) {
                  Alert.alert("Atención", "Por favor selecciona un país primero.");
                  return;
                }
                setSearchQuery(''); 
                setShowCityModal(true);
              }} 
            />
            <View style={styles.divider} />
            <InputRow icon="home" label="Dirección" value={direccion} onChangeText={setDireccion} placeholder="Ej: Calle 52" />
          </View>

          <Text style={styles.sectionLabel}>CONTACTO Y PREFERENCIAS</Text>
          <View style={styles.fieldCard}>
            <InputRow
              icon="mail"
              label="Correo Electrónico (Contacto Público)"
              value={correoContacto}
              onChangeText={setCorreoContacto}
              placeholder="Ej: info@empresa.com"
              keyboardType="email-address"
            />
            <View style={styles.divider} />
            <InputRow
              icon="phone"
              label="Teléfono / WhatsApp"
              value={telefono}
              onChangeText={setTelefono}
              placeholder="Ej: +57 316 123 4567"
              keyboardType="phone-pad"
            />
            <View style={styles.divider} />
            <SelectRow 
              icon="dollar-sign" 
              label="Moneda" 
              value={moneda} 
              onPress={() => setShowMonedaModal(true)} 
            />
          </View>

          <Text style={styles.sectionLabel}>TÉRMINOS Y CONDICIONES (PÚBLICO)</Text>
          <View style={styles.fieldCard}>
            <InputRow
              icon="file-text"
              label="Mensaje de Advertencia / Tarifas (Ten en cuenta)"
              value={mensajeAdvertencia}
              onChangeText={setMensajeAdvertencia}
              placeholder="Ej: Las tarifas pueden variar..."
              multiline={true}
            />
          </View>

          <Text style={styles.hint}>
            💡 La moneda (COP, USD) define cómo se muestran tus precios a los clientes. El teléfono se usa para WhatsApp.
          </Text>

        </ScrollView>
      )}

      {/* Categoria Modal */}
      {showCategoriaModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Categoría</Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => { setCategoriaId(null); setCategoriaNombre('Sin categoría'); setShowCategoriaModal(false); }}
              >
                <Text style={styles.modalOptionText}>Sin categoría</Text>
                {!categoriaId && <Feather name="check" size={20} color={colors.primary} />}
              </TouchableOpacity>
              {categorias.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.modalOption}
                  onPress={() => { setCategoriaId(cat.id); setCategoriaNombre(cat.nombre); setShowCategoriaModal(false); }}
                >
                  <Text style={styles.modalOptionText}>{cat.nombre}</Text>
                  {categoriaId === cat.id && <Feather name="check" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
              {categorias.length === 0 && (
                <Text style={{ textAlign: 'center', marginVertical: 20, color: colors.textSubtitle }}>
                  No hay categorías creadas aún.
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCategoriaModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Moneda Modal */}
      {showMonedaModal && (
        <SelectionModal
          title="Seleccionar Moneda"
          data={['COP', 'USD', 'EUR', 'MXN']}
          selectedValue={moneda}
          onSelect={(val) => { setMoneda(val); setShowMonedaModal(false); }}
          onClose={() => setShowMonedaModal(false)}
        />
      )}

      {/* Country Modal */}
      {showCountryModal && (
        <SelectionModal
          title="Seleccionar País"
          data={countries.map(c => c.name)}
          selectedValue={pais}
          onSelect={(val) => { 
            setPais(val); 
            setCiudad(''); 
            setShowCountryModal(false); 
            fetchCities(val); 
          }}
          onClose={() => setShowCountryModal(false)}
          searchable={true}
        />
      )}

      {/* City Modal */}
      {showCityModal && (
        <SelectionModal
          title="Seleccionar Ciudad"
          data={cities}
          selectedValue={ciudad}
          onSelect={(val) => { setCiudad(val); setShowCityModal(false); }}
          onClose={() => setShowCityModal(false)}
          searchable={true}
          loading={loadingCities}
        />
      )}
    </SafeAreaView>
  );
};

/* ── Campo de formulario reutilizable ── */
const InputRow = ({
  icon, label, value, onChangeText, placeholder, keyboardType = 'default', autoCapitalize = 'none'
}: any) => (
  <View style={styles.inputRow}>
    <View style={styles.inputIconContainer}>
      <Feather name={icon} size={18} color={colors.primary} />
    </View>
    <View style={styles.inputTextArea}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.textInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtitle}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={true}
        numberOfLines={icon === 'file-text' ? 3 : 1}
      />
    </View>
  </View>
);

const SelectRow = ({ icon, label, value, onPress }: any) => (
  <TouchableOpacity style={styles.inputRow} onPress={onPress}>
    <View style={styles.inputIconContainer}>
      <Feather name={icon} size={18} color={colors.primary} />
    </View>
    <View style={styles.inputTextArea}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.textInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={{ fontSize: 15, color: value ? colors.primary : colors.textSubtitle }}>{value || 'Seleccionar...'}</Text>
        <Feather name="chevron-down" size={18} color={colors.textSubtitle} />
      </View>
    </View>
  </TouchableOpacity>
);

const SelectionModal = ({ title, data, selectedValue, onSelect, onClose, searchable, loading }: any) => {
  const [query, setQuery] = useState('');
  
  const filteredData = data.filter((item: string) => 
    item.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 50); // Limit to 50 for performance

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, searchable && { height: '80%' }]}>
        <Text style={styles.modalTitle}>{title}</Text>
        
        {searchable && (
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            value={query}
            onChangeText={setQuery}
          />
        )}

        {loading ? (
          <View style={{ padding: 20 }}><ActivityIndicator size="small" color={colors.primary}/></View>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">
            {filteredData.length === 0 ? (
              <Text style={{ textAlign: 'center', marginVertical: 20, color: colors.textSubtitle }}>No se encontraron resultados</Text>
            ) : (
              filteredData.map((opt: string) => (
                <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => onSelect(opt)}>
                  <Text style={styles.modalOptionText}>{opt}</Text>
                  {selectedValue === opt && <Feather name="check" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}

        <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
          <Text style={styles.modalCancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 20,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  backButton: { padding: 6 },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  scrollContent: { padding: 24, paddingBottom: 60 },
  
  logoSection: { alignItems: 'center', marginBottom: 20 },
  logoContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(11,42,86,0.05)',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative'
  },
  logoImage: { width: 100, height: 100, borderRadius: 50 },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: colors.primary, width: 30, height: 30,
    borderRadius: 15, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF'
  },
  logoHint: { marginTop: 10, fontSize: 12, color: colors.textSubtitle },

  sectionLabel: {
    fontSize: 11, fontWeight: '500', color: colors.textSubtitle,
    letterSpacing: 1.2, marginBottom: 10, marginTop: 20, marginLeft: 4,
  },
  fieldCard: {
    backgroundColor: colors.surface, borderRadius: 20,
    paddingHorizontal: 5, ...shadows.soft,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15 },
  inputIconContainer: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(11,42,86,0.05)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  inputTextArea: { flex: 1 },
  inputLabel: { fontSize: 11, color: colors.textSubtitle, marginBottom: 4 },
  textInput: { 
    fontSize: 15, 
    color: colors.primary, 
    backgroundColor: 'rgba(0,0,0,0.03)', 
    borderRadius: 8, 
    paddingHorizontal: 10, 
    paddingVertical: 8, 
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 15 },
  hint: { fontSize: 12, color: colors.textSubtitle, marginTop: 20, lineHeight: 18, paddingHorizontal: 4 },

  modalOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#FFF', width: '85%', borderRadius: 16, padding: 20, ...shadows.medium,
    maxHeight: '90%'
  },
  modalTitle: { fontSize: 16, fontWeight: '500', color: colors.primary, marginBottom: 15, textAlign: 'center' },
  searchInput: {
    backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 10, fontSize: 14, color: colors.primary, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)'
  },
  modalOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalOptionText: { fontSize: 15, color: colors.text },
  modalCancel: { marginTop: 15, alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { fontSize: 15, fontWeight: '500', color: '#EF4444' }
});
