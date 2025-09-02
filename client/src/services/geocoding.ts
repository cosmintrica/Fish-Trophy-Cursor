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
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=ro`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }
      
      const data = await response.json();
      
      if (data && data.display_name) {
        // Extrage doar partea relevantă a adresei
        const address = this.formatAddress(data);
        return address;
      }
      
      return 'Adresa nu a putut fi determinată';
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
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