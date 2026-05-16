import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { TenantSettings, UpdateSettingsRequest } from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = `${environment.apiUrl}/tenants/me/settings`;
  constructor(private http: HttpClient) {}

  get()                        { return this.http.get<TenantSettings>(this.api); }
  update(r: UpdateSettingsRequest) { return this.http.put<TenantSettings>(this.api, r); }
}
