import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SystemLog } from '../models/log.model';

@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly api = `${environment.apiUrl}/logs`;

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<SystemLog[]>(this.api);
  }

  getByUser(userId: string) {
    return this.http.get<SystemLog[]>(`${this.api}/user/${userId}`);
  }
}
