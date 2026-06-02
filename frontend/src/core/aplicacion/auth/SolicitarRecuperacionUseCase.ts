import { AuthRepository } from '../../dominio/auth/AuthRepository';

/**
 * SolicitarRecuperacionUseCase — Caso de uso de aplicación (frontend).
 * Delega al AuthRepository (adaptador de infraestructura).
 * La capa de presentación no conoce la URL del backend.
 */
export class SolicitarRecuperacionUseCase {
  constructor(private authRepository: AuthRepository) {}

  async ejecutar(email: string): Promise<void> {
    const emailNormalizado = email.trim().toLowerCase();
    if (!emailNormalizado || !emailNormalizado.includes('@')) {
      throw new Error('Ingresa un correo electrónico válido.');
    }
    await this.authRepository.solicitarRecuperacion(emailNormalizado);
  }
}
