import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  SmtpTestRequest, SystemSmtpResponse, TenantSettings,
  UpdateSettingsRequest, UpdateSystemSmtpRequest
} from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/tenants`;

  // ---- Settings do tenant atual (tema + notification template) ----
  get()                            { return this.http.get<TenantSettings>(`${this.api}/me/settings`); }
  update(r: UpdateSettingsRequest) { return this.http.put<TenantSettings>(`${this.api}/me/settings`, r); }

  // ---- SMTP — exclusivo do system tenant ----
  getSystemSmtp()                       { return this.http.get<SystemSmtpResponse>(`${this.api}/system/smtp`); }
  updateSystemSmtp(r: UpdateSystemSmtpRequest) { return this.http.put<SystemSmtpResponse>(`${this.api}/system/smtp`, r); }
  testSystemSmtp(r: SmtpTestRequest)    { return this.http.post<void>(`${this.api}/system/smtp/test`, r); }
}
