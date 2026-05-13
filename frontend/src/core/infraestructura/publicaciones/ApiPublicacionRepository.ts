import { Publicacion, PublicacionRepository } from '../../dominio/publicaciones/Publicacion';
import { obtenerTokenLocal } from '../auth/TokenStorageAdapter';

const BASE_URL = 'http://localhost:8001/api/publicaciones';

export class ApiPublicacionRepository implements PublicacionRepository {

  async crear(datos: Omit<Publicacion, 'id' | 'empresa_id'>): Promise<Publicacion> {
    const tokenData = await obtenerTokenLocal();
    if (!tokenData?.access) throw new Error("Sin sesión activa");

    const response = await fetch(`${BASE_URL}/crear/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access}`,
      },
      body: JSON.stringify(datos),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Error al publicar');
    return data.datos;
  }

  async listarPorEmpresa(empresa_id: string, limit: number = 5, offset: number = 0): Promise<Publicacion[]> {
    const response = await fetch(`${BASE_URL}/empresa/${empresa_id}/?limit=${limit}&offset=${offset}`);
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Error al cargar publicaciones');
    return data.datos;
  }

  async eliminar(id: string): Promise<void> {
    const tokenData = await obtenerTokenLocal();
    if (!tokenData?.access) throw new Error("Sin sesión activa");

    const response = await fetch(`${BASE_URL}/${id}/eliminar/`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenData.access}` },
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Error al eliminar');
  }
}
