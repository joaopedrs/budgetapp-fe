import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/paged-result.model';
import { CreateRoleRequest, Role, RoleListItem, UpdateRoleRequest } from '../models/role.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/roles`;

  /** Paginated roles list (infinite-scroll friendly). */
  getPaged(page: number, pageSize: number, search?: string | null) {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (search && search.trim()) params = params.set('search', search.trim());
    return this.http.get<PagedResult<RoleListItem>>(this.api, { params });
  }

  getById(id: number) {
    return this.http.get<Role>(`${this.api}/${id}`);
  }

  /**
   * Paginated list of users available for binding to a role (excludes those
   * already linked when `roleId` is provided — useful for the "available" table
   * during edit).
   */
  getAvailableUsers(page: number, pageSize: number, search?: string | null, roleId?: number | null) {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (search && search.trim()) params = params.set('search', search.trim());
    if (roleId) params = params.set('roleId', roleId);
    return this.http.get<PagedResult<User>>(`${this.api}/available-users`, { params });
  }

  create(request: CreateRoleRequest) {
    return this.http.post<Role>(this.api, request);
  }

  update(id: number, request: UpdateRoleRequest) {
    return this.http.put<Role>(`${this.api}/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
