/**
 * DjangoClienteCitaRepository — Adaptador (infraestructura).
 * Implementa IClienteCitaRepository comunicándose con Django via HTTP.
 * ES LA ÚNICA CLASE QUE SABE QUE EXISTE UN BACKEND.
 *
 * Seguridad: pasa el cliente_token en el header Authorization.
 * El backend valida que el token corresponde al cliente_id solicitado.
 */
import { IClienteCitaRepository, CitaCliente } from '../../domain/citas/IClienteCitaRepository';

const API_BASE = 'https://agenda-production-ae37.up.railway.app';

export class DjangoClienteCitaRepository implements IClienteCitaRepository {
  async obtenerCitas(clienteId: string, token: string): Promise<CitaCliente[]> {
    const response = await fetch(
      `${API_BASE}/api/citas/mis-citas-cliente/?cliente_id=${encodeURIComponent(clienteId)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status} al obtener citas del cliente`);
    }

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'No se pudieron cargar las citas');
    }

    return data.datos as CitaCliente[];
  }
}
