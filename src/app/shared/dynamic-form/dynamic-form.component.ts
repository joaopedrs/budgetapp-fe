import {
  Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { FormField, FormSchema } from '../../core/models/process-form.model';
import { ProcessFormService } from '../../core/services/process-form.service';
import { DynamicFieldComponent, buildTableRowGroup, buildValidators } from './dynamic-field.component';
import { evaluateRules } from './rule-evaluator';

/**
 * Renderizador genérico do formulário dinâmico.
 *
 * **Modos:**
 *  - **preview** (default): só renderiza, não chama API. Útil no builder.
 *  - **live** (`processId` informado): debita o backend a cada 600ms de inatividade
 *    para reavaliar fórmulas server-side e mesclar os valores calculados.
 *
 * **Saídas:**
 *  - `valueChange`: novo dicionário de valores (após eventual evaluate).
 *  - `validityChange`: true/false do FormGroup raiz.
 *
 * **Reset de schema:** se `schema` mudar, reconstrói o FormGroup do zero,
 * tentando preservar valores cujos `id` ainda existem.
 */
@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DynamicFieldComponent],
  template: `
    <form [formGroup]="rootGroup()" class="dyn-form">
      @for (field of visibleFields(); track field.id) {
        <app-dynamic-field
          [field]="field"
          [control]="rootGroup().get(field.id)!"
          [rootGroup]="rootGroup()"
          (fieldTrigger)="evaluateNow()" />
      }
    </form>
  `,
  styles: [`
    .dyn-form { display: flex; flex-direction: column; gap: 4px; }
  `]
})
export class DynamicFormComponent implements OnChanges {
  @Input({ required: true }) schema!: FormSchema;
  @Input() value: Record<string, unknown> = {};
  /** Quando informado, ativa o modo "live" com chamada server-side de evaluate. */
  @Input() processId: number | null = null;
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<Record<string, unknown>>();
  @Output() validityChange = new EventEmitter<boolean>();

  private fb = inject(FormBuilder);
  private formService = inject(ProcessFormService);

  rootGroup = signal<FormGroup>(this.fb.group({}));
  /**
   * Espelho do Input `schema` como signal. Necessário porque `computed` só
   * rastreia outras signals — se ler `this.schema` direto (Input), o computed
   * ficaria preso no valor inicial e o preview do form-builder não atualizaria
   * ao editar campos (root cause do bug reportado).
   */
  private schemaSignal = signal<FormSchema>({ fields: [] });
  /** Conjunto de ids de campos hidden pelas regras (avaliado em runtime). */
  private hiddenByRules = signal<Set<string>>(new Set());

  visibleFields = computed(() => {
    const hidden = this.hiddenByRules();
    return (this.schemaSignal().fields ?? [])
      .filter(f => !f.invisible && !hidden.has(f.id));
  });

  private destroy$ = new Subject<void>();

  ngOnChanges(changes: SimpleChanges) {
    if (changes['schema']) {
      this.schemaSignal.set(this.schema ?? { fields: [] });
      this.destroy$.next();
      this.rebuildForm();
      this.wireUp();
    } else if (changes['value']) {
      // patchValue preserva o tipo das estruturas; não emite events redundantes.
      this.rootGroup().patchValue(this.value ?? {}, { emitEvent: false });
    }
    if (changes['disabled']) {
      if (this.disabled) this.rootGroup().disable({ emitEvent: false });
      else this.rootGroup().enable({ emitEvent: false });
    }
  }

  private rebuildForm() {
    const group: Record<string, unknown> = {};
    for (const field of this.schema?.fields ?? []) {
      if (field.type === 'Table') {
        // Popula o FormArray com as linhas existentes em `value`. Antes esse
        // bloco criava o array vazio e o DynamicTable só adicionava minRows —
        // resultado: ao reabrir uma instância salva, todas as linhas da
        // tabela sumiam (bug reportado).
        const arr = this.fb.array<FormGroup>([]);
        const savedRows = Array.isArray(this.value?.[field.id])
          ? (this.value[field.id] as Array<Record<string, unknown>>)
          : [];
        for (const row of savedRows) {
          arr.push(buildTableRowGroup(this.fb, field, row));
        }
        group[field.id] = arr;
      } else if (field.type === 'CheckboxMulti') {
        const initial = Array.isArray(this.value?.[field.id]) ? this.value[field.id] : [];
        // Quando o campo é locked, o controle precisa nascer disabled —
        // [disabled] no template é ignorado por mat-select/radio com
        // [formControl] (Angular emite warning conhecido).
        group[field.id] = [{ value: initial, disabled: !!field.locked }, buildValidators(field)];
      } else {
        group[field.id] = [
          { value: this.value?.[field.id] ?? null, disabled: !!field.locked },
          buildValidators(field)
        ];
      }
    }
    this.rootGroup.set(this.fb.group(group));
    if (this.disabled) this.rootGroup().disable({ emitEvent: false });
  }

  private wireUp() {
    const root = this.rootGroup();

    // Aplica regras na carga inicial (caso já existam valores no value bound).
    this.applyRules(root.getRawValue() as Record<string, unknown>);

    root.valueChanges
      .pipe(debounceTime(150), takeUntil(this.destroy$))
      .subscribe(v => {
        // 1) Regras de evento ANTES de evaluate — afetam imediatamente o UX.
        this.applyRules(v as Record<string, unknown>);

        // 2) Modo live: reavalia fórmulas no BE, salvo quando todas têm trigger
        //    explícito ≠ OnChange (nesses casos o dynamic-field aciona via
        //    evaluateNow() em blur/change).
        if (this.processId && this.shouldAutoEvaluate()) {
          this.formService.evaluate(this.processId, { values: v })
            .subscribe({
              next: res => {
                this.applyCalculatedValues(res.values, root);
                this.valueChange.emit(root.getRawValue());
              },
              error: () => this.valueChange.emit(v)
            });
        } else {
          this.valueChange.emit(v);
        }
      });

    root.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(s => this.validityChange.emit(s === 'VALID'));
  }

  /**
   * Avalia regras de cada campo e aplica os efeitos:
   * - <c>hide</c>: marca id no set <c>hiddenByRules</c> (template filtra).
   * - <c>lock</c>: control.disable/enable.
   * - <c>require</c>: re-aplica validators (Validators.required + os de validation).
   *
   * Cuidados:
   * - Sempre preserva o lock estático (<c>field.locked</c>) e o disabled global
   *   (<c>this.disabled</c>) — regras só ACRESCENTAM lock, nunca destravam.
   * - Usa <c>emitEvent: false</c> em disable/setValidators pra evitar loop
   *   infinito (mudança disparada por valueChanges não pode disparar outra).
   */
  private applyRules(values: Record<string, unknown>) {
    const fields = this.schemaSignal().fields ?? [];
    const newHidden = new Set<string>();
    const root = this.rootGroup();

    for (const field of fields) {
      const effects = evaluateRules(field.rules, values);
      const ctrl = root.get(field.id);
      if (!ctrl) continue;

      if (effects.hidden) newHidden.add(field.id);

      const shouldDisable = !!field.locked || effects.locked || this.disabled;
      if (shouldDisable && ctrl.enabled) ctrl.disable({ emitEvent: false });
      if (!shouldDisable && ctrl.disabled) ctrl.enable({ emitEvent: false });

      // Reaplica validators preservando required dinâmico (field.required OU effects.required).
      const required = !!field.required || effects.required;
      ctrl.setValidators(buildValidators({ ...field, required }));
      ctrl.updateValueAndValidity({ emitEvent: false });
    }

    if (!setEqual(this.hiddenByRules(), newHidden)) this.hiddenByRules.set(newHidden);
  }

  /**
   * True quando o auto-evaluate em valueChanges ainda faz sentido —
   * existe pelo menos um campo com fórmula com trigger OnChange (default).
   * Campos com OnBlur/OnSelect são re-avaliados via evaluateNow().
   */
  private shouldAutoEvaluate(): boolean {
    const formulaFields = (this.schemaSignal().fields ?? []).filter(f => !!f.formula);
    if (formulaFields.length === 0) return false;
    return formulaFields.some(f => !f.formulaTrigger || f.formulaTrigger === 'OnChange');
  }

  /**
   * Dispara reavaliação de fórmulas server-side AGORA (não espera debounce
   * nem valueChanges). Chamado pelo <c>DynamicFieldComponent</c> em eventos
   * blur/selectionChange quando o campo tem <c>formulaTrigger</c> explícito.
   */
  evaluateNow() {
    if (!this.processId) return;
    const root = this.rootGroup();
    const v = root.getRawValue();
    this.formService.evaluate(this.processId, { values: v }).subscribe({
      next: res => {
        this.applyCalculatedValues(res.values, root);
        this.valueChange.emit(root.getRawValue());
      }
    });
  }

  /**
   * Sobrescreve só os campos que possuem fórmula com o valor calculado pelo BE.
   * `emitEvent: false` evita loop com o `valueChanges` que disparou a chamada.
   */
  private applyCalculatedValues(calculated: Record<string, unknown>, group: FormGroup) {
    for (const f of this.schema?.fields ?? []) {
      if (!f.formula) continue;
      const ctrl = group.get(f.id);
      if (!ctrl) continue;
      const newVal = calculated[f.id];
      if (!Object.is(ctrl.value, newVal)) {
        ctrl.setValue(newVal as never, { emitEvent: false });
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

/** Igualdade de Sets pequenos — usado pra evitar re-renders desnecessários. */
function setEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
