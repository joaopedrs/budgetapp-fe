import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-crud-detail',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, TranslocoModule],
  template: `
    <div class="crud-detail" *transloco="let t">
      <!-- Header bar -->
      <div class="detail-header">
        <button mat-icon-button (click)="back.emit()" [matTooltip]="t('common.back')">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2 class="detail-title">{{ title }}</h2>
        <span class="spacer"></span>
        <button mat-stroked-button (click)="cancel.emit()" [disabled]="saving">
          <mat-icon>close</mat-icon> {{ t('common.cancel') }}
        </button>
        <button mat-flat-button color="primary" (click)="save.emit()" [disabled]="saving || saveDisabled">
          @if (saving) {
            <mat-spinner diameter="18" />
          } @else {
            <mat-icon>save</mat-icon>
          }
          {{ t('common.save') }}
        </button>
      </div>

      <!-- Content projection -->
      <div class="detail-body">
        <ng-content />
      </div>
    </div>
  `,
  styles: [`
    .crud-detail { display: flex; flex-direction: column; gap: 0; }
    .detail-header {
      display: flex; align-items: center; gap: 8px;
      padding: 0 0 20px; flex-wrap: wrap;
    }
    .detail-title { margin: 0; font-size: 20px; font-weight: 700; color: var(--color-primary, #1e1145); }
    .spacer { flex: 1; }
    .detail-body { }
  `]
})
export class CrudDetailComponent {
  @Input() title = '';
  @Input() saving = false;
  @Input() saveDisabled = false;

  @Output() save = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();
}
