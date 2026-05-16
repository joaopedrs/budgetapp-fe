import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { TranslocoModule } from '@jsverse/transloco';
import { CompanyService } from '../../core/services/company.service';
import { CompanyContact } from '../../core/models/company.model';
import { ContactDialogComponent } from './contact-dialog.component';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTableModule, MatTabsModule, MatDialogModule,
    MatChipsModule, TranslocoModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ isEdit() ? 'Editar Empresa' : 'Nova Empresa' }}</h2>
        </div>
        <button mat-stroked-button (click)="router.navigate(['/companies'])">
          <mat-icon>arrow_back</mat-icon> Voltar
        </button>
      </div>

      <mat-tab-group>
        <!-- TAB 1: Company data -->
        <mat-tab label="Dados da Empresa">
          <mat-card class="form-card tab-content">
            <mat-card-content>
              <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="form-grid">
                  <mat-form-field appearance="outline">
                    <mat-label>Nome</mat-label>
                    <input matInput formControlName="name" />
                    @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
                      <mat-error>Nome é obrigatório</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>CNPJ</mat-label>
                    <input matInput formControlName="cnpj" placeholder="00.000.000/0000-00 ou alfanumérico" />
                    @if (form.get('cnpj')?.hasError('required') && form.get('cnpj')?.touched) {
                      <mat-error>CNPJ é obrigatório</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>E-mail</mat-label>
                    <input matInput type="email" formControlName="email" />
                    @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                      <mat-error>E-mail é obrigatório</mat-error>
                    }
                    @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                      <mat-error>E-mail inválido</mat-error>
                    }
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Telefone</mat-label>
                    <input matInput formControlName="phone" />
                  </mat-form-field>
                </div>

                <div class="form-actions">
                  <button mat-stroked-button type="button" (click)="router.navigate(['/companies'])">
                    Cancelar
                  </button>
                  <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
                    @if (saving()) {
                      <ng-container><mat-spinner diameter="18" /></ng-container>
                    } @else {
                      <ng-container>Salvar</ng-container>
                    }
                  </button>
                </div>
              </form>
            </mat-card-content>
          </mat-card>
        </mat-tab>

        <!-- TAB 2: Contacts (only in edit mode) -->
        @if (isEdit()) {
          <mat-tab label="Contatos">
            <mat-card class="tab-content">
              <mat-card-content>
                <div class="contacts-header">
                  <span class="contacts-count">{{ contacts().length }} contato(s)</span>
                  <button mat-flat-button color="accent" (click)="openContactDialog()">
                    <mat-icon>person_add</mat-icon> Adicionar Contato
                  </button>
                </div>

                @if (loadingContacts()) {
                  <div class="loading-center"><mat-spinner diameter="32" /></div>
                } @else {
                  <table mat-table [dataSource]="contacts()" class="full-width">
                    <ng-container matColumnDef="name">
                      <th mat-header-cell *matHeaderCellDef>Nome</th>
                      <td mat-cell *matCellDef="let c">{{ c.name }}</td>
                    </ng-container>
                    <ng-container matColumnDef="email">
                      <th mat-header-cell *matHeaderCellDef>E-mail</th>
                      <td mat-cell *matCellDef="let c">{{ c.email }}</td>
                    </ng-container>
                    <ng-container matColumnDef="phone">
                      <th mat-header-cell *matHeaderCellDef>Telefone</th>
                      <td mat-cell *matCellDef="let c">{{ c.phone || '—' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="position">
                      <th mat-header-cell *matHeaderCellDef>Cargo</th>
                      <td mat-cell *matCellDef="let c">{{ c.position || '—' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let c">
                        <mat-chip [class]="c.isActive ? 'chip-active' : 'chip-inactive'">
                          {{ c.isActive ? 'Ativo' : 'Inativo' }}
                        </mat-chip>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef>Ações</th>
                      <td mat-cell *matCellDef="let c">
                        <button mat-icon-button (click)="openContactDialog(c)" title="Editar">
                          <mat-icon>edit</mat-icon>
                        </button>
                        @if (c.isActive) {
                          <button mat-icon-button color="warn" (click)="inactivateContact(c)" title="Inativar">
                            <mat-icon>block</mat-icon>
                          </button>
                        }
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="contactCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: contactCols;"></tr>
                  </table>
                  @if (contacts().length === 0) {
                    <div class="no-data">Nenhum contato cadastrado.</div>
                  }
                }
              </mat-card-content>
            </mat-card>
          </mat-tab>
        }
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0; color: #1e1145; }
    .tab-content { margin-top: 16px; max-width: 900px; }
    .form-card { max-width: 720px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
    mat-form-field { width: 100%; }
    .contacts-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .contacts-count { color: rgba(0,0,0,0.55); font-size: 14px; }
    .full-width { width: 100%; }
    .loading-center { display: flex; justify-content: center; padding: 32px; }
    .no-data { text-align: center; padding: 32px; color: rgba(0,0,0,0.4); }
    .chip-active   { background: #dcfce7 !important; color: #15803d !important; }
    .chip-inactive { background: #fee2e2 !important; color: #b91c1c !important; }
  `]
})
export class CompanyFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  router = inject(Router);

  isEdit = signal(false);
  saving = signal(false);
  contacts = signal<CompanyContact[]>([]);
  loadingContacts = signal(false);
  contactCols = ['name', 'email', 'phone', 'position', 'status', 'actions'];

  private companyId: number | null = null;

  form = this.fb.group({
    name: ['', Validators.required],
    cnpj: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['']
  });

  ngOnInit() {
    const rawId = this.route.snapshot.paramMap.get('id');
    this.companyId = rawId ? +rawId : null;
    if (this.companyId) {
      this.isEdit.set(true);
      this.companyService.getById(this.companyId).subscribe(c => {
        this.form.patchValue({ name: c.name, cnpj: c.cnpj, email: c.email, phone: c.phone ?? '' });
      });
      this.loadContacts();
    }
  }

  loadContacts() {
    if (!this.companyId) return;
    this.loadingContacts.set(true);
    this.companyService.getContacts(this.companyId).subscribe({
      next: data => { this.contacts.set(data); this.loadingContacts.set(false); },
      error: () => this.loadingContacts.set(false)
    });
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const { name, cnpj, email, phone } = this.form.getRawValue();

    if (this.isEdit() && this.companyId) {
      this.companyService.update(this.companyId, {
        name: name!, cnpj: cnpj!, email: email!, phone: phone || null, isActive: true
      }).subscribe({
        next: () => {
          this.snack.open('Empresa atualizada.', 'OK', { duration: 3000, panelClass: 'snack-success' });
          this.router.navigate(['/companies']);
        },
        error: () => { this.saving.set(false); this.snack.open('Erro ao atualizar.', 'OK', { duration: 3000, panelClass: 'snack-error' }); }
      });
    } else {
      this.companyService.create({ name: name!, cnpj: cnpj!, email: email!, phone: phone || null }).subscribe({
        next: () => {
          this.snack.open('Empresa criada.', 'OK', { duration: 3000, panelClass: 'snack-success' });
          this.router.navigate(['/companies']);
        },
        error: () => { this.saving.set(false); this.snack.open('Erro ao criar empresa.', 'OK', { duration: 3000, panelClass: 'snack-error' }); }
      });
    }
  }

  openContactDialog(contact?: CompanyContact) {
    if (!this.companyId) return;
    const ref = this.dialog.open(ContactDialogComponent, {
      width: '520px',
      data: contact ?? null
    });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      if (contact) {
        this.companyService.updateContact(this.companyId!, contact.id, result).subscribe({
          next: () => { this.snack.open('Contato atualizado.', 'OK', { duration: 3000 }); this.loadContacts(); },
          error: () => this.snack.open('Erro ao atualizar contato.', 'OK', { duration: 3000 })
        });
      } else {
        this.companyService.addContact(this.companyId!, result).subscribe({
          next: () => { this.snack.open('Contato adicionado.', 'OK', { duration: 3000 }); this.loadContacts(); },
          error: () => this.snack.open('Erro ao adicionar contato.', 'OK', { duration: 3000 })
        });
      }
    });
  }

  inactivateContact(contact: CompanyContact) {
    if (!confirm(`Inativar contato ${contact.name}?`)) return;
    this.companyService.inactivateContact(this.companyId!, contact.id).subscribe({
      next: () => { this.snack.open('Contato inativado.', 'OK', { duration: 3000 }); this.loadContacts(); },
      error: () => this.snack.open('Erro ao inativar contato.', 'OK', { duration: 3000 })
    });
  }
}
