import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  userCount: number;
  logsToday: number;
  processesActive: number;
  instancesInProgress: number;
}

/** Lê /dashboard/stats em uma round-trip. */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/dashboard`;
  getStats() { return this.http.get<DashboardStats>(`${this.api}/stats`); }
}
