import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, shadows } from '../theme/colors';
import { typography } from '../theme/typography';
import { ApiProfesionalRepository } from '../../core/infraestructura/profesionales/ApiProfesionalRepository';
import { ListarProfesionalesUseCase } from '../../core/aplicacion/profesionales/ProfesionalesUseCases';

export const ProfesionalesListScreen = () => {
  const navigation = useNavigation<any>();
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfesionales = async () => {
    try {
      setLoading(true);
      const repo = new ApiProfesionalRepository();
      const useCase = new ListarProfesionalesUseCase(repo);
      const lista = await useCase.ejecutar();
      setProfesionales(lista);
    } catch (error) {
      console.error("Error cargando profesionales:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfesionales();
    }, [])
  );

  const renderProfesional = ({ item }: { item: any }) => (
    <View style={styles.profCard}>
      {item.foto_url ? (
        <Image source={{ uri: item.foto_url }} style={styles.profAvatar} />
      ) : (
        <View style={styles.profAvatarFallback}>
          <Text style={styles.profAvatarLetter}>
            {item.nombre?.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.profInfo}>
        <Text style={styles.profName} numberOfLines={1}>{item.nombre}</Text>
        <Text style={styles.profSpecialty} numberOfLines={1}>{item.especialidad}</Text>
        {item.email ? (
          <Text style={styles.profEmail} numberOfLines={1}>{item.email}</Text>
        ) : null}
      </View>
      
      <View style={styles.profActions}>
        <View style={[styles.profBadge, { backgroundColor: item.activo ? '#E6F9F0' : '#FEE2E2' }]}>
          <Text style={[styles.profBadgeText, { color: item.activo ? '#059669' : '#DC2626' }]}>
            {item.activo ? 'Activo' : 'Inactivo'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.editBtn} 
          onPress={() => navigation.navigate('CrearProfesional', { profesionalToEdit: item })}
        >
          <Feather name="edit-2" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.primary, flex: 1, textAlign: 'center', marginRight: 40 }]}>
          Profesionales
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={[typography.body, { color: colors.textSubtitle }]}>
            {profesionales.length} registrados
          </Text>
          <TouchableOpacity 
            style={styles.addBtn}
            onPress={() => navigation.navigate('CrearProfesional')}
          >
            <Feather name="plus" size={16} color="#FFF" />
            <Text style={styles.addBtnText}>Agregar</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : profesionales.length === 0 ? (
          <View style={styles.emptyProfCard}>
            <Feather name="users" size={40} color={colors.textSubtitle} />
            <Text style={styles.emptyProfText}>No hay profesionales aún.</Text>
            <TouchableOpacity
              style={styles.emptyProfBtn}
              onPress={() => navigation.navigate('CrearProfesional')}
            >
              <Text style={styles.emptyProfBtnText}>Agregar el primero</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={profesionales}
            keyExtractor={(item) => item.id || item.email}
            renderItem={renderProfesional}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.surface,
    ...shadows.soft,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyProfCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    ...shadows.soft,
  },
  emptyProfText: {
    color: colors.textSubtitle,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyProfBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
  },
  emptyProfBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  profCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    ...shadows.soft,
    gap: 14,
  },
  profAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEE',
  },
  profAvatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profAvatarLetter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  profInfo: {
    flex: 1,
  },
  profName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  profSpecialty: {
    fontSize: 12,
    color: colors.textSubtitle,
    marginTop: 2,
  },
  profEmail: {
    fontSize: 11,
    color: colors.textSubtitle,
    marginTop: 2,
  },
  profActions: {
    alignItems: 'flex-end',
    gap: 10,
  },
  profBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F4F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
