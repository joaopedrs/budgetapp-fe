import {
  Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { FormField, FormSchema } from '../../core/models/process-form.model';
import { ProcessFormService } from '../../core/services/process-form.service';
import { DynamicFieldComponent, buildValidators } from './dynamic-field.component';

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
          [rootGroup]="rootGroup()" />
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
  visibleFields = computed(() => (this.schemaSignal().fields ?? []).filter(f => !f.invisible));

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
        // FormArray vazio — DynamicTableComponent preenche minRows no ngOnInit.
        group[field.id] = this.fb.array([]);
      } else if (field.type === 'CheckboxMulti') {
        const initial = Array.isArray(this.value?.[field.id]) ? this.value[field.id] : [];
        group[field.id] = [initial, buildValidators(field)];
      } else {
        group[field.id] = [this.value?.[field.id] ?? null, buildValidators(field)];
      }
    }
    this.rootGroup.set(this.fb.group(group));
    if (this.disabled) this.rootGroup().disable({ emitEvent: false });
  }

  private wireUp() {
    const root = this.rootGroup();

    root.valueChanges
      .pipe(debounceTime(150), takeUntil(this.destroy$))
      .subscribe(v => {
        // Modo live: pede ao backend para revalidar fórmulas.
        if (this.processId && this.hasFormulas()) {
          this.formService.evaluate(this.processId, { values: v })
            .subscribe({
              next: res => {
                // Aplica só campos calculados — sem disparar valueChanges em loop.
                this.applyCalculatedValues(res.values, root);
                this.valueChange.emit(root.getRawValue());
              },
              error: () => this.valueChange.emit(v)  // falha silenciosa em UX local
            });
        } else {
          this.valueChange.emit(v);
        }
      });

    root.statusChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(s => this.validityChange.emit(s === 'VALID'));
  }

  private hasFormulas(): boolean {
    return (this.schema?.fields ?? []).some(f => !!f.formula);
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
