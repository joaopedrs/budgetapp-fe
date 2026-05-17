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
      /* Uses theme primary color; the gradient layer keeps depth on any base hue. */
      background:
        linear-gradient(135deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 50%, rgba(255,255,255,0.15) 100%),
        var(--color-primary, #7c3aed);
    }
  `]
})
export class LoginLayoutComponent {}
