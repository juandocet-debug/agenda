import { Empresa } from '../../dominio/empresas/Empresa';
import { EmpresaRepository } from '../../dominio/empresas/EmpresaRepository';
import { obtenerTokenLocal } from '../auth/TokenStorageAdapter';

const BASE_URL = 'https://agenda-production-ae37.up.railway.app/api';

export class DjangoEmpresaRepository implements EmpresaRepository {
  async obtenerEmpresas(): Promise<Empresa[]> {
    try {
      const response = await fetch(`${BASE_URL}/empresas/admin/lista/`);
      const data = await response.json();
      if (data.ok) {
        return data.datos as Empresa[];
      }
      throw new Error('Error al obtener empresas');
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async cambiarEstado(id: string, activa: boolean): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/empresas/admin/${id}/activar/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activa })
      });
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async eliminarEmpresa(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/empresas/admin/${id}/eliminar/`, {
        method: 'DELETE'
      });
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async actualizarImagenes(id: string, logoBase64?: string, portadaBase64?: string): Promise<boolean> {
    try {
      const payload: any = {};
      if (logoBase64) payload.logo_base64 = logoBase64;
      if (portadaBase64) payload.portada_base64 = portadaBase64;

      const response = await fetch(`${BASE_URL}/empresas/admin/${id}/imagenes/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async actualizarDatos(id: string, datos: Partial<Pick<Empresa, 'nombre' | 'ciudad' | 'pais' | 'direccion' | 'telefono' | 'correo_contacto' | 'moneda'>>): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/empresas/admin/${id}/datos/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async obtenerEmpresaPrivada(id: string): Promise<any> {
    try {
      const token = await obtenerTokenLocal();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token && token.access) {
        headers['Authorization'] = `Bearer ${token.access}`;
      }

      const response = await fetch(`${BASE_URL}/empresas/privado/${id}/`, {
        method: 'GET',
        headers
      });
      const data = await response.json();
      if (data.ok) {
        return data.datos;
      }
      return null;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async guardarConfiguracionWompi(id: string, llaves: { wompi_public_key: string, wompi_integrity_key: string, wompi_events_secret: string }): Promise<boolean> {
    try {
      const token = await obtenerTokenLocal();
      const headers: any = { 'Content-Type': 'application/json' };
      if (token && token.access) {
        headers['Authorization'] = `Bearer ${token.access}`;
      }

      const response = await fetch(`${BASE_URL}/empresas/privado/${id}/wompi/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(llaves)
      });
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
