import { AuthRepository, Credenciales, TokenJWT } from '../../dominio/auth/AuthRepository';

export class LoginUseCase {
  constructor(
    private authRepository: AuthRepository,
    private guardarToken: (token: TokenJWT) => Promise<void>
  ) {}

  async ejecutar(credenciales: Credenciales): Promise<string> {
    if (!credenciales.email) {
      throw new Error('El correo es obligatorio');
    }
    
    // 1. Llamar al backend a través del repositorio (Adapter)
    const token = await this.authRepository.login(credenciales);
    
    // 2. Si es exitoso, guardar el token de forma segura (incluye el rol)
    await this.guardarToken(token);
    
    // 3. Retornar el rol a la capa de presentación para bifurcar la navegación
    return token.rol;
  }
}
