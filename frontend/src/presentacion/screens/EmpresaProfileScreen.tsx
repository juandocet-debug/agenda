import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert, Platform, Image, ActivityIndicator, Clipboard } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { eliminarTokenLocal, obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../core/aplicacion/auth/AuthContext';
import { DjangoEmpresaRepository } from '../../core/infraestructura/empresas/DjangoEmpresaRepository';

const empresaRepository = new DjangoEmpresaRepository();

export const EmpresaProfileScreen = ({ navigation }: any) => {

  const { onLogout } = useAuth();

  const handleLogout = async () => {
    const salir = async () => {
      // onLogout limpia AsyncStorage Y actualiza el estado de AuthContext de inmediato
      await onLogout();
    };

    if (Platform.OS === 'web') {
      if (window.confirm("¿Estás seguro que deseas salir?")) {
        await salir();
      }
    } else {
      Alert.alert(
        "Cerrar Sesión",
        "¿Estás seguro que deseas salir?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Salir", style: "destructive", onPress: salir }
        ]
      );
    }
  };

  const [empresaData, setEmpresaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchDatos = async () => {
        try {
          const token = await obtenerTokenLocal();
          if (token && token.access) {
            const p = JSON.parse(atob(token.access.split('.')[1]));
            const id = p.user_id;
            const data = await empresaRepository.obtenerEmpresaPrivada(id);
            if (data) {
              setEmpresaData(data);
            }
          }
        } catch (error) {
          console.error("Error fetching perfil empresa:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchDatos();
    }, [])
  );

  const menuItems = [
    {
      id: 'editar',
      icon: 'settings',
      title: 'Configurar',
      subtitle: 'Logo, Nombre, Moneda, Perfil',
      route: 'EditarEmpresa'
    },
    {
      id: 'servicios',
      icon: 'grid',
      title: 'Gestión de Servicios',
      subtitle: 'Crea, edita y añade fotos a tu portafolio',
      route: 'ServiciosList'
    },
    {
      id: 'profesionales',
      icon: 'users',
      title: 'Mis Profesionales',
      subtitle: 'Administra tu equipo de trabajo',
      route: 'ProfesionalesList'
    },
    {
      id: 'horarios',
      icon: 'clock',
      title: 'Configurar Horarios',
      subtitle: 'Establece tus horas de apertura y cierre',
      route: 'HorariosConfig'
    }
  ];

  const compartirLinkReserva = async () => {
    const empresaId = empresaData?.id;
    if (!empresaId) return;
    const baseUrl = Platform.OS === 'web'
      ? window.location.origin
      : 'http://localhost:19006';
    const link = `${baseUrl}/agendar/${empresaId}`;
    try {
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(link);
        Alert.alert('\u2705 ¡Link copiado!', `Compártelo con tus clientes:\n\n${link}`);
      } else {
        Clipboard.setString(link);
        Alert.alert('\u2705 ¡Link copiado!', `Compártelo con tus clientes:\n\n${link}`);
      }
    } catch {
      Alert.alert('Tu link de reservas', link);
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 250 }} showsVerticalScrollIndicator={false}>
        
        {/* Top Header */}
        <View style={s.topHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconButton}>
            <Feather name="x" size={24} color="#1A1C1E" />
          </TouchableOpacity>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconButton} onPress={handleLogout}>
              <Feather name="log-out" size={22} color="#FF4B4B" />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconButton}>
              <View>
                <Feather name="bell" size={22} color="#1A1C1E" />
                <View style={s.notificationDot} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Info */}
        <View style={s.profileSection}>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 15 }} />
          ) : empresaData?.logo_url ? (
            <Image source={{ uri: empresaData.logo_url }} style={s.avatarImage} />
          ) : (
            <View style={s.avatar}>
              <Feather name="user" size={28} color="#FFF" />
            </View>
          )}
          <View style={s.profileText}>
            <Text style={s.profileName}>{empresaData?.nombre || 'Administrador'}</Text>
            <Text style={s.profileSubtitle}>Agenda Pro • Plan Básico</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#CCC" />
        </View>

        {/* Action Card */}
        <TouchableOpacity 
          style={s.actionCard} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('ConfigurarPagos')}
        >
          <Feather name="key" size={20} color="#1A1C1E" style={s.actionIcon} />
          <View style={s.actionTextWrapper}>
            <Text style={s.actionTitle}>Recibe pagos al instante</Text>
            <Text style={s.actionSubtitle}>Configura tus métodos de pago</Text>
          </View>
          <View style={s.badge}>
            <Text style={s.badgeText}>Configurar</Text>
          </View>
        </TouchableOpacity>

        {/* Menu Items List */}
        <View style={s.menuList}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={item.id} 
              style={[s.menuItem, index === menuItems.length - 1 && s.menuItemLast]}
              onPress={() => item.route && navigation.navigate(item.route)}
              activeOpacity={0.6}
            >
              <Feather name={item.icon as any} size={22} color="#1A1C1E" style={s.itemIcon} />
              <View style={s.itemTextWrapper}>
                <Text style={s.itemTitle}>{item.title}</Text>
                <Text style={s.itemSubtitle}>{item.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Compartir link de reservas ── */}
        <TouchableOpacity style={s.linkCard} onPress={compartirLinkReserva} activeOpacity={0.85}>
          <View style={s.linkIconBg}>
            <Feather name="link" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.linkTitle}>Tu link de reservas</Text>
            <Text style={s.linkSubtitle}>Cópialo y compártelo con tus clientes — sin registro</Text>
          </View>
          <Feather name="copy" size={18} color={colors.primary} />
        </TouchableOpacity>

        {/* Footer Actions */}
        <View style={s.footer}>
          <TouchableOpacity style={s.footerItem} activeOpacity={0.6}>
            <Feather name="file-text" size={22} color="#1A1C1E" style={s.itemIcon} />
            <Text style={s.footerItemTitle}>Términos y condiciones</Text>
            <Feather name="chevron-right" size={18} color="#CCC" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[s.footerItem, s.footerItemLast]} 
            activeOpacity={0.6}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={22} color="#1A1C1E" style={s.itemIcon} />
            <Text style={s.footerItemTitle}>Salir de la aplicación</Text>
            <Feather name="chevron-right" size={18} color="#CCC" />
          </TouchableOpacity>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconButton: { padding: 5 },
  notificationDot: { position: 'absolute', top: 0, right: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, borderWidth: 1, borderColor: '#FFF' },

  profileSection: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarImage: { width: 56, height: 56, borderRadius: 28, marginRight: 15 },
  profileText: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '500', color: '#1A1C1E', marginBottom: 2 },
  profileSubtitle: { fontSize: 13, color: '#6B7280' },

  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', marginHorizontal: 20, marginVertical: 15, padding: 16, borderRadius: 16 },
  actionIcon: { marginRight: 15 },
  actionTextWrapper: { flex: 1 },
  actionTitle: { fontSize: 14, fontWeight: '500', color: '#1A1C1E', marginBottom: 2 },
  actionSubtitle: { fontSize: 13, color: '#6B7280' },
  badge: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '500', textTransform: 'uppercase' },

  menuList: { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuItemLast: { borderBottomWidth: 0 },
  itemIcon: { marginRight: 15, width: 24, textAlign: 'center' },
  itemTextWrapper: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '500', color: '#1A1C1E', marginBottom: 2 },
  itemSubtitle: { fontSize: 13, color: '#6B7280' },

  footer: { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 10 },
  footerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  footerItemLast: { borderBottomWidth: 0 },
  footerItemTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1A1C1E' },

  linkCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 20, marginVertical: 12,
    padding: 16, borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5, borderColor: '#BFDBFE',
  },
  linkIconBg: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center',
  },
  linkTitle: { fontSize: 14, fontWeight: '500', color: colors.primary, marginBottom: 2 },
  linkSubtitle: { fontSize: 12, color: '#3B82F6' },
});
