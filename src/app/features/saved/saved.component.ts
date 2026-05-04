import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-saved',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './saved.component.html',
})
export class SavedComponent {}
