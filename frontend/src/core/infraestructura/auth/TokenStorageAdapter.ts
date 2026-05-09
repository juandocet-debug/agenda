import AsyncStorage from '@react-native-async-storage/async-storage';
import { TokenJWT } from '../../dominio/auth/AuthRepository';

const TOKEN_KEY = '@agenda_pro_token';

export const guardarTokenLocal = async (token: TokenJWT): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(token));
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
