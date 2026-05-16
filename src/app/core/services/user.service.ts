import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  User, CreateUserRequest, UpdateUserRequest,
  UpdateProfileRequest, ChangePasswordRequest
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<User[]>(this.api);
  }

  getById(id: number) {
    return this.http.get<User>(`${this.api}/${id}`);
  }

  create(request: CreateUserRequest) {
    return this.http.post<User>(this.api, request);
  }

  update(id: number, request: UpdateUserRequest) {
    return this.http.put<User>(`${this.api}/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  // Self-service profile endpoints
  getMe() {
    return this.http.get<User>(`${this.api}/me`);
  }

  updateMe(request: UpdateProfileRequest) {
    return this.http.put<User>(`${this.api}/me`, request);
  }

  changePassword(request: ChangePasswordRequest) {
    return this.http.post<void>(`${this.api}/me/change-password`, request);
  }
}
