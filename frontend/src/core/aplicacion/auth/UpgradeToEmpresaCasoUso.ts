import { AuthRepository, TokenJWT } from '../../dominio/auth/AuthRepository';

export class UpgradeToEmpresaCasoUso {
  constructor(private repo: AuthRepository) {}

  async ejecutar(nombreEmpresa: string, nit: string, rut: File | any): Promise<TokenJWT> {
    if (!nombreEmpresa.trim()) throw new Error('El nombre de la empresa es requerido');
    if (!nit.trim()) throw new Error('El NIT de la empresa es requerido');
    if (!rut) throw new Error('El archivo RUT es requerido');

    return this.repo.upgradeToEmpresa(nombreEmpresa, nit, rut);
  }
}
