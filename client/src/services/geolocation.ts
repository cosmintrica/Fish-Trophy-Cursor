// DOM types for geolocation - use the correct interface
interface PositionOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

// Use built-in GeolocationPositionError type directly

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface LocationPermission {
  granted: boolean;
  denied: boolean;
  unavailable: boolean;
}

class GeolocationService {
  private currentLocation: UserLocation | null = null;
  private permissionStatus: LocationPermission = {
    granted: false,
    denied: false,
    unavailable: false,
  };
  private activeWatchId: number | null = null;

  // Verifică dacă geolocația este disponibilă
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  // Cere permisiunea pentru geolocație (prin obținerea poziției curente)
  async requestPermission(): Promise<LocationPermission> {
    if (!this.isSupported()) {
      this.permissionStatus.unavailable = true;
      return this.permissionStatus;
    }
    try {
      await this.getCurrentPosition();
      this.permissionStatus.granted = true;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 1) {
        this.permissionStatus.denied = true;
      } else {
        this.permissionStatus.unavailable = true;
      }
    }
    return this.permissionStatus;
  }

  // Obține poziția curentă (rapidă, cu cache, low-accuracy by default)
  async getCurrentPosition(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocația nu este suportată de acest browser'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // până la 5 minute din cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          this.currentLocation = loc;
          resolve(loc);
        },
        (error) => {
          let msg = 'Eroare la obținerea locației';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg = 'Permisiunea pentru geolocație a fost refuzată';
              break;
            case error.POSITION_UNAVAILABLE:
              msg = 'Informațiile despre locație nu sunt disponibile';
              break;
            case error.TIMEOUT:
              msg = 'Cererea de geolocație a expirat';
              break;
          }
          reject(new Error(msg));
        },
        options
      );
    });
  }

  // Watch rapid pentru actualizări; returnează watchId
  startWatch(
    onUpdate: (loc: UserLocation) => void,
    onError?: (err: any) => void,
    highAccuracy = false
  ): number | null {
    if (!this.isSupported()) return null;
    const options: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      maximumAge: 300000,
      timeout: 8000,
    };
    this.activeWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: UserLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        };
        this.currentLocation = loc;
        onUpdate(loc);
      },
      (err) => {
        if (onError) onError(err);
      },
      options
    );
    return this.activeWatchId;
  }

  stopWatch(id?: number | null) {
    const target = id ?? this.activeWatchId;
    if (typeof target === 'number') {
      navigator.geolocation.clearWatch(target);
      if (this.activeWatchId === target) this.activeWatchId = null;
    }
  }

  // Obține locația din cache sau o cere din nou
  async getLocation(): Promise<UserLocation> {
    if (this.currentLocation && Date.now() - this.currentLocation.timestamp < 5 * 60 * 1000) {
      return this.currentLocation;
    }
    return this.getCurrentPosition();
  }

  // Distanță Haversine (km)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Găsește cea mai apropiată locație de pescuit
  findNearestFishingLocation(
    userLat: number,
    userLon: number,
    locations: Array<{ coords: [number, number] }>
  ): { index: number; distance: number } | null {
    if (locations.length === 0) return null;
    let nearestIndex = 0;
    let nearestDistance = this.calculateDistance(
      userLat,
      userLon,
      locations[0].coords[0],
      locations[0].coords[1]
    );
    for (let i = 1; i < locations.length; i++) {
      const distance = this.calculateDistance(
        userLat,
        userLon,
        locations[i].coords[0],
        locations[i].coords[1]
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    return { index: nearestIndex, distance: nearestDistance };
  }

  getPermissionStatus(): LocationPermission {
    return { ...this.permissionStatus };
  }

  reset(): void {
    this.currentLocation = null;
    this.permissionStatus = { granted: false, denied: false, unavailable: false };
  }
}

export const geolocationService = new GeolocationService();

