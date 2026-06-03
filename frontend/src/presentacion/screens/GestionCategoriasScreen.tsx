/**
 * GestionCategoriasScreen.tsx
 * Panel del Super Admin para crear, editar y eliminar Categorías.
 * Seguridad: Todas las llamadas llevan el JWT del superadmin en Authorization.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
  Modal, Platform, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, shadows } from '../theme/colors';
import { obtenerTokenLocal } from '../../core/infraestructura/auth/TokenStorageAdapter';

const BASE = 'https://agenda-production-ae37.up.railway.app/api';

// ── Iconos disponibles (subconjunto de Feather) ─────────────────────────────
const ICONOS_DISPONIBLES = [
  'briefcase', 'scissors', 'coffee', 'heart', 'home', 'music',
  'camera', 'book', 'truck', 'shopping-bag', 'tool', 'star',
  'activity', 'award', 'cpu', 'globe', 'zap', 'sun', 'users',
  'gift', 'package', 'map-pin', 'monitor', 'phone', 'smile',
];

interface Categoria {
  id: string;
  nombre: string;
  icono: string | null;
  orden: number;
  activa: boolean;
  total_empresas: number;
}

// ── Helper: cabecera con JWT ────────────────────────────────────────────────
async function authHeaders() {
  const token = await obtenerTokenLocal();
  return {
    'Content-Type': 'application/json',
    ...(token?.access ? { Authorization: `Bearer ${token.access}` } : {}),
  };
}

// ── Componente de una fila de categoría ────────────────────────────────────
const CategoriaRow = ({
  cat,
  onEdit,
  onDelete,
  onToggle,
}: {
  cat: Categoria;
  onEdit: (c: Categoria) => void;
  onDelete: (c: Categoria) => void;
  onToggle: (c: Categoria) => void;
}) => (
  <View style={s.row}>
    <View style={s.rowIcon}>
      <Feather name={(cat.icono || 'grid') as any} size={20} color={colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.rowNombre}>{cat.nombre}</Text>
      <Text style={s.rowMeta}>
        {cat.total_empresas} empresa{cat.total_empresas !== 1 ? 's' : ''} · orden {cat.orden}
      </Text>
    </View>
    <TouchableOpacity
      style={[s.badge, { backgroundColor: cat.activa ? '#D1FAE5' : '#FEE2E2' }]}
      onPress={() => onToggle(cat)}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: cat.activa ? '#065F46' : '#991B1B' }}>
        {cat.activa ? 'Activa' : 'Inactiva'}
      </Text>
    </TouchableOpacity>
    <TouchableOpacity style={s.iconBtn} onPress={() => onEdit(cat)}>
      <Feather name="edit-2" size={16} color={colors.primary} />
    </TouchableOpacity>
    <TouchableOpacity style={s.iconBtn} onPress={() => onDelete(cat)}>
      <Feather name="trash-2" size={16} color="#EF4444" />
    </TouchableOpacity>
  </View>
);

// ── Modal de creación / edición ────────────────────────────────────────────
const FormModal = ({
  visible,
  inicial,
  onClose,
  onGuardar,
}: {
  visible: boolean;
  inicial: Partial<Categoria> | null;
  onClose: () => void;
  onGuardar: (data: Partial<Categoria>) => Promise<void>;
}) => {
  const [nombre, setNombre] = useState(inicial?.nombre || '');
  const [icono, setIcono] = useState(inicial?.icono || 'briefcase');
  const [orden, setOrden] = useState(String(inicial?.orden ?? 0));
  const [activa, setActiva] = useState(inicial?.activa ?? true);
  const [saving, setSaving] = useState(false);

  // Sincronizar cuando cambia el inicial (editar distinto registro)
  React.useEffect(() => {
    setNombre(inicial?.nombre || '');
    setIcono(inicial?.icono || 'briefcase');
    setOrden(String(inicial?.orden ?? 0));
    setActiva(inicial?.activa ?? true);
  }, [inicial, visible]);

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Validación', 'El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      await onGuardar({ nombre: nombre.trim(), icono, orden: parseInt(orden) || 0, activa });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>
            {inicial?.id ? 'Editar Categoría' : 'Nueva Categoría'}
          </Text>

          {/* Nombre */}
          <Text style={s.fieldLabel}>Nombre *</Text>
          <TextInput
            style={s.fieldInput}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej: Peluquerías"
            placeholderTextColor="#94A3B8"
            autoFocus
          />

          {/* Icono */}
          <Text style={s.fieldLabel}>Ícono</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {ICONOS_DISPONIBLES.map(ic => (
                <TouchableOpacity
                  key={ic}
                  style={[s.iconoPill, icono === ic && s.iconoPillSelected]}
                  onPress={() => setIcono(ic)}
                >
                  <Feather name={ic as any} size={20} color={icono === ic ? '#FFF' : colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Orden */}
          <Text style={s.fieldLabel}>Orden de aparición</Text>
          <TextInput
            style={s.fieldInput}
            value={orden}
            onChangeText={setOrden}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#94A3B8"
          />

          {/* Activa toggle */}
          <TouchableOpacity style={s.toggleRow} onPress={() => setActiva(!activa)}>
            <Text style={s.fieldLabel}>¿Activa (visible al público)?</Text>
            <View style={[s.toggle, activa && s.toggleOn]}>
              <View style={[s.toggleKnob, activa && s.toggleKnobOn]} />
            </View>
          </TouchableOpacity>

          {/* Botones */}
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleGuardar} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={s.saveBtnTxt}>{inicial?.id ? 'Guardar' : 'Crear'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Pantalla principal ──────────────────────────────────────────────────────
export const GestionCategoriasScreen = ({ navigation }: any) => {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [cargando, setCargando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<Partial<Categoria> | null>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/empresas/admin/categorias/`, { headers });
      const json = await res.json();
      if (json.ok) setCategorias(json.datos);
      else Alert.alert('Error', json.error || 'No se pudieron cargar las categorías.');
    } catch {
      Alert.alert('Error', 'Problema de conexión.');
    } finally {
      setCargando(false);
    }
  };

  useFocusEffect(useCallback(() => { cargar(); }, []));

  const handleCrear = () => { setEditando(null); setModalVisible(true); };
  const handleEditar = (cat: Categoria) => { setEditando(cat); setModalVisible(true); };

  const handleGuardar = async (data: Partial<Categoria>) => {
    const headers = await authHeaders();
    try {
      if (editando?.id) {
        // Editar
        const res = await fetch(`${BASE}/empresas/admin/categorias/${editando.id}/`, {
          method: 'PATCH', headers, body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.ok) { Alert.alert('Error', json.error || 'No se pudo actualizar.'); return; }
      } else {
        // Crear
        const res = await fetch(`${BASE}/empresas/admin/categorias/`, {
          method: 'POST', headers, body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.ok) { Alert.alert('Error', json.error || 'No se pudo crear.'); return; }
      }
      await cargar();
    } catch {
      Alert.alert('Error', 'Problema de conexión al guardar.');
    }
  };

  const handleEliminar = (cat: Categoria) => {
    if (Platform.OS === 'web') {
      if (!window.confirm(`¿Eliminar la categoría "${cat.nombre}"? Las empresas quedarán sin categoría.`)) return;
      _doEliminar(cat.id);
    } else {
      Alert.alert(
        'Eliminar Categoría',
        `¿Eliminar "${cat.nombre}"? Las empresas quedarán sin categoría asignada.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => _doEliminar(cat.id) },
        ]
      );
    }
  };

  const _doEliminar = async (id: string) => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${BASE}/empresas/admin/categorias/${id}/`, { method: 'DELETE', headers });
      const json = await res.json();
      if (json.ok) await cargar();
      else Alert.alert('Error', json.error || 'No se pudo eliminar.');
    } catch {
      Alert.alert('Error', 'Problema de conexión.');
    }
  };

  const handleToggle = async (cat: Categoria) => {
    await handleGuardar({ ...cat, activa: !cat.activa });
  };

  return (
    <SafeAreaView style={s.root}>
      {/* Cabecera */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Categorías</Text>
        <TouchableOpacity style={s.addBtn} onPress={handleCrear}>
          <Feather name="plus" size={20} color="#FFF" />
          <Text style={s.addBtnTxt}>Nueva</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.subtitle}>
        Crea y organiza las categorías que verán las empresas al editar su perfil.
      </Text>

      {cargando ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={categorias}
          keyExtractor={c => c.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Feather name="grid" size={44} color="#CBD5E1" />
              <Text style={s.emptyTxt}>Aún no hay categorías.{'\n'}Toca "+ Nueva" para crear la primera.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CategoriaRow
              cat={item}
              onEdit={handleEditar}
              onDelete={handleEliminar}
              onToggle={handleToggle}
            />
          )}
        />
      )}

      <FormModal
        visible={modalVisible}
        inicial={editando}
        onClose={() => setModalVisible(false)}
        onGuardar={handleGuardar}
      />
    </SafeAreaView>
  );
};

// ── Estilos ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 16 : 44,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    ...shadows.soft,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, paddingHorizontal: 16,
    paddingVertical: 10, borderRadius: 12,
  },
  addBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  subtitle: {
    fontSize: 13, color: '#64748B', paddingHorizontal: 20,
    paddingVertical: 12, backgroundColor: '#FFF',
  },

  // Fila de categoría
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 14,
    gap: 10, ...shadows.soft,
  },
  rowIcon: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
  },
  rowNombre: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  rowMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 28,
    borderTopRightRadius: 28, padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#CBD5E1',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 20 },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 6, textTransform: 'uppercase' },
  fieldInput: {
    backgroundColor: '#F8F9FA', borderRadius: 12, borderWidth: 1,
    borderColor: '#E2E8F0', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1E293B', marginBottom: 16,
  },

  iconoPill: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
  },
  iconoPillSelected: { backgroundColor: colors.primary },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 24,
  },
  toggle: {
    width: 48, height: 26, borderRadius: 13,
    backgroundColor: '#CBD5E1', padding: 2,
  },
  toggleOn: { backgroundColor: colors.primary },
  toggleKnob: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF',
  },
  toggleKnobOn: { transform: [{ translateX: 22 }] },

  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center',
  },
  cancelBtnTxt: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', color: '#FFF' },

  // Utils
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12, marginTop: 40 },
  emptyTxt: { fontSize: 15, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
});
