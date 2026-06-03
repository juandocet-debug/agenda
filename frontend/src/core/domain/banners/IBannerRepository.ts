import { BannerPublicitario } from './Banner';

export interface IBannerRepository {
  obtenerBannersPublicos(): Promise<BannerPublicitario[]>;
  obtenerBannersAdmin(token: string): Promise<BannerPublicitario[]>;
  crearBanner(banner: Partial<BannerPublicitario>, token: string): Promise<string>;
  actualizarBanner(id: string, banner: Partial<BannerPublicitario>, token: string): Promise<void>;
  eliminarBanner(id: string, token: string): Promise<void>;
}
