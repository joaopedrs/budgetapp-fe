import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  CreateTenantRequest, TenantDetail, TenantListItem, UpdateTenantRequest
} from '../models/tenant.model';

/**
 * CRUD de Tenants — endpoints restritos ao system tenant admin no BE
 * (retornam 403 fora do contexto). Sem paginação por ora — listagem completa
 * (raramente passa de dezenas de tenants no SaaS atual).
 */
@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/tenants`;

  getAll()                       { return this.http.get<TenantListItem[]>(this.api); }
  getById(id: number)            { return this.http.get<TenantDetail>(`${this.api}/${id}`); }
  create(r: CreateTenantRequest) { return this.http.post<TenantDetail>(this.api, r); }
  update(id: number, r: UpdateTenantRequest) {
    return this.http.put<TenantDetail>(`${this.api}/${id}`, r);
  }
}
