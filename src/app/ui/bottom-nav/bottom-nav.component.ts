import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface NavTab {
  id: 'home' | 'map' | 'routes' | 'trips' | 'saved';
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="nav" role="navigation" aria-label="Primary">
      <ul class="nav-list">
        @for (tab of tabs(); track tab.id) {
          <li>
            <a class="nav-tab"
               [attr.data-id]="tab.id"
               [routerLink]="tab.route"
               [class.is-active]="tab.id === activeId()"
               [attr.aria-current]="tab.id === activeId() ? 'page' : null">
              <span class="material-symbols-outlined nav-icon" aria-hidden="true">{{ tab.icon }}</span>
              <span class="nav-label">{{ tab.label }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [`
    :host { display: block; }
    .nav {
      background: rgba(255, 248, 241, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      box-shadow: var(--shadow-nav);
      padding-bottom: env(safe-area-inset-bottom);
    }
    .nav-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); }
    .nav-tab {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 2px; padding: 8px 4px;
      color: var(--ink-3);
      text-decoration: none;
      min-height: 56px;
      transition: color var(--motion-tab);
    }
    .nav-tab.is-active { color: var(--accent); }
    .nav-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; border-radius: 8px; }
    .nav-icon { font-size: 22px; }
    .nav-label { font-size: 10px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
  `],
})
export class BottomNavComponent {
  tabs = input.required<NavTab[]>();
  activeId = input.required<NavTab['id']>();
}
