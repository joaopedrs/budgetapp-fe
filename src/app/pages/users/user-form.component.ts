import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoModule } from '@jsverse/transloco';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule,
    MatSnackBarModule, TranslocoModule
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <h2 class="page-title">{{ isEdit() ? 'Editar Usuário' : 'Novo Usuário' }}</h2>
      </div>

      <mat-card class="form-card">
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
                <mat-label>Senha {{ isEdit() ? '(deixe em branco para manter)' : '' }}</mat-label>
                <input matInput type="password" formControlName="password" />
                @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
                  <mat-error>Mínimo 6 caracteres</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Perfil</mat-label>
                <mat-select formControlName="role">
                  <mat-option value="User">Usuário</mat-option>
                  <mat-option value="Admin">Administrador</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button mat-stroked-button type="button" (click)="router.navigate(['/users'])">
                Cancelar
              </button>
              <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
                @if (saving()) { <mat-spinner diameter="18" /> }
                @else { Salvar }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0; color: #1e1145; }
    .form-card { max-width: 720px; }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
    }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
    mat-form-field { width: 100%; }
  `]
})
export class UserFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  router = inject(Router);

  isEdit = signal(false);
  saving = signal(false);
  private userId: string | null = null;

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(6)]],
    role: ['User', Validators.required]
  });

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId) {
      this.isEdit.set(true);
      this.form.get('email')?.disable();
      this.userService.getById(this.userId).subscribe(u => {
        this.form.patchValue({ name: u.name, email: u.email, role: u.role });
      });
    } else {
      this.form.get('password')?.addValidators(Validators.required);
      this.form.get('password')?.updateValueAndValidity();
    }
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const { name, email, password, role } = this.form.getRawValue();

    if (this.isEdit() && this.userId) {
      this.userService.update(this.userId, { name: name!, password: password || null, role: role! }).subscribe({
        next: () => {
          this.snack.open('Usuário atualizado.', 'OK', { duration: 3000, panelClass: 'snack-success' });
          this.router.navigate(['/users']);
        },
        error: () => { this.saving.set(false); this.snack.open('Erro ao atualizar.', 'OK', { duration: 3000, panelClass: 'snack-error' }); }
      });
    } else {
      this.userService.create({ name: name!, email: email!, password: password!, role: role! }).subscribe({
        next: () => {
          this.snack.open('Usuário criado.', 'OK', { duration: 3000, panelClass: 'snack-success' });
          this.router.navigate(['/users']);
        },
        error: () => { this.saving.set(false); this.snack.open('Erro ao criar usuário.', 'OK', { duration: 3000, panelClass: 'snack-error' }); }
      });
    }
  }
}
