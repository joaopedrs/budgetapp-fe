export interface TenantSettings {
  tenantId: number;
  themePrimaryColor: string | null;
  themeSecondaryColor: string | null;
  logoUrl: string | null;
  smtpConfigured: boolean;
}

export interface UpdateSettingsRequest {
  themePrimaryColor: string | null;
  themeSecondaryColor: string | null;
  logoUrl: string | null;
}
