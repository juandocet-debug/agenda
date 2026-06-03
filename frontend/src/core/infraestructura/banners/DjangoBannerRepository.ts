import { API_BASE } from '../../config/api';
import { BannerPublicitario } from '../../domain/banners/Banner';
import { IBannerRepository } from '../../domain/banners/IBannerRepository';

export class DjangoBannerRepository implements IBannerRepository {
  async obtenerBannersPublicos(): Promise<BannerPublicitario[]> {
    const res = await fetch(`${API_BASE}/api/empresas/publicas/banners/`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error al obtener banners');
    return data.datos;
  }

  async obtenerBannersAdmin(token: string): Promise<BannerPublicitario[]> {
    const res = await fetch(`${API_BASE}/api/empresas/admin/banners/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error al obtener banners admin');
    return data.datos;
  }

  async crearBanner(banner: Partial<BannerPublicitario>, token: string): Promise<string> {
    const res = await fetch(`${API_BASE}/api/empresas/admin/banners/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(banner),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error al crear banner');
    return data.id;
  }

  async actualizarBanner(id: string, banner: Partial<BannerPublicitario>, token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/empresas/admin/banners/${id}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(banner),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error al actualizar banner');
  }

  async eliminarBanner(id: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/empresas/admin/banners/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Error al eliminar banner');
  }
}
