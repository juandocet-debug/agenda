import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { TokenJWT } from '../../dominio/auth/AuthRepository';

const TOKEN_KEY = '@agenda_pro_token';

// iOS Keychain / Android EncryptedSharedPreferences en nativo.
// AsyncStorage como fallback solo en web (entorno de desarrollo).
const setSecure = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getSecure = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
};

const removeSecure = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
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
  } catch (e) {
    console.error('Error al guardar el token localmente', e);
  }
};

export const obtenerTokenLocal = async (): Promise<TokenJWT | null> => {
  try {
    const jsonValue = await getSecure(TOKEN_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Error al leer el token localmente', e);
    return null;
  }
};

export const eliminarTokenLocal = async (): Promise<void> => {
  try {
    await removeSecure(TOKEN_KEY);
    await removeSecure('cliente_token');
    await removeSecure('cliente_id');
    await AsyncStorage.removeItem('cliente_nombre');
  } catch (e) {
    console.error('Error al eliminar el token localmente', e);
  }
};
