import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-new-revision-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Nova Revisão</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Nota (opcional)</mat-label>
          <textarea matInput formControlName="note" rows="3"
            placeholder="Descreva as alterações desta revisão..."></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="confirm()">Criar Revisão</button>
    </mat-dialog-actions>
  `
})
export class NewRevisionDialogComponent {
  dialogRef = inject(MatDialogRef<NewRevisionDialogComponent>);
  private fb = inject(FormBuilder);

  form = this.fb.group({ note: [''] });

  confirm() {
    this.dialogRef.close(this.form.value.note ?? '');
  }
}
