// Serviciu pentru reverse geocoding
export class GeocodingService {
  private static instance: GeocodingService;

  public static getInstance(): GeocodingService {
    if (!GeocodingService.instance) {
      GeocodingService.instance = new GeocodingService();
    }
    return GeocodingService.instance;
  }

  // Reverse geocoding folosind OpenStreetMap Nominatim
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      // Adaugă User-Agent header pentru a respecta policy-ul Nominatim
      const headers = {
        'User-Agent': 'FishTrophy/1.0 (https://fish-trophy.ro)',
        'Accept': 'application/json',
        'Accept-Language': 'ro,en;q=0.9'
      };

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=ro&zoom=18`,
        {
          method: 'GET',
          headers: headers,
          mode: 'cors'
        }
      );

      if (!response.ok) {
        console.error('Geocoding request failed:', response.status, response.statusText);
        throw new Error(`Geocoding request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Geocoding response:', data);

      if (data && data.display_name) {
        // Extrage doar partea relevantă a adresei
        const address = this.formatAddress(data);
        console.log('Formatted address:', address);
        return address;
      }

      console.warn('No display_name in geocoding response:', data);
      return 'Adresa nu a putut fi determinată';
    } catch (error) {
      console.error('Error in reverse geocoding:', error);

      // Încearcă cu o abordare alternativă pentru mobil
      if (navigator.userAgent.includes('Mobile')) {
        console.log('Mobile detected, trying alternative approach...');
        try {
          // Folosește o cerere mai simplă pentru mobil
          const simpleResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`,
            {
              method: 'GET',
              headers: {
                'User-Agent': 'FishTrophy-Mobile/1.0'
              }
            }
          );

          if (simpleResponse.ok) {
            const simpleData = await simpleResponse.json();
            if (simpleData && simpleData.display_name) {
              return simpleData.display_name;
            }
          }
        } catch (mobileError) {
          console.error('Mobile geocoding fallback failed:', mobileError);
        }
      }

      return 'Adresa nu a putut fi determinată';
    }
  }

  private formatAddress(data: { address?: Record<string, string> }): string {
    const address = data.address;
    if (!address) return 'Adresa nu a putut fi determinată';

    // Construiește adresa în ordinea dorită
    const parts = [];

    // Strada și numărul
    if (address.road) {
      let street = address.road;
      if (address.house_number) {
        street += ` ${address.house_number}`;
      }
      parts.push(street);
    }

    // Localitatea
    if (address.city || address.town || address.village) {
      parts.push(address.city || address.town || address.village);
    }

    // Județul
    if (address.county) {
      parts.push(address.county);
    }

    // Țara
    if (address.country) {
      parts.push(address.country);
    }

    return parts.join(', ');
  }
}

export const geocodingService = GeocodingService.getInstance();
