import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { pick } from '../../core/i18n/i18n';
import type { Bilingual } from '../../data/types';

@Pipe({ name: 'i18nText', standalone: true, pure: false })
export class I18nTextPipe implements PipeTransform {
  private i18n = inject(I18nService);
  transform(value: Bilingual | null | undefined): string {
    if (!value) return '';
    return pick(value, this.i18n.locale());
  }
}
