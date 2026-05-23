export interface TenantSettings {
  tenantId: number;
  themePrimaryColor: string | null;
  themeSecondaryColor: string | null;
  logoUrl: string | null;
  arrivalNotificationTemplate: string | null;
  smtpConfigured: boolean;
}

export interface UpdateSettingsRequest {
  themePrimaryColor: string | null;
  themeSecondaryColor: string | null;
  logoUrl: string | null;
  arrivalNotificationTemplate: string | null;
}

/** Resposta do GET de SMTP do system tenant (não inclui a senha). */
export interface SystemSmtpResponse {
  server: string | null;
  port: number | null;
  email: string | null;
  useSsl: boolean;
  fromName: string | null;
  hasPassword: boolean;
}

export interface UpdateSystemSmtpRequest {
  server: string;
  port: number;
  email: string;
  password?: string | null;     // null/"" preserva senha existente
  useSsl: boolean;
  fromName: string | null;
}

export interface SmtpTestRequest {
  to: string;
  smtp: UpdateSystemSmtpRequest;
}
