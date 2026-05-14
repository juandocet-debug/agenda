import { HorarioDia, IHorarioRepository } from '../../domain/citas/IHorarioRepository';
import { API_BASE_URL } from '../config';

export class DjangoHorarioRepository implements IHorarioRepository {
  async obtenerHorarios(empresaId: string): Promise<HorarioDia[]> {
    const res = await fetch(`${API_BASE_URL}/api/citas/horario/${empresaId}/`);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Error obteniendo horarios');
    return data.datos;
  }

  async guardarHorarios(empresaId: string, horarios: HorarioDia[], token: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/citas/horario/${empresaId}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ horarios })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Error guardando horarios');
  }
}
