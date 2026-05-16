import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenJWT } from '../../dominio/auth/AuthRepository';

const TOKEN_KEY = '@agenda_pro_token';

export const guardarTokenLocal = async (token: TokenJWT): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(token));
    if (token.rol === 'cliente') {
      await AsyncStorage.setItem('cliente_token', token.access);
      if (token.usuario_id) await AsyncStorage.setItem('cliente_id', token.usuario_id);
      if (token.nombre) await AsyncStorage.setItem('cliente_nombre', token.nombre);
    }
  } catch (e) {
    console.error('Error al guardar el token localmente', e);
  }
};

export const obtenerTokenLocal = async (): Promise<TokenJWT | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(TOKEN_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Error al leer el token localmente', e);
    return null;
  }
};

export const eliminarTokenLocal = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error('Error al eliminar el token localmente', e);
  }
};
