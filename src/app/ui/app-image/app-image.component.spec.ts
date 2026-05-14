import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { AppImageComponent } from './app-image.component';
import { ImageAsset } from '../../data/types';

const ASSET: ImageAsset = {
  src: '/assets/poi/x/x-1024.avif',
  width: 1024, height: 615,
  lqip: 'data:image/jpeg;base64,abc',
  credit: 'A. Photographer, CC BY 4.0, via Flickr',
  license: 'CC BY 4.0',
  source: 'https://example.test/p/123',
};

@Component({ standalone: true, imports: [AppImageComponent], template: `` })
class Host {
  asset?: ImageAsset;
  alt = '';
  eager = false;
  fallbackIcon?: string;
  showCredit = true;
}

function mount(template: string, init?: Partial<Host>) {
  TestBed.configureTestingModule({ imports: [Host] });
  TestBed.overrideComponent(Host, { set: { template } });
  const fix = TestBed.createComponent(Host);
  Object.assign(fix.componentInstance, init);
  fix.detectChanges();
  return fix;
}

describe('AppImageComponent', () => {
  it('renders <img> with srcset and lazy loading by default', () => {
    const fix = mount(
      `<app-image [asset]="asset" [alt]="alt"></app-image>`,
      { asset: ASSET, alt: 'Kalemegdan' },
    );
    const img = fix.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('srcset')).toContain('-640.avif 640w');
    expect(img.getAttribute('srcset')).toContain('-1024.avif 1024w');
    expect(img.getAttribute('srcset')).toContain('-1600.avif 1600w');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('alt')).toBe('Kalemegdan');
    expect(img.getAttribute('decoding')).toBe('async');
  });

  it('omits loading=lazy when eager is true', () => {
    const fix = mount(
      `<app-image [asset]="asset" [eager]="eager"></app-image>`,
      { asset: ASSET, eager: true },
    );
    const img = fix.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('loading')).toBeFalsy();
  });

  it('sets the LQIP as background-image on the container', () => {
    const fix = mount(`<app-image [asset]="asset"></app-image>`, { asset: ASSET });
    const container = fix.nativeElement.querySelector('.app-image') as HTMLElement;
    expect(container.style.backgroundImage).toContain('data:image/jpeg;base64,abc');
  });

  it('renders the credit caption by default', () => {
    const fix = mount(`<app-image [asset]="asset"></app-image>`, { asset: ASSET });
    const caption = fix.nativeElement.querySelector('.app-image-credit') as HTMLElement;
    expect(caption).toBeTruthy();
    expect(caption.textContent).toContain('CC BY 4.0');
  });

  it('omits the credit caption when showCredit is false', () => {
    const fix = mount(
      `<app-image [asset]="asset" [showCredit]="showCredit"></app-image>`,
      { asset: ASSET, showCredit: false },
    );
    expect(fix.nativeElement.querySelector('.app-image-credit')).toBeFalsy();
  });

  it('renders fallback icon when asset is undefined', () => {
    const fix = mount(
      `<app-image [asset]="asset" [fallbackIcon]="fallbackIcon"></app-image>`,
      { asset: undefined, fallbackIcon: 'local_cafe' },
    );
    const icon = fix.nativeElement.querySelector('.app-image-fallback') as HTMLElement;
    expect(icon).toBeTruthy();
    expect(icon.textContent).toContain('local_cafe');
    expect(fix.nativeElement.querySelector('img')).toBeFalsy();
  });

  it('renders nothing in the slot when neither asset nor fallback are set', () => {
    const fix = mount(`<app-image></app-image>`);
    expect(fix.nativeElement.querySelector('img')).toBeFalsy();
    expect(fix.nativeElement.querySelector('.app-image-fallback')).toBeFalsy();
  });
});
