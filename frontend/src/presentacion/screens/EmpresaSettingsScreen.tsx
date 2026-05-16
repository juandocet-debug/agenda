import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { typography } from '../theme/typography';
import { Card } from '../components/Card';

const PALETTE = ['#4A72FF', '#FF4B4B', '#00C48C', '#FF9F43', '#8E44AD', '#333333'];

export const EmpresaSettingsScreen = () => {
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4A72FF');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('¡Identidad actualizada con éxito!');
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[typography.h1, { color: primaryColor }]}>Identidad Visual</Text>
          <Text style={[typography.body, { color: colors.textSubtitle, marginTop: 4 }]}>
            Personaliza cómo ven tus clientes la app
          </Text>
        </View>

        {/* Logo Section */}
        <Card style={styles.card}>
          <Text style={[typography.h3, styles.sectionTitle, { color: primaryColor }]}>Logo de tu Negocio</Text>
          <View style={styles.inputWrapper}>
            <Feather name="image" size={20} color={colors.textSubtitle} style={{ marginRight: 12 }} />
            <TextInput 
              placeholder="https://ejemplo.com/tu-logo.png"
              placeholderTextColor={colors.textSubtitle}
              style={styles.searchInput}
              value={logoUrl}
              onChangeText={setLogoUrl}
            />
          </View>
          {logoUrl ? (
            <View style={styles.logoPreviewContainer}>
              {/* Fallback preview a un contenedor gris si falla */}
              <View style={styles.logoPreviewMock}>
                <Text style={{color: '#999'}}>Preview URL</Text>
              </View>
            </View>
          ) : null}
        </Card>

        {/* Colors Section */}
        <Card style={styles.card}>
          <Text style={[typography.h3, styles.sectionTitle, { color: primaryColor }]}>Color Primario</Text>
          <Text style={[typography.caption, { color: colors.textSubtitle, marginBottom: 15 }]}>
            Este color teñirá los botones y encabezados de la app para tus clientes.
          </Text>
          
          <View style={styles.paletteContainer}>
            {PALETTE.map((c) => (
              <TouchableOpacity 
                key={c}
                style={[
                  styles.colorCircle, 
                  { backgroundColor: c },
                  primaryColor === c && styles.colorCircleSelected
                ]}
                onPress={() => setPrimaryColor(c)}
              >
                {primaryColor === c && <Feather name="check" size={20} color="#FFF" />}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Live Preview Section */}
        <Text style={[typography.h3, { color: colors.textSubtitle, marginTop: 20, marginBottom: 10, alignSelf: 'center' }]}>
          Previsualización en Vivo
        </Text>
        <Card style={[styles.card, { borderColor: primaryColor, borderWidth: 2 }]}>
          <View style={[styles.previewHeader, { backgroundColor: primaryColor }]}>
            <Text style={{color: '#FFF', fontWeight: '500', fontSize: 16}}>Reserva de Cita</Text>
          </View>
          <View style={{padding: 20}}>
            <Text style={{color: '#333', fontSize: 14, marginBottom: 15}}>Elige tu servicio y horario.</Text>
            <TouchableOpacity style={[styles.previewButton, { backgroundColor: primaryColor }]}>
              <Text style={{color: '#FFF', fontWeight: '500'}}>Agendar Ahora</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: primaryColor }]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={[typography.h3, { color: '#FFF' }]}>
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 30,
    marginTop: 20,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 15,
    height: 55,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  logoPreviewContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  logoPreviewMock: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD'
  },
  paletteContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    justifyContent: 'center'
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
    transform: [{ scale: 1.1 }]
  },
  previewHeader: {
    height: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    margin: -20,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  previewButton: {
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  saveButton: {
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  }
});
