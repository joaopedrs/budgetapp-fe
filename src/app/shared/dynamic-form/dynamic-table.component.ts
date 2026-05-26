import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormField } from '../../core/models/process-form.model';
import { buildTableRowGroup } from './dynamic-field.component';

/**
 * Renderiza um campo do tipo Table. Cada linha é um `FormGroup` dentro do
 * `FormArray` recebido. Para os tipos de coluna, usa renderização inline simples
 * (text/number/date/dropdown) para evitar acoplamento recursivo pesado.
 *
 * **Restrições da estrutura** (validadas pelo BE):
 * - Colunas não podem ser do tipo Table (sem nesting).
 * - Colunas não suportam Company/Contact por enquanto (TODO em PR posterior).
 *
 * Respeita `validation.minRows` / `validation.maxRows` para guardar adição/remoção.
 */
@Component({
  selector: 'app-dynamic-table',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule
  ],
  template: `
    <div class="table-block">
      <div class="table-header">
        <h4>{{ field.label }}{{ field.required ? ' *' : '' }}</h4>
        @if (!field.locked) {
          <button mat-stroked-button color="primary" type="button" (click)="addRow()"
                  [disabled]="!canAdd()">
            <mat-icon>add</mat-icon> Adicionar linha
          </button>
        }
      </div>

      @if (field.helpText) { <p class="hint">{{ field.helpText }}</p> }

      @if (formArray.length === 0) {
        <div class="no-rows">Nenhuma linha adicionada.</div>
      } @else {
        <table mat-table [dataSource]="rowsSnapshot()" class="data-table">
          @for (col of columns; track col.id) {
            <ng-container [matColumnDef]="col.id">
              <th mat-header-cell *matHeaderCellDef>{{ col.label }}{{ col.required ? ' *' : '' }}</th>
              <td mat-cell *matCellDef="let row; let i = index">
                @switch (col.type) {
                  @case ('Number') {
                    <mat-form-field appearance="outline" class="cell-field">
                      <input matInput type="number" [formControl]="cellControl(i, col.id)"
                             [readonly]="!!col.locked || !!field.locked" />
                    </mat-form-field>
                  }
                  @case ('Date') {
                    <mat-form-field appearance="outline" class="cell-field">
                      <input matInput [matDatepicker]="dp" [formControl]="cellControl(i, col.id)"
                             [readonly]="!!col.locked || !!field.locked" />
                      <mat-datepicker-toggle matIconSuffix [for]="dp" />
                      <mat-datepicker #dp />
                    </mat-form-field>
                  }
                  @case ('Dropdown') {
                    <mat-form-field appearance="outline" class="cell-field">
                      <mat-select [formControl]="cellControl(i, col.id)"
                                  [disabled]="!!col.locked || !!field.locked">
                        @for (opt of col.options || []; track opt.value) {
                          <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  }
                  @default {
                    <mat-form-field appearance="outline" class="cell-field">
                      <input matInput [formControl]="cellControl(i, col.id)"
                             [readonly]="!!col.locked || !!field.locked" />
                    </mat-form-field>
                  }
                }
              </td>
            </ng-container>
          }

          <ng-container matColumnDef="__actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row; let i = index">
              @if (!field.locked) {
                <button mat-icon-button color="warn" type="button"
                        [disabled]="!canRemove()" (click)="removeRow(i)" title="Remover linha">
                  <mat-icon>delete</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      }
    </div>
  `,
  styles: [`
    .table-block { margin: 12px 0; padding: 16px; border: 1px solid rgba(0,0,0,.1); border-radius: 12px; background: #faf9ff; }
    .table-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
    .table-header h4 { margin: 0; font-size: 15px; font-weight: 600; color: #1e1145; }
    .hint { margin: 0 0 12px; color: rgba(0,0,0,.55); font-size: 13px; }
    .no-rows { text-align: center; padding: 24px; color: rgba(0,0,0,.4); }
    .data-table { width: 100%; background: transparent; }
    .cell-field { width: 100%; }
    .cell-field .mat-mdc-form-field-subscript-wrapper { display: none; }
  `]
})
export class DynamicTableComponent implements OnInit {
  @Input({ required: true }) field!: FormField;
  @Input({ required: true }) formArray!: FormArray;

  private fb = new FormBuilder();

  get columns(): FormField[] { return this.field.columns || []; }
  get displayedColumns(): string[] { return [...this.columns.map(c => c.id), '__actions']; }

  ngOnInit() {
    // Garante minRows iniciais SE o FormArray ainda estiver vazio. Quando uma
    // instância salva é carregada, o DynamicForm já populou o array com as
    // linhas persistidas — não adicionamos linhas extras aqui.
    const min = this.field.validation?.minRows ?? 0;
    while (this.formArray.length < min) this.addRow();
  }

  cellControl(rowIndex: number, colId: string) {
    return (this.formArray.at(rowIndex) as FormGroup).get(colId) as import('@angular/forms').FormControl;
  }

  /** Material table precisa de uma referência estável; renderiza pelo length do array. */
  rowsSnapshot(): unknown[] {
    return Array.from({ length: this.formArray.length });
  }

  addRow() {
    // Delega para o helper compartilhado — garante que coluna/tabela locked
    // criem controles já disabled (mat-select ignora [disabled] em reactive forms).
    this.formArray.push(buildTableRowGroup(this.fb, this.field));
  }

  removeRow(index: number) {
    this.formArray.removeAt(index);
  }

  canAdd(): boolean {
    const max = this.field.validation?.maxRows;
    return max == null || this.formArray.length < max;
  }

  canRemove(): boolean {
    const min = this.field.validation?.minRows ?? 0;
    return this.formArray.length > min;
  }
}
