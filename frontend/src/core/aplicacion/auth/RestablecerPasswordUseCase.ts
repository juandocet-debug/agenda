import { AuthRepository } from '../../dominio/auth/AuthRepository';

/**
 * RestablecerPasswordUseCase — Caso de uso de aplicación (frontend).
 * Valida la nueva contraseña antes de delegar al repositorio.
 * Devuelve el rol del usuario para que la presentación redirija correctamente.
 */
export class RestablecerPasswordUseCase {
  constructor(private authRepository: AuthRepository) {}

  async ejecutar(token: string, nuevaPassword: string, confirmarPassword: string): Promise<string> {
    if (!token) {
      throw new Error('El link de recuperación no es válido.');
    }
    if (nuevaPassword.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }
    if (nuevaPassword !== confirmarPassword) {
      throw new Error('Las contraseñas no coinciden.');
    }
    return await this.authRepository.restablecerPassword(token, nuevaPassword);
  }
}
