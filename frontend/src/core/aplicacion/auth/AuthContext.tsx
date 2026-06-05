import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { obtenerTokenLocal } from '../../infraestructura/auth/TokenStorageAdapter';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  isLogueado: boolean;
  userRol: string | null;
  isLoading: boolean;
  /** Llamar después del login exitoso para actualizar el estado de forma inmediata */
  onLoginSuccess: (rol: string) => void;
  /** Llamar después del logout para limpiar el estado de forma inmediata */
  onLogout: () => void;
  /** Llamar después de registrar la empresa para actualizar el rol */
  onUpgradeSuccess: (rol: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  isLogueado: false,
  userRol: null,
  isLoading: true,
  onLoginSuccess: () => {},
  onLogout: () => {},
  onUpgradeSuccess: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLogueado, setIsLogueado] = useState(false);
  const [userRol, setUserRol] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar sesión al arrancar la app
  useEffect(() => {
    const init = async () => {
      try {
        const token = await obtenerTokenLocal();
        if (token?.access) {
          setIsLogueado(true);
          setUserRol(token.rol || null);
        }
      } catch (e) {
        // Sin sesión
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  /** Se llama inmediatamente al login exitoso — sin depender de onStateChange */
  const onLoginSuccess = useCallback((rol: string) => {
    setIsLogueado(true);
    setUserRol(rol);
  }, []);

  /** Se llama inmediatamente al logout — limpia estado sin demoras */
  const onLogout = useCallback(async () => {
    await AsyncStorage.multiRemove([
      '@agenda_pro_token',
      'cliente_token',
      'cliente_id',
      'cliente_nombre',
      'cliente_email',
      'cliente_telefono',
    ]);
    setIsLogueado(false);
    setUserRol(null);
  }, []);

  const onUpgradeSuccess = useCallback((rol: string) => {
    setUserRol(rol);
  }, []);

  return (
    <AuthContext.Provider value={{ isLogueado, userRol, isLoading, onLoginSuccess, onLogout, onUpgradeSuccess }}>
      {children}
    </AuthContext.Provider>
  );
};
