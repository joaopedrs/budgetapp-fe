import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { TranslocoModule } from '@jsverse/transloco';
import { QuillEditorComponent } from 'ngx-quill';
import { ProcessFormService } from '../../../core/services/process-form.service';
import { ProcessService } from '../../../core/services/process.service';
import {
  FIELD_TYPES, FormField, FormSchema
} from '../../../core/models/process-form.model';
import { DynamicFormComponent } from '../../../shared/dynamic-form/dynamic-form.component';
import { FieldEditorDialogComponent } from './field-editor-dialog.component';

/**
 * Tela "Configurar Formulário" de um processo.
 *
 * **Estrutura visual:**
 * - Aba "Construção": lista de campos drag-drop + botão "Novo campo".
 * - Aba "Preview": renderiza o formulário como o usuário final verá (DynamicForm em modo preview).
 * - Aba "JSON": visualização read-only do schema serializado (útil para debug/copy).
 *
 * **Estado:** o `schema` é um signal local; só sincroniza com o backend ao clicar em "Salvar".
 * Isso evita PUTs ruidosos a cada edição.
 *
 * **Acesso:** rota `/processes/:id/form`, exige role Admin (gate replicado no BE).
 */
@Component({
  selector: 'app-form-builder',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, DragDropModule, TranslocoModule,
    MatCardModule, MatButtonModule, MatIconModule, MatTabsModule,
    MatSnackBarModule, MatDialogModule, MatProgressSpinnerModule,
    MatChipsModule, MatDividerModule,
    DynamicFormComponent, QuillEditorComponent
  ],
  template: `
    <div class="page" *transloco="let t">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ t('formBuilder.title') }}</h2>
          <p class="page-subtitle">
            {{ t('formBuilder.subtitle') }} —
            <strong>{{ processName() || '...' }}</strong>
            @if (version() > 0) {
              <span class="version-chip">v{{ version() }}</span>
            }
          </p>
        </div>
        <div class="header-actions">
          <a mat-stroked-button [routerLink]="['/processes', processId()]">
            <mat-icon>arrow_back</mat-icon> {{ t('common.back') }}
          </a>
          <button mat-flat-button color="primary" (click)="onSave()" [disabled]="saving() || loading()">
            @if (saving()) {
              <mat-spinner diameter="20" />
            } @else {
              <ng-container><mat-icon>save</mat-icon> {{ t('common.save') }}</ng-container>
            }
          </button>
        </div>
      </div>

      @if (loading()) {
        <mat-card><div class="loading"><mat-spinner diameter="40" /></div></mat-card>
      } @else {
        <mat-tab-group dynamicHeight>
          <mat-tab [label]="t('formBuilder.tabs.build')">
            <div class="tab-pane">
              <div class="builder-grid">
                <!-- Coluna esquerda: tipos disponíveis (atalhos) -->
                <mat-card class="palette-card">
                  <h3>{{ t('formBuilder.palette') }}</h3>
                  <p class="hint">{{ t('formBuilder.paletteHint') }}</p>
                  <div class="palette">
                    @for (t of fieldTypes; track t.type) {
                      <button mat-stroked-button class="palette-item" (click)="addField(t.type)">
                        <mat-icon>{{ t.icon }}</mat-icon>
                        <span>{{ t.type }}</span>
                      </button>
                    }
                  </div>
                </mat-card>

                <!-- Coluna direita: lista de campos do schema -->
                <mat-card class="fields-card">
                  <div class="card-header">
                    <h3>{{ t('formBuilder.fields') }} ({{ schema().fields.length }})</h3>
                  </div>

                  @if (schema().fields.length === 0) {
                    <div class="empty">
                      <mat-icon>view_list</mat-icon>
                      <p>{{ t('formBuilder.empty') }}</p>
                    </div>
                  } @else {
                    <div cdkDropList class="fields-list" (cdkDropListDropped)="onDrop($event)">
                      @for (field of schema().fields; track field.id; let i = $index) {
                        <div cdkDrag class="field-row">
                          <div cdkDragHandle class="drag-handle">
                            <mat-icon>drag_indicator</mat-icon>
                          </div>
                          <mat-icon class="type-icon">{{ iconFor(field.type) }}</mat-icon>
                          <div class="field-info">
                            <div class="field-label">{{ field.label || '(sem rótulo)' }}</div>
                            <div class="field-meta">
                              <code>{{ field.id }}</code>
                              <span class="separator">·</span>
                              <span>{{ field.type }}</span>
                              @if (field.required) { <mat-chip class="chip-req">obrig.</mat-chip> }
                              @if (field.locked)   { <mat-chip class="chip-lock">bloqueado</mat-chip> }
                              @if (field.invisible){ <mat-chip class="chip-inv">invisível</mat-chip> }
                              @if (field.formula)  { <mat-chip class="chip-fx">fórmula</mat-chip> }
                            </div>
                          </div>
                          <div class="field-actions">
                            <button mat-icon-button (click)="editField(i)" title="Editar">
                              <mat-icon>edit</mat-icon>
                            </button>
                            <button mat-icon-button color="warn" (click)="removeField(i)" title="Remover">
                              <mat-icon>delete</mat-icon>
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </mat-card>
              </div>
            </div>
          </mat-tab>

          <mat-tab [label]="t('formBuilder.tabs.preview')">
            <div class="tab-pane">
              <mat-card>
                @if (schema().fields.length === 0) {
                  <div class="empty">
                    <mat-icon>preview</mat-icon>
                    <p>{{ t('formBuilder.previewEmpty') }}</p>
                  </div>
                } @else {
                  <app-dynamic-form [schema]="schema()" />
                }
              </mat-card>
            </div>
          </mat-tab>

          <mat-tab [label]="t('formBuilder.tabs.template')">
            <div class="tab-pane">
              <div class="template-grid">
                <!-- Coluna esquerda: dicionário de placeholders pra inserir no editor -->
                <mat-card class="placeholders-card">
                  <h3>{{ t('formBuilder.template.placeholders') }}</h3>
                  <p class="hint">{{ t('formBuilder.template.placeholdersHint') }}</p>

                  <h4>{{ t('formBuilder.template.reserved') }}</h4>
                  <div class="ph-group">
                    @for (r of reservedPlaceholders; track r) {
                      <code class="ph-chip" (click)="insertPlaceholder(r)">{{ '{' }}{{ r }}{{ '}' }}</code>
                    }
                  </div>

                  @if (rootFields().length > 0) {
                    <h4>{{ t('formBuilder.template.fields') }}</h4>
                    <div class="ph-group">
                      @for (f of rootFields(); track f.id) {
                        <code class="ph-chip" [title]="f.label"
                              (click)="insertPlaceholder(f.id)">{{ '{' }}{{ f.id }}{{ '}' }}</code>
                      }
                    </div>
                  }

                  @if (tableFields().length > 0) {
                    <h4>{{ t('formBuilder.template.tables') }}</h4>
                    <p class="hint-small">{{ t('formBuilder.template.tablesHint') }}</p>
                    @for (tbl of tableFields(); track tbl.id) {
                      <div class="table-ph">
                        <strong>{{ tbl.label || tbl.id }}</strong>
                        <code class="ph-chip block"
                              (click)="insertTableBlock(tbl)">
                          {{ '{#' }}{{ tbl.id }}{{ '}' }} ... {{ '{/' }}{{ tbl.id }}{{ '}' }}
                        </code>
                        <div class="ph-group">
                          @for (col of (tbl.columns || []); track col.id) {
                            <code class="ph-chip mini" [title]="col.label"
                                  (click)="insertPlaceholder(col.id)">{{ '{' }}{{ col.id }}{{ '}' }}</code>
                          }
                          <code class="ph-chip mini" title="Índice da linha (1-based)"
                                (click)="insertPlaceholder('$index')">{{ '{' }}$index{{ '}' }}</code>
                        </div>
                      </div>
                    }
                  }
                </mat-card>

                <!-- Editor Quill -->
                <mat-card class="editor-card">
                  <h3>{{ t('formBuilder.template.editor') }}</h3>
                  <p class="hint">{{ t('formBuilder.template.editorHint') }}</p>
                  <quill-editor
                    #templateQuill
                    [(ngModel)]="templateHtml"
                    [styles]="{ height: '420px' }"
                    (onEditorCreated)="onQuillReady($event)" />
                </mat-card>
              </div>
            </div>
          </mat-tab>

          <mat-tab [label]="t('formBuilder.tabs.json')">
            <div class="tab-pane">
              <mat-card class="json-card">
                <pre>{{ jsonPreview() }}</pre>
              </mat-card>
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    .page-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .page-title  { font-size:24px; font-weight:700; margin:0 0 4px; color:#1e1145; }
    .page-subtitle { color:rgba(0,0,0,.55); margin:0; }
    .version-chip {
      display:inline-block; margin-left:8px; background:#ede9fe; color:#5b21b6;
      font-weight:600; padding:2px 8px; border-radius:12px; font-size:12px;
    }
    .header-actions { display:flex; gap:12px; }
    .loading { display:flex; justify-content:center; padding:40px; }
    .tab-pane { padding:20px 0; }

    .builder-grid { display:grid; grid-template-columns: 280px 1fr; gap:16px; }
    @media (max-width: 900px) { .builder-grid { grid-template-columns: 1fr; } }

    .palette-card, .fields-card { padding:16px; }
    .palette-card h3, .fields-card h3 { margin:0 0 8px; font-size:16px; font-weight:600; color:#1e1145; }
    .hint { color:rgba(0,0,0,.55); font-size:13px; margin:0 0 12px; }
    .palette { display:flex; flex-direction:column; gap:8px; }
    .palette-item { justify-content:flex-start; }
    .palette-item mat-icon { margin-right:8px; }

    .card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .empty { text-align:center; padding:40px; color:rgba(0,0,0,.4); }
    .empty mat-icon { font-size:48px; width:48px; height:48px; opacity:0.4; }

    .fields-list { display:flex; flex-direction:column; gap:8px; }
    .field-row {
      display:flex; align-items:center; gap:12px; padding:12px;
      background:#faf9ff; border:1px solid rgba(0,0,0,.06); border-radius:8px;
    }
    .field-row.cdk-drag-preview {
      box-shadow:0 8px 16px rgba(0,0,0,.2); background:#fff;
    }
    .field-row.cdk-drag-placeholder { opacity:0.4; }
    .drag-handle { cursor:grab; color:rgba(0,0,0,.4); }
    .drag-handle:active { cursor:grabbing; }
    .type-icon { color:#7c3aed; }
    .field-info { flex:1; min-width:0; }
    .field-label { font-weight:500; }
    .field-meta { font-size:12px; color:rgba(0,0,0,.55); display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .field-meta code { background:rgba(0,0,0,.05); padding:1px 6px; border-radius:4px; }
    .separator { opacity:0.4; }
    .field-actions { display:flex; gap:4px; }
    .chip-req  { background:#fef3c7 !important; color:#92400e !important; font-size:11px !important; min-height:20px !important; }
    .chip-lock { background:#e0e7ff !important; color:#3730a3 !important; font-size:11px !important; min-height:20px !important; }
    .chip-inv  { background:#f3f4f6 !important; color:#374151 !important; font-size:11px !important; min-height:20px !important; }
    .chip-fx   { background:#dcfce7 !important; color:#15803d !important; font-size:11px !important; min-height:20px !important; }

    .json-card pre {
      background:#1e1145; color:#e0e7ff; padding:16px; border-radius:8px;
      overflow-x:auto; font-family: monospace; font-size:13px; line-height:1.5;
    }

    /* Template tab */
    .template-grid { display:grid; grid-template-columns: 280px 1fr; gap:16px; }
    @media (max-width: 900px) { .template-grid { grid-template-columns: 1fr; } }
    .placeholders-card, .editor-card { padding:16px; }
    .placeholders-card h3, .editor-card h3 {
      margin:0 0 8px; font-size:16px; font-weight:600; color:#1e1145;
    }
    .placeholders-card h4 {
      margin:16px 0 6px; font-size:11px; font-weight:600; color:rgba(0,0,0,.55);
      text-transform:uppercase; letter-spacing:0.5px;
    }
    .hint { color:rgba(0,0,0,.55); font-size:13px; margin:0 0 12px; }
    .hint-small { color:rgba(0,0,0,.5); font-size:12px; margin:0 0 6px; }
    .ph-group { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
    .ph-chip {
      cursor:pointer; background:#ede9fe; color:#5b21b6;
      padding:2px 8px; border-radius:4px; font-family:monospace; font-size:12px;
      transition: background .15s;
    }
    .ph-chip:hover { background:#ddd6fe; }
    .ph-chip.mini { font-size:11px; padding:1px 6px; }
    .ph-chip.block { display:block; margin:4px 0; word-break:break-all; }
    .table-ph { margin:8px 0 12px; padding:8px; border:1px dashed rgba(124,58,237,.3); border-radius:6px; }
    .table-ph strong { font-size:13px; color:#1e1145; display:block; margin-bottom:4px; }
  `]
})
export class FormBuilderComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private formService = inject(ProcessFormService);
  private processService = inject(ProcessService);

  fieldTypes = FIELD_TYPES;

  processId = signal<number>(0);
  processName = signal<string>('');
  version = signal<number>(0);
  schema = signal<FormSchema>({ fields: [] });

  /**
   * HTML do template (Quill output). Mantido como propriedade simples (não
   * signal) porque é two-way bound via <c>[(ngModel)]</c> com o ngx-quill —
   * envolver em signal exigiria boilerplate de get/set sem benefício.
   */
  templateHtml: string = '';

  /** Reservados — primeiro grupo de chips no painel de placeholders. */
  reservedPlaceholders = ['atividade', 'codigo', 'executor', 'processo'];

  loading = signal(false);
  saving = signal(false);

  /** Campos de primeiro nível que NÃO são tabela — viram chips de placeholder. */
  rootFields = computed(() =>
    (this.schema().fields ?? []).filter(f => f.type !== 'Table'));

  /** Tabelas — agrupadas separadamente porque suportam blocos de iteração. */
  tableFields = computed(() =>
    (this.schema().fields ?? []).filter(f => f.type === 'Table'));

  /**
   * Referência ao instance do Quill (capturada via (onEditorCreated)). Usada
   * para inserir placeholders na posição atual do cursor em vez de só
   * concatenar no final do template.
   */
  private quillInstance: any = null;

  jsonPreview = computed(() => JSON.stringify(this.schema(), null, 2));

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.router.navigate(['/processes']);
      return;
    }
    const id = +idParam;
    this.processId.set(id);
    this.loading.set(true);

    // Carrega processo + formulário em paralelo.
    this.processService.getById(id).subscribe({
      next: p => this.processName.set(p.name),
      error: () => this.processName.set('?')
    });

    this.formService.get(id).subscribe({
      next: res => {
        this.schema.set(res.schema ?? { fields: [] });
        this.templateHtml = res.templateHtml ?? '';
        this.version.set(res.version);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Erro ao carregar formulário.', 'OK', { duration: 4000, panelClass: 'snack-error' });
      }
    });
  }

  // ---------- Quill helpers ----------
  onQuillReady(quill: any) {
    this.quillInstance = quill;
  }

  /** Insere um placeholder `{key}` na posição atual do cursor. */
  insertPlaceholder(key: string) {
    const snippet = `{${key}}`;
    if (this.quillInstance) {
      const range = this.quillInstance.getSelection(true);
      const idx = range?.index ?? this.quillInstance.getLength();
      this.quillInstance.insertText(idx, snippet, 'user');
      this.quillInstance.setSelection(idx + snippet.length, 0, 'user');
    } else {
      // Fallback: concatena no fim caso o editor ainda não tenha sido criado.
      this.templateHtml = (this.templateHtml ?? '') + snippet;
    }
  }

  /** Insere um bloco de tabela `{#table}{col1} ... {/table}` em uma nova linha. */
  insertTableBlock(table: FormField) {
    const cols = (table.columns ?? []).map(c => `{${c.id}}`).join(' | ');
    const block = `\n{#${table.id}}\n${cols}\n{/${table.id}}\n`;
    if (this.quillInstance) {
      const range = this.quillInstance.getSelection(true);
      const idx = range?.index ?? this.quillInstance.getLength();
      this.quillInstance.insertText(idx, block, 'user');
    } else {
      this.templateHtml = (this.templateHtml ?? '') + block;
    }
  }

  // ---------- Drag-drop ----------
  onDrop(event: CdkDragDrop<FormField[]>) {
    const fields = [...this.schema().fields];
    moveItemInArray(fields, event.previousIndex, event.currentIndex);
    this.schema.set({ fields });
  }

  // ---------- Add / edit / remove ----------
  addField(type?: string) {
    const seed: FormField | null = type
      ? { id: this.suggestId(type), type: type as FormField['type'], label: '' }
      : null;
    this.openEditor(seed, null);
  }

  editField(index: number) {
    const f = this.schema().fields[index];
    this.openEditor(f, index);
  }

  removeField(index: number) {
    const f = this.schema().fields[index];
    if (!confirm(`Remover o campo "${f.label || f.id}"?`)) return;
    const fields = [...this.schema().fields];
    fields.splice(index, 1);
    this.schema.set({ fields });
  }

  private openEditor(seed: FormField | null, index: number | null) {
    const existingIds = this.schema().fields
      .filter((_, i) => i !== index)
      .map(f => f.id);
    const companyFields = this.schema().fields.filter(f => f.type === 'Company');

    const ref = this.dialog.open(FieldEditorDialogComponent, {
      data: { field: seed, existingIds, companyFields },
      maxWidth: '900px',
      width: '90%'
    });

    ref.afterClosed().subscribe((result: FormField | undefined) => {
      if (!result) return;
      const fields = [...this.schema().fields];
      if (index === null) fields.push(result);
      else fields[index] = result;
      this.schema.set({ fields });
    });
  }

  // ---------- Save ----------
  onSave() {
    this.saving.set(true);
    // Envia template como string vazia se admin limpou o campo (semântica: limpa
    // no banco). Null preservaria; só usaríamos null se quiséssemos atualizar
    // só o schema sem mexer no template — fluxo separado, não é o caso aqui.
    this.formService.save(this.processId(), {
      schema: this.schema(),
      templateHtml: this.templateHtml ?? ''
    }).subscribe({
      next: res => {
        this.saving.set(false);
        this.version.set(res.version);
        this.snack.open(`Formulário salvo (v${res.version}).`, 'OK', { duration: 3000, panelClass: 'snack-success' });
      },
      error: err => {
        this.saving.set(false);
        // Backend devolve mensagem descritiva do FormSchemaValidator em 400.
        const msg = err?.error?.message ?? err?.error?.title ?? 'Erro ao salvar formulário.';
        this.snack.open(msg, 'OK', { duration: 6000, panelClass: 'snack-error' });
      }
    });
  }

  // ---------- Helpers ----------
  iconFor(type: string): string {
    return FIELD_TYPES.find(t => t.type === type)?.icon ?? 'help';
  }

  /** Sugere um ID único do tipo `numero_2` quando o usuário escolhe um tipo da paleta. */
  private suggestId(type: string): string {
    const base = type.toLowerCase();
    const existing = new Set(this.schema().fields.map(f => f.id));
    if (!existing.has(base)) return base;
    for (let i = 2; i < 999; i++) {
      const candidate = `${base}_${i}`;
      if (!existing.has(candidate)) return candidate;
    }
    return `${base}_${Date.now()}`;
  }
}
