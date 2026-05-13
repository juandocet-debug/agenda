import { Publicacion, PublicacionRepository } from '../../dominio/publicaciones/Publicacion';

export class CrearPublicacionUseCase {
  constructor(private repo: PublicacionRepository) {}
  async ejecutar(datos: Omit<Publicacion, 'id' | 'empresa_id'>): Promise<Publicacion> {
    if (!datos.titulo?.trim()) throw new Error('El título es obligatorio.');
    return await this.repo.crear(datos);
  }
}

export class ListarPublicacionesUseCase {
  constructor(private repo: PublicacionRepository) {}
  async ejecutar(empresa_id: string, limit: number = 5, offset: number = 0): Promise<Publicacion[]> {
    return await this.repo.listarPorEmpresa(empresa_id, limit, offset);
  }
}

export class EliminarPublicacionUseCase {
  constructor(private repo: PublicacionRepository) {}
  async ejecutar(id: string): Promise<void> {
    return await this.repo.eliminar(id);
  }
}
