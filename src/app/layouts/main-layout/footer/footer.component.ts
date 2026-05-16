import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="app-footer">
      <span>© {{ year }} BudgetApp — Todos os direitos reservados</span>
    </footer>
  `,
  styles: [`
    .app-footer {
      text-align: center;
      padding: 12px 24px;
      font-size: 12px;
      color: rgba(0,0,0,0.45);
      border-top: 1px solid rgba(0,0,0,0.08);
      background: #fff;
    }
  `]
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
