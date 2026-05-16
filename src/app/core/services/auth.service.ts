import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, TokenPayload } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'ba_access_token';
const REFRESH_TOKEN_KEY = 'ba_refresh_token';
const EXPIRES_AT_KEY = 'ba_expires_at';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = environment.apiUrl;

  private _user = signal<TokenPayload | null>(this.parseStoredToken());

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'Admin');
  readonly isSystemTenant = computed(() => this._user()?.is_system_tenant === true);

  /** Display name: prefers `name` claim, falls back to email local-part. */
  readonly displayName = computed(() => {
    const u = this._user();
    if (!u) return '';
    return u.name ?? u.email.split('@')[0];
  });

  /** Two-letter avatar initials derived from display name. */
  readonly initials = computed(() => {
    const name = this.displayName();
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private http: HttpClient, private router: Router) {
    if (this.isLoggedIn()) {
      this.scheduleRefresh();
    }
  }

  login(request: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.api}/auth/login`, request).pipe(
      tap(res => this.handleAuthResponse(res))
    );
  }

  refresh() {
    const token = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!token) return EMPTY;
    return this.http
      .post<LoginResponse>(`${this.api}/auth/refresh`, { refreshToken: token })
      .pipe(tap(res => this.handleAuthResponse(res)));
  }

  logout() {
    const token = localStorage.getItem(REFRESH_TOKEN_KEY);
    const req = token
      ? this.http.post(`${this.api}/auth/logout`, { refreshToken: token })
      : EMPTY;

    req.pipe(catchError(() => EMPTY)).subscribe();
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  isTokenExpired(): boolean {
    const exp = localStorage.getItem(EXPIRES_AT_KEY);
    if (!exp) return true;
    return new Date(exp) <= new Date();
  }

  private handleAuthResponse(res: LoginResponse) {
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    localStorage.setItem(EXPIRES_AT_KEY, res.expiresAt);
    this._user.set(this.decodeToken(res.accessToken));
    this.scheduleRefresh();
  }

  private scheduleRefresh() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    const exp = localStorage.getItem(EXPIRES_AT_KEY);
    if (!exp) return;

    const msUntilExpiry = new Date(exp).getTime() - Date.now();
    const refreshIn = Math.max(msUntilExpiry - 2 * 60 * 1000, 0);

    this.refreshTimer = setTimeout(() => {
      this.refresh().subscribe({
        error: () => {
          this.clearSession();
          this.router.navigate(['/login'], { queryParams: { expired: '1' } });
        }
      });
    }, refreshIn);
  }

  private clearSession() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    this._user.set(null);
  }

  private parseStoredToken(): TokenPayload | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;
    const exp = localStorage.getItem(EXPIRES_AT_KEY);
    if (exp && new Date(exp) <= new Date()) return null;
    return this.decodeToken(token);
  }

  private decodeToken(token: string): TokenPayload | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload)) as TokenPayload;
    } catch {
      return null;
    }
  }
}
