import { ApplicationConfig, provideZoneChangeDetection, isDevMode, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideTransloco, TRANSLOCO_LOADER } from '@jsverse/transloco';
import { provideQuillConfig } from 'ngx-quill';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AppTranslocoLoader } from './core/services/transloco-loader';
import { LanguageService } from './core/services/language.service';

function initLanguage(langService: LanguageService) {
  return () => langService.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideTransloco({
      config: {
        availableLangs: ['pt-BR', 'en', 'es'],
        defaultLang: 'pt-BR',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      }
    }),
    { provide: TRANSLOCO_LOADER, useClass: AppTranslocoLoader },
    {
      provide: APP_INITIALIZER,
      useFactory: initLanguage,
      deps: [LanguageService],
      multi: true
    },
    // Quill — toolbar enxuta focada em e-mail (sem image/link arbitrário pra
    // evitar XSS no template renderizado). Bold/italic/lists/headings cobrem
    // 95% dos casos de e-mail corporativo.
    provideQuillConfig({
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['clean']
        ]
      },
      theme: 'snow',
      placeholder: 'Escreva o template...'
    })
  ]
};
