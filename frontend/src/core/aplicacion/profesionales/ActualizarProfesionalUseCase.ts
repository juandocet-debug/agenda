import { Profesional, ProfesionalRepository } from '../../dominio/profesionales/Profesional';

export class ActualizarProfesionalUseCase {
  constructor(private profesionalRepository: ProfesionalRepository) {}

  async ejecutar(id: string, datos: Partial<Profesional>): Promise<Profesional> {
    if (!id) {
      throw new Error("El ID del profesional es requerido para actualizar.");
    }
    return await this.profesionalRepository.actualizar(id, datos);
  }
}
