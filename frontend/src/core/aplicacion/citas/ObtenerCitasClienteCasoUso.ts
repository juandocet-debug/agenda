/**
 * ObtenerCitasClienteCasoUso — Caso de uso (capa Aplicación).
 * Orquesta la lógica de negocio: pide al repositorio las citas del cliente.
 * No sabe nada de HTTP, AsyncStorage ni UI.
 */
import { IClienteCitaRepository, CitaCliente } from '../../domain/citas/IClienteCitaRepository';

export class ObtenerCitasClienteCasoUso {
  constructor(private readonly repo: IClienteCitaRepository) {}

  async ejecutar(clienteId: string, token: string): Promise<CitaCliente[]> {
    if (!clienteId || !token) {
      return [];
    }
    return await this.repo.obtenerCitas(clienteId, token);
  }
}
