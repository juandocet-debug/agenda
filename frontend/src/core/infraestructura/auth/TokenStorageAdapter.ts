import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { TokenJWT } from '../../dominio/auth/AuthRepository';

const TOKEN_KEY = '@agenda_pro_token';

// ── Almacenamiento seguro ────────────────────────────────────────────────
// Nativo: iOS Keychain / Android EncryptedSharedPreferences (expo-secure-store).
// Web: sessionStorage (se borra al cerrar pestaña — más seguro que localStorage).
//      Los tokens sensibles NO persisten entre sesiones en web.
const setSecure = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getSecure = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
};

const removeSecure = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export const guardarTokenLocal = async (token: TokenJWT): Promise<void> => {
  try {
    await setSecure(TOKEN_KEY, JSON.stringify(token));
    if (token.rol === 'cliente') {
      await setSecure('cliente_token', token.access);
      if (token.usuario_id) await setSecure('cliente_id', String(token.usuario_id));
      if (token.nombre) await AsyncStorage.setItem('cliente_nombre', token.nombre);
    }
  } catch (e) { console.error('Error al guardar el token localmente', e); }
};

export const obtenerTokenLocal = async (): Promise<TokenJWT | null> => {
  try {
    const jsonValue = await getSecure(TOKEN_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) { console.error('Error al leer el token localmente', e); return null; }
};

export const eliminarTokenLocal = async (): Promise<void> => {
  try {
    await removeSecure(TOKEN_KEY);
    await removeSecure('cliente_token');
    await removeSecure('cliente_id');
    await AsyncStorage.removeItem('cliente_nombre');
  } catch (e) { console.error('Error al eliminar el token localmente', e); }
};

// Funciones individuales para que las pantallas no accedan a AsyncStorage directamente
// con claves sensibles (cliente_token y cliente_id van a SecureStore en nativo).
export const guardarClienteToken = (token: string): Promise<void> => setSecure('cliente_token', token);
export const obtenerClienteToken = (): Promise<string | null> => getSecure('cliente_token');
export const eliminarClienteToken = (): Promise<void> => removeSecure('cliente_token');
export const guardarClienteId = (id: string): Promise<void> => setSecure('cliente_id', id);
export const obtenerClienteId = (): Promise<string | null> => getSecure('cliente_id');
export const eliminarClienteId = (): Promise<void> => removeSecure('cliente_id');

// cliente_nombre y cliente_email no son secretos — AsyncStorage está bien.
export const guardarClienteNombre = (nombre: string): Promise<void> => AsyncStorage.setItem('cliente_nombre', nombre);
export const obtenerClienteNombre = (): Promise<string | null> => AsyncStorage.getItem('cliente_nombre');
export const guardarClienteEmail = (email: string): Promise<void> => AsyncStorage.setItem('cliente_email', email);
export const obtenerClienteEmail = (): Promise<string | null> => AsyncStorage.getItem('cliente_email');
