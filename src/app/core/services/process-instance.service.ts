import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/paged-result.model';
import {
  CreateProcessInstanceRequest, ExecuteActionRequest, InboxItemDto,
  ProcessInstanceDetailResponse
} from '../models/process-instance.model';
import { FinishedFilter, FinishedInstanceItem } from '../models/finished-instance.model';

@Injectable({ providedIn: 'root' })
export class ProcessInstanceService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/process-instances`;

  create(request: CreateProcessInstanceRequest) {
    return this.http.post<{ id: number }>(this.api, request);
  }

  getInbox(page: number, pageSize: number, search?: string | null) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<PagedResult<InboxItemDto>>(`${this.api}/me`, { params });
  }

  getById(id: number) {
    return this.http.get<ProcessInstanceDetailResponse>(`${this.api}/${id}`);
  }

  executeAction(id: number, request: ExecuteActionRequest) {
    return this.http.post<void>(`${this.api}/${id}/actions`, request);
  }

  /** Listagem paginada de fluxos finalizados — usada pela tela /finished. */
  getFinished(page: number, pageSize: number, filters: FinishedFilter) {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);

    // Anexa filtros opcionais — pulamos null/undefined/"" pra manter URL limpa.
    if (filters.processId)    params = params.set('processId',  filters.processId);
    if (filters.instanceId)   params = params.set('instanceId', filters.instanceId);
    if (filters.status)       params = params.set('status',     filters.status);
    if (filters.createdFrom)  params = params.set('createdFrom',  filters.createdFrom);
    if (filters.createdTo)    params = params.set('createdTo',    filters.createdTo);
    if (filters.finishedFrom) params = params.set('finishedFrom', filters.finishedFrom);
    if (filters.finishedTo)   params = params.set('finishedTo',   filters.finishedTo);

    return this.http.get<PagedResult<FinishedInstanceItem>>(`${this.api}/finished`, { params });
  }
}
