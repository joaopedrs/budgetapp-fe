/**
 * Frontend mirror of `BudgetApp.Application.DTOs.ProcessForm.*`.
 * Keep field names in camelCase — backend uses `JsonNamingPolicy.CamelCase`.
 */

export type FormFieldType =
  | 'Text' | 'Textarea' | 'Dropdown' | 'Radio' | 'CheckboxMulti'
  | 'Date' | 'Datetime' | 'Time' | 'Number'
  | 'Company' | 'Contact' | 'Table';

export const FIELD_TYPES: { type: FormFieldType; labelKey: string; icon: string }[] = [
  { type: 'Text',          labelKey: 'formBuilder.types.text',          icon: 'short_text' },
  { type: 'Textarea',      labelKey: 'formBuilder.types.textarea',      icon: 'notes' },
  { type: 'Number',        labelKey: 'formBuilder.types.number',        icon: 'pin' },
  { type: 'Dropdown',      labelKey: 'formBuilder.types.dropdown',      icon: 'arrow_drop_down_circle' },
  { type: 'Radio',         labelKey: 'formBuilder.types.radio',         icon: 'radio_button_checked' },
  { type: 'CheckboxMulti', labelKey: 'formBuilder.types.checkboxMulti', icon: 'check_box' },
  { type: 'Date',          labelKey: 'formBuilder.types.date',          icon: 'event' },
  { type: 'Datetime',      labelKey: 'formBuilder.types.datetime',      icon: 'event_note' },
  { type: 'Time',          labelKey: 'formBuilder.types.time',          icon: 'schedule' },
  { type: 'Company',       labelKey: 'formBuilder.types.company',       icon: 'business' },
  { type: 'Contact',       labelKey: 'formBuilder.types.contact',       icon: 'contact_phone' },
  { type: 'Table',         labelKey: 'formBuilder.types.table',         icon: 'table_chart' }
];

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldValidation {
  min?: number | null;
  max?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
  pattern?: string | null;
  minRows?: number | null;
  maxRows?: number | null;
}

/** Operadores suportados em condições de regra (FormFieldRule + ProcessStepActionCondition). */
export type RuleOperator = 'eq' | 'ne' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte';

export const RULE_OPERATORS: { value: RuleOperator; labelKey: string }[] = [
  { value: 'eq',       labelKey: 'rules.operators.eq' },
  { value: 'ne',       labelKey: 'rules.operators.ne' },
  { value: 'contains', labelKey: 'rules.operators.contains' },
  { value: 'gt',       labelKey: 'rules.operators.gt' },
  { value: 'lt',       labelKey: 'rules.operators.lt' },
  { value: 'gte',      labelKey: 'rules.operators.gte' },
  { value: 'lte',      labelKey: 'rules.operators.lte' }
];

/**
 * Regra de evento de campo: quando o campo `whenField` satisfizer o operador
 * com `whenValue`, aplica os efeitos (lock/hide/require) no campo dono dessa
 * regra. Múltiplas regras = AND (todas precisam casar para o efeito disparar).
 */
export interface FormFieldRule {
  whenField: string;
  whenOp: RuleOperator;
  /** Valor literal — string|number|boolean depending on the operand field. */
  whenValue: string | number | boolean | null;
  effect: 'lock' | 'hide' | 'require';
}

/** Quando a fórmula deve ser reavaliada. Default: OnChange (comportamento legado). */
export type FormulaTrigger = 'OnChange' | 'OnBlur' | 'OnSelect';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
  invisible?: boolean;
  locked?: boolean;
  formula?: string | null;
  /** Quando reavaliar a fórmula. Default OnChange (compatibilidade retro). */
  formulaTrigger?: FormulaTrigger | null;
  dependsOn?: string | null;
  placeholder?: string | null;
  helpText?: string | null;
  options?: FormFieldOption[] | null;
  validation?: FormFieldValidation | null;
  /** Regras de evento condicionais — bloquear, ocultar ou exigir baseado em outro campo. */
  rules?: FormFieldRule[] | null;
  /** Sub-fields when `type === 'Table'`. */
  columns?: FormField[] | null;
}

export interface FormSchema {
  fields: FormField[];
}

export interface ProcessFormResponse {
  id: number;
  processId: number;
  version: number;
  schema: FormSchema;
  /** HTML do template (Quill output). Null/vazio quando não configurado. */
  templateHtml: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveFormSchemaRequest {
  schema: FormSchema;
  /** Null preserva o template salvo; string vazia limpa; valor atualiza. */
  templateHtml?: string | null;
}

export interface EvaluateFormulasRequest {
  values: Record<string, unknown>;
}

export interface EvaluateFormulasResponse {
  values: Record<string, unknown>;
}
