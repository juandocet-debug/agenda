import { Profesional, ProfesionalRepository } from '../../dominio/profesionales/Profesional';

export class CrearProfesionalUseCase {
  constructor(private repositorio: ProfesionalRepository) {}

  async ejecutar(profesional: Profesional): Promise<Profesional> {
    if (!profesional.nombre || !profesional.especialidad || !profesional.email) {
      throw new Error("Nombre, especialidad y correo son campos obligatorios.");
    }
    return await this.repositorio.crear(profesional);
  }
}

export class ListarProfesionalesUseCase {
  constructor(private repositorio: ProfesionalRepository) {}

  async ejecutar(): Promise<Profesional[]> {
    return await this.repositorio.listar();
  }
}
