import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, EMPTY, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TenantSettingsResponse } from '../models/auth.model';

const DEFAULT_PRIMARY = '#7c3aed';
const DEFAULT_SECONDARY = '#4f46e5';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** Fetches tenant settings from the API and applies theme CSS variables. */
  loadAndApply() {
    return this.http
      .get<TenantSettingsResponse>(`${this.api}/tenants/me/settings`)
      .pipe(
        tap(settings => this.apply(settings)),
        catchError(() => {
          this.applyDefaults();
          return EMPTY;
        })
      );
  }

  apply(settings: TenantSettingsResponse): void {
    const root = document.documentElement.style;
    root.setProperty('--color-primary', settings.themePrimaryColor ?? DEFAULT_PRIMARY);
    root.setProperty('--color-secondary', settings.themeSecondaryColor ?? DEFAULT_SECONDARY);
    if (settings.logoUrl) {
      root.setProperty('--logo-url', `url('${settings.logoUrl}')`);
    } else {
      root.removeProperty('--logo-url');
    }
  }

  applyDefaults(): void {
    const root = document.documentElement.style;
    root.setProperty('--color-primary', DEFAULT_PRIMARY);
    root.setProperty('--color-secondary', DEFAULT_SECONDARY);
    root.removeProperty('--logo-url');
  }
}
