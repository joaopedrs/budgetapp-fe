/** Espelho de `BudgetApp.Core.Entities.Enums.ProcessExecutorType`. */
export type ProcessExecutorType = 'Solicitante' | 'Usuario' | 'Papel' | 'Cliente';

/** Espelho de `BudgetApp.Core.Entities.Enums.ProcessStepTransition`. */
export type ProcessStepTransition = 'Finalizar' | 'Avancar' | 'VoltarParaEtapa';

export interface ProcessStepActionDto {
  id?: number | null;
  actionKey: string;
  actionLabel: string;
  transitionType: ProcessStepTransition;
  targetStepNumber?: number | null;
}

export interface ProcessStepDto {
  id?: number | null;
  stepNumber: 1 | 2 | 3;
  isEnabled: boolean;
  executorType: ProcessExecutorType;
  executorUserId?: number | null;
  executorRoleId?: number | null;
  /** Id (snake_case) de um campo Contact do formulário — só quando executorType=Cliente. */
  executorFormFieldId?: string | null;
  notifyOnArrival: boolean;
  sendPdf: boolean;
  actions: ProcessStepActionDto[];
  // Read-only, vindo do GET — undefined no save.
  executorUserName?: string | null;
  executorRoleDescription?: string | null;
}

export interface ProcessStepsConfigResponse {
  processId: number;
  steps: ProcessStepDto[];
}

export interface SaveProcessStepsRequest {
  steps: ProcessStepDto[];
}

/** Metadados para o select de tipo de executor. */
export const EXECUTOR_TYPES: { value: ProcessExecutorType; labelKey: string; icon: string }[] = [
  { value: 'Solicitante', labelKey: 'steps.executors.solicitante', icon: 'person' },
  { value: 'Usuario',     labelKey: 'steps.executors.usuario',     icon: 'badge' },
  { value: 'Papel',       labelKey: 'steps.executors.papel',       icon: 'admin_panel_settings' },
  { value: 'Cliente',     labelKey: 'steps.executors.cliente',     icon: 'contact_phone' }
];

export const TRANSITION_TYPES: { value: ProcessStepTransition; labelKey: string; icon: string }[] = [
  { value: 'Avancar',         labelKey: 'steps.transitions.avancar',   icon: 'arrow_forward' },
  { value: 'Finalizar',       labelKey: 'steps.transitions.finalizar', icon: 'flag' },
  { value: 'VoltarParaEtapa', labelKey: 'steps.transitions.voltar',    icon: 'undo' }
];
