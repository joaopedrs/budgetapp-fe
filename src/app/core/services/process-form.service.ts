import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  EvaluateFormulasRequest, EvaluateFormulasResponse,
  ProcessFormResponse, SaveFormSchemaRequest
} from '../models/process-form.model';

/**
 * Cliente do `ProcessFormController`. As três operações são:
 *  - GET    /processes/{id}/form           → schema atual (ou vazio)
 *  - PUT    /processes/{id}/form           → cria/atualiza (Admin)
 *  - POST   /processes/{id}/form/evaluate  → reavalia fórmulas no servidor
 */
@Injectable({ providedIn: 'root' })
export class ProcessFormService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/processes`;

  get(processId: number) {
    return this.http.get<ProcessFormResponse>(`${this.api}/${processId}/form`);
  }

  save(processId: number, request: SaveFormSchemaRequest) {
    return this.http.put<ProcessFormResponse>(`${this.api}/${processId}/form`, request);
  }

  evaluate(processId: number, request: EvaluateFormulasRequest) {
    return this.http.post<EvaluateFormulasResponse>(`${this.api}/${processId}/form/evaluate`, request);
  }
}
