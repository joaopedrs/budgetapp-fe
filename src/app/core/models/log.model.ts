/** Mirrors the ActionType enum on the backend (Core/Entities/Enums/ActionType.cs). */
export enum ActionType {
  Create = 1,
  Edit = 2,
  Delete = 3,
  EmailSent = 4,
  FlowAdvance = 5,
  FlowFinish = 6
}

export interface SystemLog {
  id: number;
  tenantId: number | null;
  tenantName: string | null;
  userId: number | null;
  userName: string | null;
  logLevel: string;
  description: string;
  keyCode: string;
  actionType: ActionType;
  screenCode: string;
  createdAt: string;
}

export function actionTypeLabel(a: ActionType): string {
  switch (a) {
    case ActionType.Create:      return 'Criação';
    case ActionType.Edit:        return 'Edição';
    case ActionType.Delete:      return 'Exclusão';
    case ActionType.EmailSent:   return 'E-mail Enviado';
    case ActionType.FlowAdvance: return 'Avanço de Fluxo';
    case ActionType.FlowFinish:  return 'Finalização de Fluxo';
    default: return String(a);
  }
}
