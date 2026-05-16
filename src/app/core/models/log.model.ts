export interface SystemLog {
  id: string;
  userId: string | null;
  logLevel: string;
  description: string;
  appCode: string;
  actionCode: string;
  createdAt: string;
}
