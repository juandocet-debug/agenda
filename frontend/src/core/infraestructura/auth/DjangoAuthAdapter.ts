import { AuthRepository, Credenciales, TokenJWT, RegistroData } from '../../dominio/auth/AuthRepository';

// Usaremos esta IP base para que el simulador o web llegue a localhost.
// En Android emulator se usaría 10.0.2.2. En Web o iOS simulator: localhost
const BASE_URL = 'https://agenda-production-ae37.up.railway.app/api';

export class DjangoAuthAdapter implements AuthRepository {
  
  async login(credenciales: Credenciales): Promise<TokenJWT> {
    let response: Response;
    let responseData: any;

    try {
      response = await fetch(`${BASE_URL}/auth/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: credenciales.email,
          password: credenciales.password,
        }),
      });
    } catch (networkError: any) {
      // Error de red (sin internet, SSL, timeout, etc.)
      console.error('=== ERROR DE RED ===', networkError);
      throw new Error(`Error de conexión: ${networkError?.message || 'Sin internet o el servidor no responde'}`);
    }

    try {
      responseData = await response.json();
    } catch (parseError) {
      throw new Error(`El servidor respondió con status ${response.status} pero sin JSON válido`);
    }
    
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

  async solicitarRecuperacion(email: string): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/auth/recuperar-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (networkError: any) {
      throw new Error(`Error de conexión: ${networkError?.message || 'Sin internet'}`);
    }
    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'No se pudo enviar el email de recuperación.');
    }
  }

  async restablecerPassword(token: string, nuevaPassword: string): Promise<string> {
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ token, nueva_password: nuevaPassword }),
      });
    } catch (networkError: any) {
      throw new Error(`Error de conexión: ${networkError?.message || 'Sin internet'}`);
    }
    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'No se pudo restablecer la contraseña.');
    }
    return data.rol;
  }

  async upgradeToEmpresa(nombreEmpresa: string, nit: string, rut: File | any): Promise<TokenJWT> {
    // Para interactuar con form-data necesitamos el token actual
    const { obtenerTokenLocal } = await import('./TokenStorageAdapter');
    const token = await obtenerTokenLocal();

    if (!token || !token.access) {
      throw new Error("No hay sesión activa");
    }

    const formData = new FormData();
    formData.append('nombre', nombreEmpresa);
    formData.append('nit', nit);
    if (rut) {
      formData.append('rut_archivo', rut);
    }

    const response = await fetch(`${BASE_URL}/auth/upgrade-empresa/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.access}`,
        // No se debe poner Content-Type: multipart/form-data porque fetch
        // genera su propio boundary
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al actualizar a empresa');
    }

    return {
      access: data.tokens.access,
      refresh: data.tokens.refresh,
      rol: 'empresa',
    };
  }
}
