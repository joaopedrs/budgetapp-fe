import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Company, CompanyContact,
  CreateCompanyRequest, UpdateCompanyRequest, UpsertContactRequest
} from '../models/company.model';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly api = `${environment.apiUrl}/companies`;
  constructor(private http: HttpClient) {}

  getAll()             { return this.http.get<Company[]>(this.api); }
  getById(id: number)  { return this.http.get<Company>(`${this.api}/${id}`); }
  create(r: CreateCompanyRequest) { return this.http.post<Company>(this.api, r); }
  update(id: number, r: UpdateCompanyRequest) { return this.http.put<Company>(`${this.api}/${id}`, r); }

  getContacts(id: number) { return this.http.get<CompanyContact[]>(`${this.api}/${id}/contacts`); }
  addContact(id: number, r: UpsertContactRequest) {
    return this.http.post<CompanyContact>(`${this.api}/${id}/contacts`, r);
  }
  updateContact(id: number, contactId: number, r: UpsertContactRequest) {
    return this.http.put<CompanyContact>(`${this.api}/${id}/contacts/${contactId}`, r);
  }
  inactivateContact(id: number, contactId: number) {
    return this.http.patch<void>(`${this.api}/${id}/contacts/${contactId}/inactivate`, {});
  }
}
