import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

const LANG_KEY = 'ba_lang';
const SUPPORTED = ['pt-BR', 'en', 'es'] as const;
type Lang = typeof SUPPORTED[number];

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private transloco = inject(TranslocoService);

  /** Called in APP_INITIALIZER to restore persisted language. */
  init(): void {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    const lang: Lang = saved && SUPPORTED.includes(saved) ? saved : 'pt-BR';
    this.transloco.setActiveLang(lang);
  }

  setLanguage(lang: Lang): void {
    localStorage.setItem(LANG_KEY, lang);
    this.transloco.setActiveLang(lang);
  }

  getLanguage(): string {
    return this.transloco.getActiveLang();
  }

  readonly supported: { code: Lang; labelKey: string }[] = [
    { code: 'pt-BR', labelKey: 'language.pt-BR' },
    { code: 'en',    labelKey: 'language.en' },
    { code: 'es',    labelKey: 'language.es' }
  ];
}
