/** Mirror dos DTOs de `BudgetApp.Application.DTOs.Tenant.*`. */

export interface TenantListItem {
  id: number;
  code: string;
  name: string;
  clientName: string | null;
  cnpj: string | null;
  lastAccessAt: string | null;
  createdAt: string;
  isSystemTenant: boolean;
  isActive: boolean;
}

export interface TenantDetail {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string | null;
  cnpj: string | null;
  clientName: string | null;
  isSystemTenant: boolean;
  isActive: boolean;
  lastAccessAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantRequest {
  code: string;
  name: string;
  email: string;
  phone?: string | null;
  cnpj?: string | null;
  clientName?: string | null;
}

export interface UpdateTenantRequest {
  code: string;
  name: string;
  email: string;
  phone: string | null;
  clientName: string | null;
  isActive: boolean;
}
