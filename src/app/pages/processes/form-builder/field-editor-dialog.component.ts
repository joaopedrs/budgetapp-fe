import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { FIELD_TYPES, FormField, FormFieldType } from '../../../core/models/process-form.model';

/**
 * Modal de edição de UM campo do formulário.
 *
 * **Comportamento contextual:** mostra/oculta seções conforme o tipo:
 *  - Opções (value/label) → Dropdown, Radio, CheckboxMulti
 *  - Validações numéricas → Number
 *  - Validações de texto  → Text, Textarea
 *  - dependsOn            → Contact (lista de campos Company do schema)
 *  - Colunas              → Table (sub-formulário recursivo simplificado)
 *  - Fórmula              → todos exceto Table
 *
 * Validações principais são duplicadas do FormSchemaValidator do BE — fail-fast
 * na UI; BE revalida no save de qualquer jeito.
 */
@Component({
  selector: 'app-field-editor-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatButtonModule, MatIconModule, MatDividerModule, MatTabsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ data.field ? 'edit' : 'add' }}</mat-icon>
      {{ data.field ? 'Editar campo' : 'Novo campo' }}
    </h2>

    <mat-dialog-content [formGroup]="form" class="dlg-content">
      <mat-tab-group dynamicHeight>
        <mat-tab label="Básico">
          <div class="tab-pane">
            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>Tipo</mat-label>
                <mat-select formControlName="type" (selectionChange)="onTypeChange()">
                  @for (t of fieldTypes; track t.type) {
                    <mat-option [value]="t.type">
                      <mat-icon>{{ t.icon }}</mat-icon> {{ typeLabel(t.type) }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>ID (snake_case)</mat-label>
                <input matInput formControlName="id"
                       [readonly]="!!data.field"
                       placeholder="ex.: quantidade" />
                @if (form.get('id')?.hasError('pattern') && form.get('id')?.touched) {
                  <mat-error>Use letras minúsculas, números e underscore</mat-error>
                }
                @if (form.get('id')?.hasError('required') && form.get('id')?.touched) {
                  <mat-error>Obrigatório</mat-error>
                }
                @if (form.get('id')?.hasError('duplicate')) {
                  <mat-error>ID já existe no formulário</mat-error>
                }
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Rótulo (label exibido)</mat-label>
              <input matInput formControlName="label" />
              @if (form.get('label')?.hasError('required') && form.get('label')?.touched) {
                <mat-error>Obrigatório</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Placeholder</mat-label>
              <input matInput formControlName="placeholder" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Texto de ajuda</mat-label>
              <input matInput formControlName="helpText" />
            </mat-form-field>

            <div class="flags">
              <mat-checkbox formControlName="required">Obrigatório</mat-checkbox>
              <mat-checkbox formControlName="invisible">Invisível</mat-checkbox>
              <mat-checkbox formControlName="locked">Bloqueado (read-only)</mat-checkbox>
            </div>
          </div>
        </mat-tab>

        @if (hasOptions()) {
          <mat-tab label="Opções">
            <div class="tab-pane" formArrayName="options">
              @for (opt of optionsArray.controls; track $index; let i = $index) {
                <div class="row" [formGroupName]="i">
                  <mat-form-field appearance="outline">
                    <mat-label>Valor</mat-label>
                    <input matInput formControlName="value" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Rótulo</mat-label>
                    <input matInput formControlName="label" />
                  </mat-form-field>
                  <button mat-icon-button color="warn" type="button" (click)="removeOption(i)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
              <button mat-stroked-button type="button" (click)="addOption()">
                <mat-icon>add</mat-icon> Nova opção
              </button>
              @if (optionsArray.length === 0) {
                <p class="warn">Adicione pelo menos uma opção.</p>
              }
            </div>
          </mat-tab>
        }

        @if (hasNumericValidation()) {
          <mat-tab label="Validação">
            <div class="tab-pane" formGroupName="validation">
              <div class="row">
                <mat-form-field appearance="outline">
                  <mat-label>Mínimo</mat-label>
                  <input matInput type="number" formControlName="min" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Máximo</mat-label>
                  <input matInput type="number" formControlName="max" />
                </mat-form-field>
              </div>
            </div>
          </mat-tab>
        }

        @if (hasTextValidation()) {
          <mat-tab label="Validação">
            <div class="tab-pane" formGroupName="validation">
              <div class="row">
                <mat-form-field appearance="outline">
                  <mat-label>Tamanho mínimo</mat-label>
                  <input matInput type="number" formControlName="minLength" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Tamanho máximo</mat-label>
                  <input matInput type="number" formControlName="maxLength" />
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Padrão (regex)</mat-label>
                <input matInput formControlName="pattern" placeholder="ex.: ^\\d{11}$" />
              </mat-form-field>
            </div>
          </mat-tab>
        }

        @if (isContact()) {
          <mat-tab label="Dependência">
            <div class="tab-pane">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Depende do campo Empresa</mat-label>
                <mat-select formControlName="dependsOn">
                  @if (companyFields.length === 0) {
                    <mat-option disabled>Nenhum campo Company no formulário</mat-option>
                  }
                  @for (cf of companyFields; track cf.id) {
                    <mat-option [value]="cf.id">{{ cf.label }} ({{ cf.id }})</mat-option>
                  }
                </mat-select>
                @if (form.get('dependsOn')?.hasError('required') && form.get('dependsOn')?.touched) {
                  <mat-error>Selecione o campo de empresa pai</mat-error>
                }
              </mat-form-field>
            </div>
          </mat-tab>
        }

        @if (canHaveFormula()) {
          <mat-tab label="Fórmula">
            <div class="tab-pane">
              <p class="hint">
                Use <code>{{ '{' }}nome_do_campo{{ '}' }}</code> para referenciar valores.
                Funções permitidas:
                <code>If, Sum, Round, Min, Max, Abs, Floor, Ceiling, Sqrt, Pow</code>.
                Agregações de tabela:
                <code>SUM, AVG, MIN, MAX, COUNT</code> aplicadas a uma coluna.
              </p>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Expressão</mat-label>
                <textarea matInput rows="3" formControlName="formula"
                          placeholder="ex.: {quantidade} * {preco_unitario}"></textarea>
              </mat-form-field>

              @if (form.value.formula && !form.value.locked) {
                <p class="warn">
                  <mat-icon>info</mat-icon>
                  Campos com fórmula são automaticamente bloqueados.
                </p>
              }

              <div class="examples">
                <h4>Exemplos</h4>
                <ul class="examples-list">
                  @for (ex of formulaExamples; track ex.formula) {
                    <li>
                      <code (click)="insertExample(ex.formula)" title="Clique para inserir">{{ ex.formula }}</code>
                      <span class="example-desc">{{ ex.description }}</span>
                    </li>
                  }
                </ul>
                <p class="hint-small">
                  Dica: clique em uma fórmula para inseri-la no campo acima.
                  Em <code>SUM(itens.valor)</code>, <code>itens</code> é o id de
                  um campo do tipo Tabela e <code>valor</code> uma de suas colunas.
                </p>
              </div>
            </div>
          </mat-tab>
        }

        @if (isTable()) {
          <mat-tab label="Colunas">
            <div class="tab-pane" formArrayName="columns">
              @for (col of columnsArray.controls; track $index; let i = $index) {
                <div class="col-row" [formGroupName]="i">
                  <mat-form-field appearance="outline">
                    <mat-label>ID</mat-label>
                    <input matInput formControlName="id" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Rótulo</mat-label>
                    <input matInput formControlName="label" />
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Tipo</mat-label>
                    <mat-select formControlName="type">
                      @for (t of columnTypes; track t) {
                        <mat-option [value]="t">{{ t }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-checkbox formControlName="required">Obrig.</mat-checkbox>
                  <button mat-icon-button color="warn" type="button" (click)="removeColumn(i)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
              <button mat-stroked-button type="button" (click)="addColumn()">
                <mat-icon>add</mat-icon> Nova coluna
              </button>
            </div>
          </mat-tab>
        }
      </mat-tab-group>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" (click)="onSave()" [disabled]="form.invalid">
        Salvar campo
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dlg-content { min-width: 600px; max-width: 800px; }
    .tab-pane { padding: 16px 4px; display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; gap: 12px; align-items: flex-start; }
    .row mat-form-field { flex: 1; }
    .full-width { width: 100%; }
    .flags { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
    .col-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
    .col-row mat-form-field { flex: 1; margin: 0; }
    .warn { color: #b45309; display: flex; align-items: center; gap: 8px; margin: 8px 0; font-size: 13px; }
    .hint { color: rgba(0,0,0,.6); font-size: 13px; margin: 0 0 8px; }
    .hint-small { color: rgba(0,0,0,.5); font-size: 12px; margin: 8px 0 0; line-height: 1.4; }
    code { background: rgba(0,0,0,.06); padding: 1px 6px; border-radius: 4px; font-family: monospace; }
    .examples { margin-top: 12px; padding: 12px; background: #faf9ff; border-radius: 8px; border: 1px solid rgba(124,58,237,.15); }
    .examples h4 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #1e1145; text-transform: uppercase; letter-spacing: 0.5px; }
    .examples-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .examples-list li { display: flex; gap: 12px; align-items: baseline; }
    .examples-list code { cursor: pointer; transition: background .15s; flex-shrink: 0; }
    .examples-list code:hover { background: #ede9fe; }
    .example-desc { color: rgba(0,0,0,.6); font-size: 12px; }
  `]
})
export class FieldEditorDialogComponent {
  // Pattern espelho do `FormSchemaValidator.IdRegex` do backend.
  private static readonly ID_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  fieldTypes = FIELD_TYPES;
  columnTypes: FormFieldType[] = ['Text', 'Number', 'Date', 'Dropdown'];

  /**
   * Exemplos exibidos no painel de Fórmula. Espelham as capacidades suportadas
   * pelo `FormulaEngine` no backend — não adicionar exemplos com funções fora
   * da whitelist, pois o save vai falhar com "Função não permitida".
   */
  readonly formulaExamples: { formula: string; description: string }[] = [
    { formula: '{quantidade} * {preco_unitario}',          description: 'Multiplicação simples entre dois campos' },
    { formula: 'Round({valor} * 0.1, 2)',                  description: 'Calcula 10% e arredonda com 2 casas decimais' },
    { formula: 'If({tipo} = "A", {valor1}, {valor2})',     description: 'Condicional: se tipo=A usa valor1, senão valor2' },
    { formula: 'SUM(itens.valor)',                         description: 'Soma de todas as linhas da coluna "valor" da tabela "itens"' },
    { formula: 'SUM(itens.qtde) * {preco_unitario}',       description: 'Combina agregação de tabela com campo simples' },
    { formula: 'AVG(itens.valor)',                         description: 'Média de uma coluna de tabela' },
    { formula: 'COUNT(itens.descricao)',                   description: 'Conta linhas preenchidas em uma coluna' },
    { formula: 'Max({minimo}, Min({maximo}, {valor}))',    description: 'Aplica limites (clamp) a um valor' }
  ];

  /**
   * Insere a fórmula clicada no campo de expressão.
   * Se já houver conteúdo, concatena no final separado por espaço — facilita
   * compor expressões complexas a partir dos exemplos.
   */
  insertExample(snippet: string) {
    const ctrl = this.form.get('formula')!;
    const current = (ctrl.value as string | null) ?? '';
    const next = current.trim() ? `${current.trim()} ${snippet}` : snippet;
    ctrl.setValue(next);
    ctrl.markAsDirty();
  }

  form: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<FieldEditorDialogComponent>,
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: {
      field: FormField | null;
      existingIds: string[];   // para validar duplicidade
      companyFields: FormField[]; // disponíveis para Contact.dependsOn
    }
  ) {
    this.form = this.buildForm(data.field);
  }

  get companyFields(): FormField[] { return this.data.companyFields; }
  get optionsArray(): FormArray { return this.form.get('options') as FormArray; }
  get columnsArray(): FormArray { return this.form.get('columns') as FormArray; }

  private buildForm(field: FormField | null): FormGroup {
    const f = field ?? this.defaultField();

    return this.fb.group({
      id: new FormControl(f.id, [
        Validators.required,
        Validators.pattern(FieldEditorDialogComponent.ID_PATTERN),
        (ctrl) => {
          const value = ctrl.value as string | null;
          if (!value) return null;
          // Em edição, o id é readonly e está nos existingIds — não conflita consigo mesmo.
          const isEditingSame = !!field && field.id === value;
          if (!isEditingSame && this.data.existingIds.includes(value)) {
            return { duplicate: true };
          }
          return null;
        }
      ]),
      type: new FormControl<FormFieldType>(f.type, Validators.required),
      label: new FormControl(f.label, Validators.required),
      required: new FormControl(!!f.required),
      invisible: new FormControl(!!f.invisible),
      locked: new FormControl(!!f.locked),
      placeholder: new FormControl(f.placeholder ?? ''),
      helpText: new FormControl(f.helpText ?? ''),
      formula: new FormControl(f.formula ?? ''),
      dependsOn: new FormControl(f.dependsOn ?? ''),
      options: this.fb.array((f.options ?? []).map(o => this.fb.group({
        value: [o.value, Validators.required],
        label: [o.label, Validators.required]
      }))),
      validation: this.fb.group({
        min: [f.validation?.min ?? null],
        max: [f.validation?.max ?? null],
        minLength: [f.validation?.minLength ?? null],
        maxLength: [f.validation?.maxLength ?? null],
        pattern: [f.validation?.pattern ?? ''],
        minRows: [f.validation?.minRows ?? null],
        maxRows: [f.validation?.maxRows ?? null]
      }),
      columns: this.fb.array((f.columns ?? []).map(c => this.fb.group({
        id: [c.id, Validators.required],
        type: [c.type, Validators.required],
        label: [c.label, Validators.required],
        required: [!!c.required]
      })))
    });
  }

  private defaultField(): FormField {
    return { id: '', type: 'Text', label: '', required: false };
  }

  typeLabel(type: FormFieldType): string {
    return FIELD_TYPES.find(t => t.type === type)?.type ?? type;
  }

  // Helpers para visibilidade de seções
  hasOptions(): boolean {
    const t = this.form.value.type as FormFieldType;
    return t === 'Dropdown' || t === 'Radio' || t === 'CheckboxMulti';
  }
  hasNumericValidation(): boolean { return this.form.value.type === 'Number'; }
  hasTextValidation(): boolean {
    const t = this.form.value.type as FormFieldType;
    return t === 'Text' || t === 'Textarea';
  }
  isContact(): boolean { return this.form.value.type === 'Contact'; }
  isTable(): boolean { return this.form.value.type === 'Table'; }
  canHaveFormula(): boolean { return this.form.value.type !== 'Table'; }

  onTypeChange() {
    // Limpa estruturas que não fazem sentido para o novo tipo.
    if (!this.hasOptions()) this.optionsArray.clear();
    if (!this.isTable()) this.columnsArray.clear();
    if (this.isContact()) {
      this.form.get('dependsOn')!.setValidators([Validators.required]);
    } else {
      this.form.get('dependsOn')!.clearValidators();
      this.form.get('dependsOn')!.setValue('');
    }
    this.form.get('dependsOn')!.updateValueAndValidity();
  }

  addOption() {
    this.optionsArray.push(this.fb.group({
      value: ['', Validators.required],
      label: ['', Validators.required]
    }));
  }
  removeOption(i: number) { this.optionsArray.removeAt(i); }

  addColumn() {
    this.columnsArray.push(this.fb.group({
      id: ['', Validators.required],
      type: ['Text' as FormFieldType, Validators.required],
      label: ['', Validators.required],
      required: [false]
    }));
  }
  removeColumn(i: number) { this.columnsArray.removeAt(i); }

  onSave() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();

    // Auto-bloqueio quando há fórmula (defensivo + UX previsível).
    if (raw.formula) raw.locked = true;

    // Limpa nulls/empties que não devem ir pro JSON.
    const field: FormField = {
      id: raw.id,
      type: raw.type,
      label: raw.label,
      required: !!raw.required,
      invisible: !!raw.invisible,
      locked: !!raw.locked,
      placeholder: raw.placeholder || null,
      helpText: raw.helpText || null,
      formula: raw.formula || null,
      dependsOn: raw.dependsOn || null,
      options: this.hasOptions() ? raw.options : null,
      validation: this.scrubValidation(raw.validation),
      columns: this.isTable() ? raw.columns : null
    };

    this.dialogRef.close(field);
  }

  private scrubValidation(v: Record<string, unknown> | null) {
    if (!v) return null;
    const out: Record<string, unknown> = {};
    let any = false;
    for (const [k, val] of Object.entries(v)) {
      if (val !== null && val !== '' && val !== undefined) {
        out[k] = val;
        any = true;
      }
    }
    return any ? out : null;
  }
}
