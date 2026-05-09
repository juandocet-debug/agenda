export interface Profesional {
  id?: string;
  empresa_id?: string;
  nombre: string;
  especialidad: string;
  email: string;
  telefono: string;
  foto_url?: string;
  activo?: boolean;
}

export interface ProfesionalRepository {
  crear(profesional: Profesional): Promise<Profesional>;
  listar(): Promise<Profesional[]>;
}
