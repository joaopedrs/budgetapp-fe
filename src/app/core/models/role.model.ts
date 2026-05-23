export interface RoleListItem {
  id: number;
  description: string;
  isActive: boolean;
  usersCount: number;
}

export interface RoleUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

export interface Role {
  id: number;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  users: RoleUser[];
}

export interface CreateRoleRequest {
  description: string;
  userIds?: number[];
}

export interface UpdateRoleRequest {
  description: string;
  isActive: boolean;
  userIds?: number[];
}
