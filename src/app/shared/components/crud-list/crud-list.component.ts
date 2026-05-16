import {
  Component, Input, Output, EventEmitter, OnChanges,
  SimpleChanges, signal, computed, TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule } from '@jsverse/transloco';
import { FormsModule } from '@angular/forms';

export interface CrudColumn {
  key: string;
  label: string;
  template?: TemplateRef<any>;
}

@Component({
  selector: 'app-crud-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatCheckboxModule,
    MatProgressSpinnerModule, MatTooltipModule, TranslocoModule
  ],
  template: `
    <div class="crud-list" *transloco="let t">

      <!-- Toolbar -->
      <div class="list-toolbar">
        <span class="total-label">
          @if (!loading()) {
            {{ t('common.total', { count: items.length }) }}
          }
        </span>
        <div class="toolbar-actions">
          @if (selectedIds().size > 0) {
            <span class="selected-label">{{ t('common.selected', { count: selectedIds().size }) }}</span>
            <button mat-stroked-button color="warn"
                    (click)="inactivateSelected.emit([...selectedIds()])"
                    [matTooltip]="t('common.inactivate')">
              <mat-icon>block</mat-icon> {{ t('common.inactivate') }}
            </button>
          }
          <button mat-flat-button color="primary" (click)="add.emit()">
            <mat-icon>add</mat-icon> {{ t('common.add') }}
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        @if (loading()) {
          <div class="loading-row">
            <mat-spinner diameter="32" />
          </div>
        } @else if (items.length === 0) {
          <div class="empty-row">{{ t('common.noData') }}</div>
        } @else {
          <table class="crud-table">
            <thead>
              <tr>
                <th class="check-col">
                  <mat-checkbox
                    [checked]="allSelected()"
                    [indeterminate]="someSelected()"
                    (change)="toggleAll($event.checked)" />
                </th>
                @for (col of columns; track col.key) {
                  <th>{{ col.label }}</th>
                }
                <th class="actions-col">{{ t('users.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              @for (item of visibleItems(); track item['id']) {
                <tr [class.selected-row]="selectedIds().has(item['id'])"
                    (click)="edit.emit(item)">
                  <td class="check-col" (click)="$event.stopPropagation()">
                    <mat-checkbox
                      [checked]="selectedIds().has(item['id'])"
                      (change)="toggleItem(item['id'])" />
                  </td>
                  @for (col of columns; track col.key) {
                    <td>
                      @if (col.template) {
                        <ng-container [ngTemplateOutlet]="col.template"
                                      [ngTemplateOutletContext]="{ $implicit: item }" />
                      } @else {
                        {{ item[col.key] ?? '—' }}
                      }
                    </td>
                  }
                  <td class="actions-col" (click)="$event.stopPropagation()">
                    <button mat-icon-button color="primary" (click)="edit.emit(item)"
                            [matTooltip]="t('common.edit')">
                      <mat-icon>edit</mat-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <!-- Load more -->
          @if (hasMore()) {
            <div class="load-more">
              <button mat-stroked-button (click)="loadMore()">
                {{ t('common.loading') }}
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .crud-list { display: flex; flex-direction: column; gap: 12px; }

    .list-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; flex-wrap: wrap;
    }
    .total-label { font-size: 13px; color: rgba(0,0,0,0.5); }
    .toolbar-actions { display: flex; align-items: center; gap: 8px; }
    .selected-label { font-size: 13px; font-weight: 600; color: var(--color-primary, #7c3aed); }

    .table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1); }

    .crud-table {
      width: 100%; border-collapse: collapse; font-size: 14px;
      thead tr { background: rgba(0,0,0,0.03); }
      th { padding: 12px 16px; text-align: left; font-weight: 600;
           font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
           color: rgba(0,0,0,0.5); border-bottom: 1px solid rgba(0,0,0,0.08); }
      td { padding: 12px 16px; border-bottom: 1px solid rgba(0,0,0,0.05); vertical-align: middle; }
      tbody tr { cursor: pointer; transition: background 0.15s;
                 &:hover { background: rgba(124,58,237,0.04); }
                 &:last-child td { border-bottom: none; } }
      .selected-row { background: rgba(124,58,237,0.06) !important; }
    }

    .check-col { width: 48px; }
    .actions-col { width: 80px; text-align: right; }

    .loading-row, .empty-row {
      display: flex; align-items: center; justify-content: center;
      padding: 48px 16px; color: rgba(0,0,0,0.4); font-size: 14px;
    }

    .load-more { display: flex; justify-content: center; padding: 16px; }
  `]
})
export class CrudListComponent implements OnChanges {
  @Input() items: any[] = [];
  @Input() columns: CrudColumn[] = [];
  @Input() loading = false;
  @Input() pageSize = 25;

  @Output() add = new EventEmitter<void>();
  @Output() edit = new EventEmitter<any>();
  @Output() inactivateSelected = new EventEmitter<any[]>();

  private _page = signal(1);
  selectedIds = signal<Set<any>>(new Set());

  visibleItems = computed(() => this.items.slice(0, this._page() * this.pageSize));
  hasMore = computed(() => this.visibleItems().length < this.items.length);
  allSelected = computed(() =>
    this.items.length > 0 && this.items.every(i => this.selectedIds().has(i['id'])));
  someSelected = computed(() =>
    !this.allSelected() && this.items.some(i => this.selectedIds().has(i['id'])));

  ngOnChanges(changes: SimpleChanges) {
    if (changes['items']) {
      this._page.set(1);
      this.selectedIds.set(new Set());
    }
  }

  loadMore() { this._page.update(p => p + 1); }

  toggleAll(checked: boolean) {
    this.selectedIds.set(checked ? new Set(this.items.map(i => i['id'])) : new Set());
  }

  toggleItem(id: any) {
    const s = new Set(this.selectedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedIds.set(s);
  }
}
