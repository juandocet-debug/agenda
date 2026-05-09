import { Profesional, ProfesionalRepository } from '../../dominio/profesionales/Profesional';
import { obtenerTokenLocal } from '../auth/TokenStorageAdapter';

const API_URL = 'http://localhost:8000/api/profesionales'; // Debería venir de variable de entorno

export class ApiProfesionalRepository implements ProfesionalRepository {
  
  async crear(profesional: Profesional): Promise<Profesional> {
    const tokenData = await obtenerTokenLocal();
    if (!tokenData || !tokenData.access) {
      throw new Error("No hay sesión activa");
    }

    const response = await fetch(`${API_URL}/crear/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access}`,
      },
      body: JSON.stringify(profesional),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Error al crear profesional');
    }

    return data.datos;
  }

  async listar(): Promise<Profesional[]> {
    const tokenData = await obtenerTokenLocal();
    if (!tokenData || !tokenData.access) {
      throw new Error("No hay sesión activa");
    }

    const response = await fetch(`${API_URL}/lista/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access}`,
      },
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Error al obtener profesionales');
    }

    return data.datos;
  }
}
