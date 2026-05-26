import { FormFieldRule, RuleOperator } from '../../core/models/process-form.model';

/**
 * Avaliação de condições para regras de campo (FormFieldRule) e — em sessão
 * futura — para branching de etapas (ProcessStepActionCondition).
 * Stateless, pode rodar em qualquer lugar.
 */
export function evaluateOperator(op: RuleOperator, fieldValue: unknown, target: unknown): boolean {
  switch (op) {
    case 'eq':       return coerceEq(fieldValue, target);
    case 'ne':       return !coerceEq(fieldValue, target);
    case 'contains': return containsCheck(fieldValue, target);
    case 'gt':       return compareNumeric(fieldValue, target, (a, b) => a >  b);
    case 'lt':       return compareNumeric(fieldValue, target, (a, b) => a <  b);
    case 'gte':      return compareNumeric(fieldValue, target, (a, b) => a >= b);
    case 'lte':      return compareNumeric(fieldValue, target, (a, b) => a <= b);
    default:         return false;
  }
}

/**
 * Avalia uma lista de regras. Múltiplas regras com o MESMO `effect` agem
 * como OR: se qualquer uma casar, o efeito é aplicado. Isso permite usar
 * múltiplas linhas para "lock quando A=x OU B=y" sem precisar de expressão
 * composta.
 *
 * Retorna o conjunto de efeitos que devem ser aplicados ao campo dono das regras.
 */
export function evaluateRules(
  rules: FormFieldRule[] | null | undefined,
  values: Record<string, unknown>
): { locked: boolean; hidden: boolean; required: boolean } {
  const out = { locked: false, hidden: false, required: false };
  if (!rules || rules.length === 0) return out;

  for (const r of rules) {
    if (evaluateOperator(r.whenOp, values[r.whenField], r.whenValue)) {
      if (r.effect === 'lock')     out.locked = true;
      else if (r.effect === 'hide')    out.hidden = true;
      else if (r.effect === 'require') out.required = true;
    }
  }
  return out;
}

// -------- helpers --------

function coerceEq(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined) return b === null || b === undefined || b === '';
  if (b === null || b === undefined) return a === '' as unknown;
  // Booleanos como strings ("true"/"false") são comuns vindo de inputs/HTML.
  if (typeof a === 'boolean' || typeof b === 'boolean')
    return String(a).toLowerCase() === String(b).toLowerCase();
  // Comparação numérica quando ambos podem ser numéricos (1 == "1").
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return String(a) === String(b);
}

function containsCheck(haystack: unknown, needle: unknown): boolean {
  if (haystack === null || haystack === undefined) return false;
  if (Array.isArray(haystack)) return haystack.includes(needle);
  return String(haystack).toLowerCase().includes(String(needle ?? '').toLowerCase());
}

function compareNumeric(a: unknown, b: unknown, cmp: (x: number, y: number) => boolean): boolean {
  const na = Number(a), nb = Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return false;
  return cmp(na, nb);
}
