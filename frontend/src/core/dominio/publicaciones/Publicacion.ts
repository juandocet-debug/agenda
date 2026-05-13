export interface Publicacion {
  id?: string;
  empresa_id?: string;
  titulo: string;
  descripcion?: string;
  imagen_url?: string;
  imagenes?: string[];
  fecha_creacion?: string;
  total_likes?: number;
  total_comentarios?: number;
  usuario_dio_like?: boolean;
}

export interface PublicacionRepository {
  crear(datos: Omit<Publicacion, 'id' | 'empresa_id'>): Promise<Publicacion>;
  listarPorEmpresa(empresa_id: string, limit?: number, offset?: number): Promise<Publicacion[]>;
  eliminar(id: string): Promise<void>;
}
