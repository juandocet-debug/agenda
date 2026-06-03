import { BannerPublicitario } from '../../domain/banners/Banner';
import { IBannerRepository } from '../../domain/banners/IBannerRepository';

export class ObtenerBannersPublicosCasoUso {
  constructor(private repository: IBannerRepository) {}

  async ejecutar(): Promise<BannerPublicitario[]> {
    return await this.repository.obtenerBannersPublicos();
  }
}

export class GestionarBannersAdminCasoUso {
  constructor(private repository: IBannerRepository) {}

  async obtenerTodos(token: string): Promise<BannerPublicitario[]> {
    return await this.repository.obtenerBannersAdmin(token);
  }

  async crear(banner: Partial<BannerPublicitario>, token: string): Promise<string> {
    return await this.repository.crearBanner(banner, token);
  }

  async actualizar(id: string, banner: Partial<BannerPublicitario>, token: string): Promise<void> {
    return await this.repository.actualizarBanner(id, banner, token);
  }

  async eliminar(id: string, token: string): Promise<void> {
    return await this.repository.eliminarBanner(id, token);
  }
}
