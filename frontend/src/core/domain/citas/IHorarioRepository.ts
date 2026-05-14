export interface HorarioDia {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface IHorarioRepository {
  obtenerHorarios(empresaId: string): Promise<HorarioDia[]>;
  guardarHorarios(empresaId: string, horarios: HorarioDia[], token: string): Promise<void>;
}
