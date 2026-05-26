import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PagedResult } from '../models/paged-result.model';
import {
  CreateProcessInstanceRequest, ExecuteActionRequest, InboxItemDto,
  ProcessInstanceDetailResponse
} from '../models/process-instance.model';
import { FinishedFilter, FinishedInstanceItem } from '../models/finished-instance.model';

/** Scope da listagem de finalizados — espelha `FinishedScope` do BE. */
export type FinishedScope = 'Mine' | 'Participated' | 'All';

/** Filtros opcionais da inbox. */
export interface InboxFilter {
  search?: string | null;
  processId?: number | null;
  instanceId?: number | null;
  createdFrom?: string | null;
  createdTo?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProcessInstanceService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/process-instances`;

  create(request: CreateProcessInstanceRequest) {
    return this.http.post<{ id: number }>(this.api, request);
  }

  /** Inbox com filtros opcionais — search livre + processo + código + range de abertura. */
  getInbox(page: number, pageSize: number, filters: InboxFilter = {}) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (filters.search?.trim())  params = params.set('search',      filters.search.trim());
    if (filters.processId)       params = params.set('processId',   filters.processId);
    if (filters.instanceId)      params = params.set('instanceId',  filters.instanceId);
    if (filters.createdFrom)     params = params.set('createdFrom', filters.createdFrom);
    if (filters.createdTo)       params = params.set('createdTo',   filters.createdTo);
    return this.http.get<PagedResult<InboxItemDto>>(`${this.api}/me`, { params });
  }

  getById(id: number) {
    return this.http.get<ProcessInstanceDetailResponse>(`${this.api}/${id}`);
  }

  executeAction(id: number, request: ExecuteActionRequest) {
    return this.http.post<void>(`${this.api}/${id}/actions`, request);
  }

  /** Listagem paginada de fluxos finalizados — usada pela tela /finished. */
  getFinished(page: number, pageSize: number, filters: FinishedFilter, scope: FinishedScope = 'Mine') {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize)
      .set('scope', scope);

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
