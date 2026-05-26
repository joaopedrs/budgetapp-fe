/** Espelho de `BudgetApp.Core.Entities.Enums.ProcessExecutorType`. */
export type ProcessExecutorType = 'Solicitante' | 'Usuario' | 'Papel' | 'Cliente';

/** Espelho de `BudgetApp.Core.Entities.Enums.ProcessStepTransition`. */
export type ProcessStepTransition = 'Finalizar' | 'Avancar' | 'VoltarParaEtapa';

/** Espelho de `BudgetApp.Core.Entities.Enums.ProcessStepRecipientType`. */
export type ProcessStepRecipientType = 'Executor' | 'Contact' | 'FixedEmail';

/** Espelho do BE RuleOperator — mesmo enum usado em field rules e step branching. */
export type StepConditionOperator = 'Eq' | 'Ne' | 'Contains' | 'Gt' | 'Lt' | 'Gte' | 'Lte';

export const STEP_CONDITION_OPERATORS: { value: StepConditionOperator; labelKey: string }[] = [
  { value: 'Eq',       labelKey: 'rules.operators.eq' },
  { value: 'Ne',       labelKey: 'rules.operators.ne' },
  { value: 'Contains', labelKey: 'rules.operators.contains' },
  { value: 'Gt',       labelKey: 'rules.operators.gt' },
  { value: 'Lt',       labelKey: 'rules.operators.lt' },
  { value: 'Gte',      labelKey: 'rules.operators.gte' },
  { value: 'Lte',      labelKey: 'rules.operators.lte' }
];

/**
 * Condição de branching: quando satisfeita, sobrescreve o target padrão da ação.
 * Order define a sequência de avaliação (primeira que casar vence).
 */
export interface StepConditionDto {
  id?: number | null;
  order: number;
  whenField: string;
  whenOp: StepConditionOperator;
  whenValue: string | null;
  targetStepNumber: 1 | 2 | 3;
}

export interface ProcessStepActionDto {
  id?: number | null;
  actionKey: string;
  actionLabel: string;
  transitionType: ProcessStepTransition;
  targetStepNumber?: number | null;
  /** Branching condicional opcional — null/[] = comportamento clássico. */
  conditions?: StepConditionDto[] | null;
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
  /**
   * Dispara o envio do template do formulário quando a instância chega na etapa.
   * Atenção: BE serializa esse flag como `sendPdf` (nome legado) — mantemos o
   * mesmo nome aqui pra zero atrito de mapeamento.
   */
  sendPdf: boolean;
  actions: ProcessStepActionDto[];
  /** Destinatário do template (Executor | Contact | FixedEmail). */
  templateRecipientType?: ProcessStepRecipientType;
  /** Id do contato (string com int) ou e-mail literal, conforme o tipo. */
  templateRecipientValue?: string | null;
  /** Quando true, anexa o template renderizado como PDF além do texto. */
  attachPdf?: boolean;
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

export const RECIPIENT_TYPES: { value: ProcessStepRecipientType; labelKey: string; icon: string }[] = [
  { value: 'Executor',   labelKey: 'steps.recipients.executor',   icon: 'badge' },
  { value: 'Contact',    labelKey: 'steps.recipients.contact',    icon: 'contact_phone' },
  { value: 'FixedEmail', labelKey: 'steps.recipients.fixedEmail', icon: 'alternate_email' }
];
