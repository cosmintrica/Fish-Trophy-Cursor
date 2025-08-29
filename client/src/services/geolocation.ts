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
    unavailable: false
  };

  /**
   * Verifică dacă geolocația este disponibilă
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Cere permisiunea pentru geolocație
   */
  async requestPermission(): Promise<LocationPermission> {
    if (!this.isSupported()) {
      this.permissionStatus.unavailable = true;
      return this.permissionStatus;
    }

    try {
      // Încearcă să obții locația curentă
      await this.getCurrentPosition();
      this.permissionStatus.granted = true;
      return this.permissionStatus;
    } catch (error: any) {
      if (error.code === 1) {
        this.permissionStatus.denied = true;
      } else {
        this.permissionStatus.unavailable = true;
      }
      return this.permissionStatus;
    }
  }

  /**
   * Obține locația curentă a utilizatorului
   */
  async getCurrentPosition(): Promise<UserLocation> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocația nu este suportată de acest browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Cache pentru 1 minut
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };

          this.currentLocation = location;
          resolve(location);
        },
        (error) => {
          let errorMessage = 'Eroare la obținerea locației';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permisiunea pentru geolocație a fost refuzată';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Informațiile despre locație nu sunt disponibile';
              break;
            case error.TIMEOUT:
              errorMessage = 'Cererea de geolocație a expirat';
              break;
          }

          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  /**
   * Obține locația curentă din cache sau cere una nouă
   */
  async getLocation(): Promise<UserLocation> {
    // Dacă avem o locație recentă (mai nouă de 5 minute), o returnăm
    if (this.currentLocation && 
        Date.now() - this.currentLocation.timestamp < 5 * 60 * 1000) {
      return this.currentLocation;
    }

    // Altfel, cerem o locație nouă
    return this.getCurrentPosition();
  }

  /**
   * Calculează distanța între două puncte (formula Haversine)
   */
  calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371; // Raza Pământului în km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distanța în km
    
    return Math.round(distance * 100) / 100; // Rotunjit la 2 zecimale
  }

  /**
   * Convertește grade în radiani
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Găsește cea mai apropiată locație de pescuit
   */
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

    return {
      index: nearestIndex,
      distance: nearestDistance
    };
  }

  /**
   * Obține statusul curent al permisiunilor
   */
  getPermissionStatus(): LocationPermission {
    return { ...this.permissionStatus };
  }

  /**
   * Resetează serviciul
   */
  reset(): void {
    this.currentLocation = null;
    this.permissionStatus = {
      granted: false,
      denied: false,
      unavailable: false
    };
  }
}

export const geolocationService = new GeolocationService();
