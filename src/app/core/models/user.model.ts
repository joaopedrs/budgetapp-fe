export interface User {
  id: number;
  tenantId: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  lastPasswordChangeAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
  role: string;
  tenantId?: number | null;
}

export interface UpdateUserRequest {
  name: string;
  phone?: string | null;
  password?: string | null;
  role: string;
  isActive: boolean;
}

export interface UpdateProfileRequest {
  name: string;
  phone?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
