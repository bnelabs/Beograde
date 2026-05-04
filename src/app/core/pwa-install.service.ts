import { Injectable, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  readonly isStandalone = signal(this.detectStandalone());
  readonly isIos = signal(this.detectIos());
  readonly canPrompt = signal(false);

  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canPrompt.set(true);
    });
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canPrompt.set(false);
      this.isStandalone.set(true);
    });
  }

  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.deferredPrompt) return 'unavailable';
    await this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    this.canPrompt.set(false);
    return outcome;
  }

  private detectStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    return (
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      navStandalone === true
    );
  }

  private detectIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
  }
}
