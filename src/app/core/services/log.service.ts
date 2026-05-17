import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SystemLog } from '../models/log.model';

@Injectable({ providedIn: 'root' })
export class LogService {
  private readonly api = `${environment.apiUrl}/logs`;
  private http = inject(HttpClient);

  getAll()                 { return this.http.get<SystemLog[]>(this.api); }
  getById(id: number)      { return this.http.get<SystemLog>(`${this.api}/${id}`); }
  getByUser(userId: number) { return this.http.get<SystemLog[]>(`${this.api}/user/${userId}`); }
}
