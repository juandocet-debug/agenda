import { Profesional, ProfesionalRepository } from '../../dominio/profesionales/Profesional';
import { obtenerTokenLocal } from '../auth/TokenStorageAdapter';

// Puerto 8001 — mismo que DjangoAuthAdapter (el punto único de configuración)
const BASE_URL = 'https://agenda-production-ae37.up.railway.app/api';
const API_URL = `${BASE_URL}/profesionales`;

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

  async actualizar(id: string, datos: Partial<Profesional>): Promise<Profesional> {
    const tokenData = await obtenerTokenLocal();
    if (!tokenData || !tokenData.access) {
      throw new Error("No hay sesión activa");
    }

    const response = await fetch(`${API_URL}/${id}/actualizar/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access}`,
      },
      body: JSON.stringify(datos),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Error al actualizar profesional');
    }

    return data.datos;
  }
}

