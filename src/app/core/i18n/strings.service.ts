import { Injectable, computed, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';
import srCyrStrings from '../../../i18n/sr-Cyrl.json';

type StringsBundle = typeof enStrings;

@Injectable({ providedIn: 'root' })
export class StringsService {
  private readonly i18n = inject(I18nService);
  readonly t = computed<StringsBundle>(() => {
    const loc = this.i18n.locale();
    if (loc.locale !== 'sr') return enStrings;
    if (loc.script === 'Cyrl' && this.i18n.cyrillicEnabled()) return srCyrStrings as StringsBundle;
    return srLatStrings;
  });
}
