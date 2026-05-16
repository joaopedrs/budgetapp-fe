import { Component, inject, OnInit, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ProcessService } from '../../core/services/process.service';
import { Process } from '../../core/models/process.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-processes',
  standalone: true,
  imports: [
    MatTableModule, MatButtonModule, MatIconModule, MatCardModule,
    MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule,
    RouterLink, TranslocoModule, DatePipe
  ],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Processos</h2>
          <p class="page-subtitle">Gerenciamento de processos e revisões</p>
        </div>
        <a mat-flat-button color="primary" routerLink="/processes/new">
          <mat-icon>add</mat-icon> Novo Processo
        </a>
      </div>

      <mat-card>
        @if (loading()) {
          <div class="loading-center"><mat-spinner diameter="40" /></div>
        } @else {
          <table mat-table [dataSource]="processes()" class="full-width">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nome</th>
              <td mat-cell *matCellDef="let p">{{ p.name }}</td>
            </ng-container>
            <ng-container matColumnDef="version">
              <th mat-header-cell *matHeaderCellDef>Versão Atual</th>
              <td mat-cell *matCellDef="let p">v{{ p.currentVersion }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let p">
                <mat-chip [class]="p.isActive ? 'chip-active' : 'chip-inactive'">
                  {{ p.isActive ? 'Ativo' : 'Inativo' }}
                </mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Criado em</th>
              <td mat-cell *matCellDef="let p">{{ p.createdAt | date:'dd/MM/yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Ações</th>
              <td mat-cell *matCellDef="let p">
                <a mat-icon-button [routerLink]="['/processes', p.id]" title="Editar">
                  <mat-icon>edit</mat-icon>
                </a>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>

          @if (processes().length === 0) {
            <div class="no-data">Nenhum processo encontrado.</div>
          }
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; margin: 0 0 4px; color: #1e1145; }
    .page-subtitle { color: rgba(0,0,0,0.55); margin: 0; }
    .full-width { width: 100%; }
    .loading-center { display: flex; justify-content: center; padding: 40px; }
    .no-data { text-align: center; padding: 40px; color: rgba(0,0,0,0.4); }
    .chip-active   { background: #dcfce7 !important; color: #15803d !important; }
    .chip-inactive { background: #fee2e2 !important; color: #b91c1c !important; }
  `]
})
export class ProcessesComponent implements OnInit {
  private processService = inject(ProcessService);
  private snack = inject(MatSnackBar);

  columns = ['name', 'version', 'status', 'createdAt', 'actions'];
  processes = signal<Process[]>([]);
  loading = signal(true);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.processService.getAll().subscribe({
      next: data => { this.processes.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }
}
