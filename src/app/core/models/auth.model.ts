export interface LoginRequest {
  tenantCode: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface TokenPayload {
  sub: string;         // userId (int as string)
  email: string;
  role: string;
  tenant_id: number;
  tenant_code: string;
  is_system_tenant: boolean;
  name?: string;
  jti: string;
  exp: number;
}

export interface TenantSettingsResponse {
  tenantId: number;
  themePrimaryColor: string | null;
  themeSecondaryColor: string | null;
  logoUrl: string | null;
  smtpConfigured: boolean;
}
