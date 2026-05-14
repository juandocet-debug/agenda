import { IHorarioRepository } from '../../domain/citas/IHorarioRepository';

export class ObtenerHorariosCasoUso {
  constructor(private repo: IHorarioRepository) {}

  async ejecutar(empresaId: string) {
    return await this.repo.obtenerHorarios(empresaId);
  }
}
