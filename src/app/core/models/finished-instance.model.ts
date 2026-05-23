import { ProcessInstanceStatus } from './process-instance.model';

/** Item da listagem de fluxos finalizados — espelho do BE `FinishedInstanceItemDto`. */
export interface FinishedInstanceItem {
  id: number;
  processId: number;
  processName: string;
  status: ProcessInstanceStatus;          // 'Finalizado' | 'Cancelado'
  requesterUserId: number;
  requesterUserName: string;
  createdAt: string;
  finishedAt: string;
}

/** Filtros consumidos como query params pelo endpoint `/process-instances/finished`. */
export interface FinishedFilter {
  processId?: number | null;
  instanceId?: number | null;
  status?: ProcessInstanceStatus | null;  // somente Finalizado ou Cancelado
  createdFrom?: string | null;            // ISO date (yyyy-MM-dd suficiente)
  createdTo?: string | null;
  finishedFrom?: string | null;
  finishedTo?: string | null;
}
