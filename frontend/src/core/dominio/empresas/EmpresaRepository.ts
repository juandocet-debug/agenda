import { Empresa } from './Empresa';

export interface EmpresaRepository {
  obtenerEmpresas(): Promise<Empresa[]>;
  cambiarEstado(id: string, activa: boolean): Promise<boolean>;
  eliminarEmpresa(id: string): Promise<boolean>;
  actualizarImagenes(id: string, logoBase64?: string, portadaBase64?: string): Promise<boolean>;
  actualizarDatos(id: string, datos: Partial<Pick<Empresa, 'nombre' | 'ciudad' | 'pais' | 'direccion' | 'telefono' | 'correo_contacto' | 'moneda'>>): Promise<boolean>;
  obtenerEmpresaPrivada(id: string): Promise<any>;
  guardarConfiguracionWompi(id: string, llaves: { wompi_public_key: string, wompi_integrity_key: string, wompi_events_secret: string }): Promise<boolean>;
}
