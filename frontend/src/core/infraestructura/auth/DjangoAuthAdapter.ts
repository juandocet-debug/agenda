import { AuthRepository, Credenciales, TokenJWT, RegistroData } from '../../dominio/auth/AuthRepository';

// Usaremos esta IP base para que el simulador o web llegue a localhost.
// En Android emulator se usaría 10.0.2.2. En Web o iOS simulator: localhost
const BASE_URL = 'http://localhost:8001/api';

export class DjangoAuthAdapter implements AuthRepository {
  
  async login(credenciales: Credenciales): Promise<TokenJWT> {
    const response = await fetch(`${BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credenciales.email,
        password: credenciales.password,
      }),
    });

    // Siempre leer el body antes de evaluar el status
    const responseData = await response.json();
    
    console.log('=== LOGIN RESPONSE ===', response.status, JSON.stringify(responseData));

    if (!response.ok || !responseData.ok) {
      throw new Error(responseData.error || `Error ${response.status}: Credenciales invalidas`);
    }

    return {
      access: responseData.datos?.access_token || responseData.access,
      refresh: responseData.datos?.refresh_token || responseData.refresh,
      rol: responseData.datos?.rol || 'empresa',
      usuario_id: responseData.datos?.usuario_id || undefined,
    };
  }

  async register(datos: RegistroData): Promise<string> {
    const response = await fetch(`${BASE_URL}/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre_empresa: datos.nombre_empresa,
        email: datos.email,
        username: datos.username,
        password: datos.password,
      }),
    });

    const responseData = await response.json();
    if (!response.ok || !responseData.ok) {
      throw new Error(responseData.error || 'Error al registrar la empresa');
    }

    return responseData.id;
  }

  async logout(): Promise<void> {
    return Promise.resolve();
  }
}
