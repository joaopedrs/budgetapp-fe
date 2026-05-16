import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CompanyContact } from '../../core/models/company.model';

@Component({
  selector: 'app-contact-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar Contato' : 'Novo Contato' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:8px;padding-top:8px">
        <mat-form-field appearance="outline">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="name" />
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Nome é obrigatório</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>E-mail</mat-label>
          <input matInput type="email" formControlName="email" />
          @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
            <mat-error>E-mail é obrigatório</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Telefone</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Cargo / Função</mat-label>
          <input matInput formControlName="position" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="confirm()">Salvar</button>
    </mat-dialog-actions>
  `
})
export class ContactDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<ContactDialogComponent>);
  data: CompanyContact | null = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    position: ['']
  });

  ngOnInit() {
    if (this.data) {
      this.form.patchValue({
        name: this.data.name,
        email: this.data.email,
        phone: this.data.phone ?? '',
        position: this.data.position ?? ''
      });
    }
  }

  confirm() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { name, email, phone, position } = this.form.getRawValue();
    this.dialogRef.close({
      name: name!,
      email: email!,
      phone: phone || null,
      position: position || null
    });
  }
}
