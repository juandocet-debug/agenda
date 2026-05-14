import { HorarioDia, IHorarioRepository } from '../../domain/citas/IHorarioRepository';

const API_BASE_URL = 'https://agenda-production-ae37.up.railway.app';

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
