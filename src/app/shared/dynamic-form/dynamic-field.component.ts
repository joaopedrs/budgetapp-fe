import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Subject, distinctUntilChanged, takeUntil } from 'rxjs';
import { FormField } from '../../core/models/process-form.model';
import { CompanyService } from '../../core/services/company.service';
import { Company, CompanyContact } from '../../core/models/company.model';
import { DynamicTableComponent } from './dynamic-table.component';

/**
 * Renderiza UM campo do formulário dinâmico. Recebe o `field` (definição) e o
 * `control` (AbstractControl correspondente). O componente pai (`DynamicFormComponent`)
 * é responsável por construir o `FormGroup` e passar o controle certo.
 *
 * **Por que um único componente com switch e não um por tipo?**
 * Manutenção. 11 das 12 variações são variações triviais de inputs com `mat-form-field`.
 * Só `Table` é estruturalmente diferente — esse sim delegado para um componente próprio.
 * Company/Contact têm comportamento dependente, mas estruturalmente são dropdowns.
 */
@Component({
  selector: 'app-dynamic-field',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatRadioModule,
    MatCheckboxModule, MatDatepickerModule, MatNativeDateModule,
    MatProgressSpinnerModule, MatIconModule,
    DynamicTableComponent
  ],
  template: `
    @if (!field.invisible) {
      <div class="field" [class.locked]="field.locked">
        @switch (field.type) {
          @case ('Text') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}{{ field.required ? ' *' : '' }}</mat-label>
              <input matInput [formControl]="asFormControl(control)"
                     [placeholder]="field.placeholder || ''"
                     [readonly]="field.locked"
                     [maxlength]="field.validation?.maxLength || null" />
              @if (field.helpText) { <mat-hint>{{ field.helpText }}</mat-hint> }
              @if (showRequiredError()) { <mat-error>Campo obrigatório</mat-error> }
              @if (control.hasError('minlength')) {
                <mat-error>Mínimo {{ field.validation?.minLength }} caracteres</mat-error>
              }
              @if (control.hasError('pattern')) {
                <mat-error>Formato inválido</mat-error>
              }
            </mat-form-field>
          }

          @case ('Textarea') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}{{ field.required ? ' *' : '' }}</mat-label>
              <textarea matInput rows="4" [formControl]="asFormControl(control)"
                        [readonly]="field.locked"
                        [placeholder]="field.placeholder || ''"></textarea>
              @if (field.helpText) { <mat-hint>{{ field.helpText }}</mat-hint> }
              @if (showRequiredError()) { <mat-error>Campo obrigatório</mat-error> }
            </mat-form-field>
          }

          @case ('Number') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}{{ field.required ? ' *' : '' }}</mat-label>
              <input matInput type="number" [formControl]="asFormControl(control)"
                     [readonly]="field.locked"
                     [min]="field.validation?.min ?? null"
                     [max]="field.validation?.max ?? null" />
              @if (field.helpText) { <mat-hint>{{ field.helpText }}</mat-hint> }
              @if (showRequiredError()) { <mat-error>Campo obrigatório</mat-error> }
              @if (control.hasError('min')) { <mat-error>Mínimo {{ field.validation?.min }}</mat-error> }
              @if (control.hasError('max')) { <mat-error>Máximo {{ field.validation?.max }}</mat-error> }
            </mat-form-field>
          }

          @case ('Date') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}{{ field.required ? ' *' : '' }}</mat-label>
              <input matInput [matDatepicker]="dp" [formControl]="asFormControl(control)"
                     [readonly]="field.locked" />
              <mat-datepicker-toggle matIconSuffix [for]="dp" />
              <mat-datepicker #dp />
              @if (showRequiredError()) { <mat-error>Campo obrigatório</mat-error> }
            </mat-form-field>
          }

          @case ('Datetime') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}{{ field.required ? ' *' : '' }}</mat-label>
              <input matInput type="datetime-local" [formControl]="asFormControl(control)"
                     [readonly]="field.locked" />
              @if (showRequiredError()) { <mat-error>Campo obrigatório</mat-error> }
            </mat-form-field>
          }

          @case ('Time') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}{{ field.required ? ' *' : '' }}</mat-label>
              <input matInput type="time" [formControl]="asFormControl(control)"
                     [readonly]="field.locked" />
              @if (showRequiredError()) { <mat-error>Campo obrigatório</mat-error> }
            </mat-form-field>
          }

          @case ('Dropdown') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}{{ field.required ? ' *' : '' }}</mat-label>
              <mat-select [formControl]="asFormControl(control)" [disabled]="!!field.locked">
                @for (opt of field.options || []; track opt.value) {
                  <mat-option [value]="opt.value">{{ opt.label }}</mat-option>
                }
              </mat-select>
              @if (showRequiredError()) { <mat-error>Campo obrigatório</mat-error> }
            </mat-form-field>
          }

          @case ('Radio') {
            <label class="group-label">{{ field.label }}{{ field.required ? ' *' : '' }}</label>
            <mat-radio-group [formControl]="asFormControl(control)" class="radio-group">
              @for (opt of field.options || []; track opt.value) {
                <mat-radio-button [value]="opt.value" [disabled]="!!field.locked">
                  {{ opt.label }}
                </mat-radio-button>
              }
            </mat-radio-group>
          }

          @case ('CheckboxMulti') {
            <label class="group-label">{{ field.label }}{{ field.required ? ' *' : '' }}</label>
            <div class="checkbox-group">
              @for (opt of field.options || []; track opt.value) {
                <mat-checkbox
                  [checked]="isChecked(opt.value)"
                  [disabled]="!!field.locked"
                  (change)="toggleMulti(opt.value, $event.checked)">
                  {{ opt.label }}
                </mat-checkbox>
              }
            </div>
          }

          @case ('Company') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}{{ field.required ? ' *' : '' }}</mat-label>
              <mat-select [formControl]="asFormControl(control)" [disabled]="!!field.locked || loadingCompanies">
                @if (loadingCompanies) {
                  <mat-option disabled><mat-spinner diameter="16" /> Carregando empresas...</mat-option>
                }
                @for (c of companies; track c.id) {
                  <mat-option [value]="c.id">{{ c.name }}</mat-option>
                }
              </mat-select>
              @if (showRequiredError()) { <mat-error>Campo obrigatório</mat-error> }
            </mat-form-field>
          }

          @case ('Contact') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ field.label }}{{ field.required ? ' *' : '' }}</mat-label>
              <mat-select [formControl]="asFormControl(control)"
                          [disabled]="!!field.locked || loadingContacts || !contactsAvailable()">
                @if (!contactsAvailable() && !loadingContacts) {
                  <mat-option disabled>
                    <mat-icon>info</mat-icon> Selecione a empresa primeiro
                  </mat-option>
                }
                @if (loadingContacts) {
                  <mat-option disabled><mat-spinner diameter="16" /> Carregando contatos...</mat-option>
                }
                @for (ct of contacts; track ct.id) {
                  <mat-option [value]="ct.id">{{ ct.name }} — {{ ct.email }}</mat-option>
                }
              </mat-select>
              @if (showRequiredError()) { <mat-error>Campo obrigatório</mat-error> }
            </mat-form-field>
          }

          @case ('Table') {
            <app-dynamic-table [field]="field" [formArray]="asFormArray(control)" />
          }

          @default {
            <div class="unsupported">Tipo de campo não suportado: {{ field.type }}</div>
          }
        }
      </div>
    }
  `,
  styles: [`
    .field { margin-bottom: 8px; }
    .field.locked { opacity: 0.85; }
    .full-width { width: 100%; }
    .group-label { display:block; font-weight:500; margin:8px 0 4px; color:rgba(0,0,0,.75); font-size:14px; }
    .radio-group { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
    .checkbox-group { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
    .unsupported { padding:12px; background:#fee2e2; color:#b91c1c; border-radius:8px; }
  `]
})
export class DynamicFieldComponent implements OnInit, OnDestroy {
  @Input({ required: true }) field!: FormField;
  @Input({ required: true }) control!: AbstractControl;
  /**
   * Form group raiz — usado pelo Contact para observar o campo Company referenciado
   * em `dependsOn` e recarregar a lista de contatos quando a empresa muda.
   */
  @Input({ required: true }) rootGroup!: FormGroup;

  private companyService = inject(CompanyService);
  private destroy$ = new Subject<void>();

  companies: Company[] = [];
  contacts: CompanyContact[] = [];
  loadingCompanies = false;
  loadingContacts = false;

  // ---------- type-narrowing helpers (templates can't `as`) ----------
  asFormControl(c: AbstractControl): FormControl { return c as FormControl; }
  asFormArray(c: AbstractControl): FormArray { return c as FormArray; }

  ngOnInit() {
    if (this.field.type === 'Company') {
      this.loadCompanies();
    } else if (this.field.type === 'Contact' && this.field.dependsOn) {
      // Reload contacts whenever the parent Company control changes.
      const parent = this.rootGroup.get(this.field.dependsOn);
      if (parent) {
        // Initial load if there's already a value.
        if (parent.value) this.loadContacts(parent.value);
        parent.valueChanges
          .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
          .subscribe(companyId => {
            // Reset the contact when company changes to avoid stale references.
            this.control.setValue(null, { emitEvent: false });
            this.contacts = [];
            if (companyId) this.loadContacts(companyId);
          });
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ---------- Company/Contact loading ----------
  private loadCompanies() {
    this.loadingCompanies = true;
    this.companyService.getAll().subscribe({
      next: list => { this.companies = list; this.loadingCompanies = false; },
      error: () => { this.loadingCompanies = false; }
    });
  }

  private loadContacts(companyId: number) {
    this.loadingContacts = true;
    this.companyService.getContacts(companyId).subscribe({
      next: list => { this.contacts = list.filter(c => c.isActive); this.loadingContacts = false; },
      error: () => { this.loadingContacts = false; }
    });
  }

  contactsAvailable(): boolean {
    if (!this.field.dependsOn) return false;
    const parent = this.rootGroup.get(this.field.dependsOn);
    return !!parent?.value;
  }

  // ---------- CheckboxMulti helpers ----------
  isChecked(value: string): boolean {
    const v = this.control.value;
    return Array.isArray(v) && v.includes(value);
  }

  toggleMulti(value: string, checked: boolean) {
    const current: string[] = Array.isArray(this.control.value) ? [...this.control.value] : [];
    if (checked && !current.includes(value)) current.push(value);
    else if (!checked) {
      const idx = current.indexOf(value);
      if (idx >= 0) current.splice(idx, 1);
    }
    this.control.setValue(current);
    this.control.markAsTouched();
  }

  showRequiredError(): boolean {
    return !!this.field.required && this.control.touched && this.control.hasError('required');
  }
}

/**
 * Builds validators for a field based on its declared validation rules.
 * Exposed at module level because it's reused by both `DynamicFormComponent`
 * (root fields) and `DynamicTableComponent` (per-row columns).
 */
export function buildValidators(field: FormField): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  if (field.required) validators.push(Validators.required);
  const v = field.validation;
  if (v) {
    if (v.minLength != null) validators.push(Validators.minLength(v.minLength));
    if (v.maxLength != null) validators.push(Validators.maxLength(v.maxLength));
    if (v.min != null) validators.push(Validators.min(v.min));
    if (v.max != null) validators.push(Validators.max(v.max));
    if (v.pattern) validators.push(Validators.pattern(v.pattern));
  }
  return validators;
}
