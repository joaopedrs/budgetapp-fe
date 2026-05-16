import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-login-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="login-layout">
      <router-outlet />
    </div>
  `,
  styles: [`
    .login-layout {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #5b21b6 0%, #7c3aed 50%, #a855f7 100%);
    }
  `]
})
export class LoginLayoutComponent {}
