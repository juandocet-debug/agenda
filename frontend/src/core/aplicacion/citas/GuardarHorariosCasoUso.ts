import { HorarioDia, IHorarioRepository } from '../../domain/citas/IHorarioRepository';

export class GuardarHorariosCasoUso {
  constructor(private repo: IHorarioRepository) {}

  async ejecutar(empresaId: string, horarios: HorarioDia[], token: string) {
    // Validación básica
    for (const h of horarios) {
      if (h.activo && h.hora_inicio >= h.hora_fin) {
        throw new Error('La hora de inicio debe ser menor a la hora de fin');
      }
    }
    await this.repo.guardarHorarios(empresaId, horarios, token);
  }
}
