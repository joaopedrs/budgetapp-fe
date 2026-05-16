import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Process, ProcessRevision,
  CreateProcessRequest, UpdateProcessRequest, CreateRevisionRequest
} from '../models/process.model';

@Injectable({ providedIn: 'root' })
export class ProcessService {
  private readonly api = `${environment.apiUrl}/processes`;
  constructor(private http: HttpClient) {}

  getAll()             { return this.http.get<Process[]>(this.api); }
  getById(id: number)  { return this.http.get<Process>(`${this.api}/${id}`); }
  create(r: CreateProcessRequest) { return this.http.post<Process>(this.api, r); }
  update(id: number, r: UpdateProcessRequest) { return this.http.put<Process>(`${this.api}/${id}`, r); }

  getRevisions(id: number) { return this.http.get<ProcessRevision[]>(`${this.api}/${id}/revisions`); }
  createRevision(id: number, r: CreateRevisionRequest) {
    return this.http.post<ProcessRevision>(`${this.api}/${id}/revisions`, r);
  }
}
