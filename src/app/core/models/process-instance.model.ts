import { FormSchema } from './process-form.model';
import { ProcessStepTransition } from './process-step.model';

export type ProcessInstanceStatus = 'EmAndamento' | 'Finalizado' | 'Cancelado';

export interface AvailableActionDto {
  actionKey: string;
  actionLabel: string;
  transitionType: ProcessStepTransition;
  targetStepNumber?: number | null;
}

export interface HistoryEntryDto {
  id: number;
  stepNumber: number;
  actionKey: string;
  actionLabel: string;
  executedByUserId: number;
  executedByUserName: string;
  note?: string | null;
  executedAt: string;
}

export interface ProcessInstanceDetailResponse {
  id: number;
  processId: number;
  processName: string;
  processVersion: number;
  formVersion: number;
  currentStepNumber?: number | null;
  status: ProcessInstanceStatus;
  requesterUserId: number;
  requesterUserName: string;
  createdAt: string;
  finishedAt?: string | null;
  formSchema: FormSchema;
  formData: Record<string, unknown>;
  availableActions: AvailableActionDto[];
  history: HistoryEntryDto[];
  canExecute: boolean;
}

export interface InboxItemDto {
  taskId: number;
  processInstanceId: number;
  stepNumber: number;
  processName: string;
  requesterUserName: string;
  assignmentReason: string;
  createdAt: string;
}

export interface CreateProcessInstanceRequest {
  processId: number;
  initialFormData?: Record<string, unknown> | null;
}

export interface ExecuteActionRequest {
  actionKey: string;
  formData: Record<string, unknown>;
  note?: string | null;
}
