import { Injectable, computed, inject } from '@angular/core';
import { I18nService } from './i18n.service';
import enStrings from '../../../i18n/en.json';
import srLatStrings from '../../../i18n/sr-Latn.json';
import srCyrStrings from '../../../i18n/sr-Cyrl.json';
import trStrings from '../../../i18n/tr.json';

type DeepWiden<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly DeepWiden<U>[]
    : { [K in keyof T]: DeepWiden<T[K]> };

type StringsBundle = DeepWiden<typeof enStrings>;

const en: StringsBundle = enStrings;
const srLat: StringsBundle = srLatStrings;
const srCyr: StringsBundle = srCyrStrings;
const tr: StringsBundle = trStrings;

@Injectable({ providedIn: 'root' })
export class StringsService {
  private readonly i18n = inject(I18nService);
  readonly t = computed<StringsBundle>(() => {
    const loc = this.i18n.locale();
    if (loc.locale === 'tr') return tr;
    if (loc.locale !== 'sr') return en;
    if (loc.script === 'Cyrl' && this.i18n.cyrillicEnabled()) return srCyr;
    return srLat;
  });
}
