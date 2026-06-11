import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Page, Usuario, Role, TipoUser } from '../interfaces/usuarios';

const environment = (window as any).__env as any;

const baseSecurity = `${environment.API_GATEWAY_URL}/${environment.API_PATH_SECURITY}`;
const baseUsers   = `${baseSecurity}/users`;
const rolesAll    = `${baseSecurity}/roles/get-all`;

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  constructor(private http: HttpClient) {}

  listarUsuarios(opts: { buscar?: string; dependenciaId?: number | null; page: number; size: number; }) {
    let params = new HttpParams()
      .set('page', String(opts.page ?? 0))
      .set('size', String(opts.size ?? 10));
    if (opts.buscar?.trim()) params = params.set('buscar', opts.buscar.trim());
    if (typeof opts.dependenciaId === 'number' && opts.dependenciaId > 0) {
      params = params.set('dependenciaId', String(opts.dependenciaId));
    }
    return this.http.get<Page<Usuario>>(baseUsers, { params });
  }

  getInstancias(): Observable<any[]> {
    const baseUrlExp = `${environment.API_GATEWAY_URL}/${environment.API_PATH_EXPEDIENTES}`;
    return this.http.get<any[]>(`${baseUrlExp}/instancias/active`);
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(rolesAll);
  }

  /** <- NUEVO: actualiza los roles del usuario (ajusta si tu API usa otra ruta) */
  updateUserRoles(userId: number, roleIds: number[]): Observable<void> {
    return this.http.put<void>(`${baseSecurity}/users/${userId}/roles`, roleIds);
  }

  getTipoUsuarios(): Observable<TipoUser[]> {
    return this.http.get<TipoUser[]>(`${baseSecurity}/typeusers/get-all`);
  }

  // Si manejas catálogo de cargos por id:
  getCargos(): Observable<{id:number; nombre:string}[]> {
    return this.http.get<{id:number; nombre:string}[]>(`${baseSecurity}/cargos/get-all`);
  }

  createUser(body: any): Observable<any> {
    return this.http.post(`${baseUsers}`, body);
  }
}