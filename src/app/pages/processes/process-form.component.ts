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
import { TranslocoModule } from '@jsverse/transloco';
import { DatePipe } from '@angular/common';
import { ProcessService } from '../../core/services/process.service';
import { ProcessRevision } from '../../core/models/process.model';
import { NewRevisionDialogComponent } from './new-revision-dialog.component';

@Component({
  selector: 'app-process-form',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule,
    MatSnackBarModule, MatTableModule, MatTabsModule, MatDialogModule,
    TranslocoModule, DatePipe
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ isEdit() ? 'Editar Processo' : 'Novo Processo' }}</h2>
          @if (isEdit()) {
            <p class="page-subtitle">Versão atual: <strong>v{{ currentVersion() }}</strong></p>
          }
        </div>
        <button mat-stroked-button (click)="router.navigate(['/processes'])">
          <mat-icon>arrow_back</mat-icon> Voltar
        </button>
      </div>

      <mat-tab-group>
        <!-- TAB 1: Data -->
        <mat-tab label="Dados">
          <mat-card class="form-card tab-content">
            <mat-card-content>
              <form [formGroup]="form" (ngSubmit)="onSubmit()">
                <div class="form-grid">
                  <mat-form-field appearance="outline" class="full-col">
                    <mat-label>Nome do Processo</mat-label>
                    <input matInput formControlName="name" />
                    @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
                      <mat-error>Nome é obrigatório</mat-error>
                    }
                  </mat-form-field>
                </div>

                <div class="form-actions">
                  <button mat-stroked-button type="button" (click)="router.navigate(['/processes'])">
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

        <!-- TAB 2: Revisions (only in edit mode) -->
        @if (isEdit()) {
          <mat-tab label="Histórico de Revisões">
            <mat-card class="tab-content">
              <mat-card-content>
                <div class="revisions-header">
                  <span class="revisions-count">{{ revisions().length }} revisão(ões)</span>
                  <button mat-flat-button color="accent" (click)="openNewRevision()">
                    <mat-icon>add</mat-icon> Nova Revisão
                  </button>
                </div>

                @if (loadingRevisions()) {
                  <div class="loading-center"><mat-spinner diameter="32" /></div>
                } @else {
                  <table mat-table [dataSource]="revisions()" class="full-width">
                    <ng-container matColumnDef="version">
                      <th mat-header-cell *matHeaderCellDef>Versão</th>
                      <td mat-cell *matCellDef="let r">v{{ r.version }}</td>
                    </ng-container>
                    <ng-container matColumnDef="note">
                      <th mat-header-cell *matHeaderCellDef>Nota</th>
                      <td mat-cell *matCellDef="let r">{{ r.note || '—' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="createdAt">
                      <th mat-header-cell *matHeaderCellDef>Data</th>
                      <td mat-cell *matCellDef="let r">{{ r.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="revCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: revCols;"></tr>
                  </table>
                  @if (revisions().length === 0) {
                    <div class="no-data">Nenhuma revisão registrada.</div>
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
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: #1e1145; }
    .page-subtitle { color: rgba(0,0,0,0.55); margin: 0; }
    .tab-content { margin-top: 16px; max-width: 720px; }
    .form-grid { display: grid; gap: 8px 16px; }
    .full-col { grid-column: 1 / -1; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
    mat-form-field { width: 100%; }
    .revisions-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .revisions-count { color: rgba(0,0,0,0.55); font-size: 14px; }
    .full-width { width: 100%; }
    .loading-center { display: flex; justify-content: center; padding: 32px; }
    .no-data { text-align: center; padding: 32px; color: rgba(0,0,0,0.4); }
  `]
})
export class ProcessFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private processService = inject(ProcessService);
  private route = inject(ActivatedRoute);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  router = inject(Router);

  isEdit = signal(false);
  saving = signal(false);
  currentVersion = signal(1);
  revisions = signal<ProcessRevision[]>([]);
  loadingRevisions = signal(false);
  revCols = ['version', 'note', 'createdAt'];

  private processId: number | null = null;

  form = this.fb.group({
    name: ['', Validators.required]
  });

  ngOnInit() {
    const rawId = this.route.snapshot.paramMap.get('id');
    this.processId = rawId ? +rawId : null;
    if (this.processId) {
      this.isEdit.set(true);
      this.processService.getById(this.processId).subscribe(p => {
        this.form.patchValue({ name: p.name });
        this.currentVersion.set(p.currentVersion);
      });
      this.loadRevisions();
    }
  }

  loadRevisions() {
    if (!this.processId) return;
    this.loadingRevisions.set(true);
    this.processService.getRevisions(this.processId).subscribe({
      next: data => { this.revisions.set(data); this.loadingRevisions.set(false); },
      error: () => this.loadingRevisions.set(false)
    });
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const { name } = this.form.getRawValue();

    if (this.isEdit() && this.processId) {
      this.processService.update(this.processId, { name: name!, isActive: true }).subscribe({
        next: () => {
          this.snack.open('Processo atualizado.', 'OK', { duration: 3000, panelClass: 'snack-success' });
          this.router.navigate(['/processes']);
        },
        error: () => { this.saving.set(false); this.snack.open('Erro ao atualizar.', 'OK', { duration: 3000, panelClass: 'snack-error' }); }
      });
    } else {
      this.processService.create({ name: name! }).subscribe({
        next: () => {
          this.snack.open('Processo criado.', 'OK', { duration: 3000, panelClass: 'snack-success' });
          this.router.navigate(['/processes']);
        },
        error: () => { this.saving.set(false); this.snack.open('Erro ao criar processo.', 'OK', { duration: 3000, panelClass: 'snack-error' }); }
      });
    }
  }

  openNewRevision() {
    if (!this.processId) return;
    const ref = this.dialog.open(NewRevisionDialogComponent, { width: '480px' });
    ref.afterClosed().subscribe(note => {
      if (note === undefined) return; // cancelled
      this.processService.createRevision(this.processId!, { note: note || null }).subscribe({
        next: () => {
          this.snack.open('Revisão criada.', 'OK', { duration: 3000, panelClass: 'snack-success' });
          this.loadRevisions();
          // refresh version
          this.processService.getById(this.processId!).subscribe(p => this.currentVersion.set(p.currentVersion));
        },
        error: () => this.snack.open('Erro ao criar revisão.', 'OK', { duration: 3000, panelClass: 'snack-error' })
      });
    });
  }
}
