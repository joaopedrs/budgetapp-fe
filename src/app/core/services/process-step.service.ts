import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  ProcessStepsConfigResponse, SaveProcessStepsRequest
} from '../models/process-step.model';

@Injectable({ providedIn: 'root' })
export class ProcessStepService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/processes`;

  get(processId: number) {
    return this.http.get<ProcessStepsConfigResponse>(`${this.api}/${processId}/steps`);
  }

  save(processId: number, request: SaveProcessStepsRequest) {
    return this.http.put<ProcessStepsConfigResponse>(`${this.api}/${processId}/steps`, request);
  }
}
