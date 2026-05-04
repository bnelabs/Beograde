import { Injectable, signal } from '@angular/core';
import { UserPosition } from '../data/types';

type Permission = 'unknown' | 'granted' | 'denied' | 'prompt' | 'unsupported';

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  readonly position = signal<UserPosition | null>(null);
  readonly error = signal<string | null>(null);
  readonly permission = signal<Permission>('unknown');
  readonly isWatching = signal(false);

  private watchId: number | null = null;

  constructor() {
    this.checkPermission();
  }

  private async checkPermission(): Promise<void> {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.permission.set('unsupported');
      return;
    }
    // Permissions API is not on Safari iOS for geolocation, swallow errors.
    try {
      const status = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
      if (status) {
        this.permission.set(status.state as Permission);
        status.onchange = () => this.permission.set(status.state as Permission);
      }
    } catch {
      this.permission.set('unknown');
    }
  }

  start(): void {
    if (this.watchId !== null) return;
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      this.error.set('Geolocation is not supported on this device.');
      this.permission.set('unsupported');
      return;
    }
    this.isWatching.set(true);
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.position.set({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp,
        });
        this.error.set(null);
        if (this.permission() !== 'granted') this.permission.set('granted');
      },
      (err) => {
        this.error.set(err.message);
        if (err.code === err.PERMISSION_DENIED) this.permission.set('denied');
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );
  }

  stop(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;
    this.isWatching.set(false);
  }

  /** One-shot fix; useful for centring the map without starting a watch. */
  requestOnce(): Promise<UserPosition> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p: UserPosition = {
            lng: pos.coords.longitude,
            lat: pos.coords.latitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          };
          this.position.set(p);
          this.permission.set('granted');
          resolve(p);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) this.permission.set('denied');
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 15_000 },
      );
    });
  }
}
