export interface Company {
  id: number;
  tenantId: number;
  name: string;
  cnpj: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyContact {
  id: number;
  companyId: number;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyRequest { name: string; cnpj: string; email: string; phone?: string | null; }
export interface UpdateCompanyRequest { name: string; cnpj: string; email: string; phone?: string | null; isActive: boolean; }
export interface UpsertContactRequest { name: string; email: string; phone?: string | null; position?: string | null; }
