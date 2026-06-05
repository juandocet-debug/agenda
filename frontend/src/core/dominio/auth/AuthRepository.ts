export interface Credenciales {
  email: string;
  password?: string;
}

export interface TokenJWT {
  access: string;
  refresh: string;
  rol: string;
  usuario_id?: string;
  nombre?: string;
  email?: string;
  telefono?: string;
}

export interface RegistroData {
  nombre_empresa: string;
  email: string;
  username: string;
  password?: string;
}

export interface AuthRepository {
  login(credenciales: Credenciales): Promise<TokenJWT>;
  register(datos: RegistroData): Promise<string>;
  logout(): Promise<void>;
  /** Solicita el envío de un email de recuperación de contraseña. */
  solicitarRecuperacion(email: string): Promise<void>;
  /** Valida el token y establece la nueva contraseña. Devuelve el rol del usuario. */
  restablecerPassword(token: string, nuevaPassword: string): Promise<string>;
  /** Actualiza a empresa */
  upgradeToEmpresa(nombreEmpresa: string, nit: string, rut: File | any): Promise<TokenJWT>;
}
