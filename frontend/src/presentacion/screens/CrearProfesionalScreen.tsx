import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Image, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { ApiProfesionalRepository } from '../../core/infraestructura/profesionales/ApiProfesionalRepository';
import { CrearProfesionalUseCase } from '../../core/aplicacion/profesionales/ProfesionalesUseCases';

export const CrearProfesionalScreen = ({ navigation }: any) => {
  const [nombre, setNombre] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const seleccionarFoto = async () => {
    // Pedir permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos permisos para acceder a tus fotos.');
      return;
    }

    // Opciones para seleccionar (solo base64 para enviarlo fácil al backend)
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true, // Esto nos devolverá el string base64 de la imagen
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      // Guardar el string en formato de URL base64 válida
      setFotoUrl(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const handleGuardar = async () => {
    if (!nombre || !especialidad || !email) {
      setError('Nombre, especialidad y correo son obligatorios.');
      return;
    }

    try {
      setCargando(true);
      setError('');
      
      const repo = new ApiProfesionalRepository();
      const useCase = new CrearProfesionalUseCase(repo);
      
      await useCase.ejecutar({
        nombre,
        especialidad,
        email,
        telefono,
        foto_url: fotoUrl
      });

      // Vuelve al dashboard si tuvo éxito
      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Error al guardar el profesional.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[typography.h2, { color: colors.primary }]}>Nuevo Profesional</Text>
        <View style={{ width: 24 }} /> {/* Spacer */}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.fotoContainer}>
          <TouchableOpacity onPress={seleccionarFoto}>
            {fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={styles.fotoPreview} />
            ) : (
              <View style={styles.fotoPlaceholder}>
                <Feather name="camera" size={32} color={colors.textSubtitle} />
                <Text style={[typography.caption, { color: colors.textSubtitle, marginTop: 8 }]}>Añadir Foto</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre Completo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Carlos Estilista"
            placeholderTextColor={colors.textSubtitle}
            value={nombre}
            onChangeText={setNombre}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Especialidad *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Barbero Senior"
            placeholderTextColor={colors.textSubtitle}
            value={especialidad}
            onChangeText={setEspecialidad}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Correo Electrónico *</Text>
          <TextInput
            style={styles.input}
            placeholder="carlos@ejemplo.com"
            placeholderTextColor={colors.textSubtitle}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="+57 300 000 0000"
            placeholderTextColor={colors.textSubtitle}
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveButton, cargando && { opacity: 0.7 }]} 
          onPress={handleGuardar}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Profesional</Text>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  content: {
    padding: 24,
  },
  fotoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  fotoPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  fotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    ...typography.h3,
    color: '#FFF',
  },
  errorText: {
    color: '#FF4B4B',
    marginBottom: 20,
    textAlign: 'center',
  }
});
