export interface Empresa {
  id: string;
  nombre: string;
  slug: string;
  logo_url: string | null;
  foto_portada_url: string | null;
  fecha_suscripcion: string;
  activa: boolean;
  admin_email: string;
  admin_nombre: string;
  profesionales: number;
  usuarios: number;
  publicaciones: number;
  likes: number;
  tipo_plan: string;
  actividad_semanal: number[];
  ciudad: string | null;
  pais: string | null;
  direccion: string | null;
  telefono: string | null;
}
