export interface Process {
  id: number;
  tenantId: number;
  name: string;
  currentVersion: number;
  createdByUserId: number;
  createdByUserName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessRevision {
  id: number;
  processId: number;
  version: number;
  revisedByUserId: number;
  revisedByUserName: string;
  note: string | null;
  createdAt: string;
}

export interface CreateProcessRequest { name: string; }
export interface UpdateProcessRequest { name: string; isActive: boolean; }
export interface CreateRevisionRequest { note?: string | null; }
