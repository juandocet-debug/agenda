/**
 * IClienteCitaRepository — Puerto (interfaz) del dominio.
 * La capa de infraestructura implementa este contrato.
 * La capa de presentación JAMÁS debe depender de la implementación concreta.
 */

export interface CitaCliente {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  servicio_nombre: string;
  empresa_nombre: string;
  monto: number;
}

export interface IClienteCitaRepository {
  obtenerCitas(clienteId: string, token: string): Promise<CitaCliente[]>;
}
