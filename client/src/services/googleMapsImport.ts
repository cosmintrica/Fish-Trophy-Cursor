// Service for importing location data from Google Maps URLs

interface GoogleMapsLocationData {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  county?: string;
  region?: string;
}

/**
 * Extracts coordinates from various Google Maps URL formats
 */
export const extractCoordinatesFromUrl = async (url: string): Promise<{ lat: number; lng: number; name?: string } | null> => {
  try {
    // Handle short URLs (goo.gl, maps.app.goo.gl) - use a proxy service to get the full URL
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      try {
        // Use a public URL expander service (no CORS issues)
        const expandResponse = await fetch(`https://api.unshorten.me/json?shortURL=${encodeURIComponent(url)}`);
        if (expandResponse.ok) {
          const expandData = await expandResponse.json();
          if (expandData.resolvedURL) {
            url = expandData.resolvedURL;
          }
        }
      } catch (expandError) {
        // If expansion fails, try to extract from URL patterns that might be in the short URL
        console.warn('Could not expand short URL, trying direct extraction');
      }
    }

    // Extract coordinates from various Google Maps URL formats
    // First, try to extract name from /place/Name+Name/@ (if present)
    let extractedName: string | undefined;
    const placeMatch = url.match(/\/place\/([^/@]+?)(?:\/|@)/);
    if (placeMatch && placeMatch[1]) {
      extractedName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ').trim());
      // Clean up name - remove any trailing special chars
      extractedName = extractedName.replace(/[\/\?&#].*$/, '').trim();
    }
    
    // PRIORITY 1: Extract PRECISE coordinates from !3d and !4d format (most accurate)
    // Format: !8m2!3d44.4227421!4d24.3619634 (3d = latitude, 4d = longitude)
    const preciseCoordMatch = url.match(/!3d(-?\d+\.?\d*)(?:!|&|$)/);
    const preciseLngMatch = url.match(/!4d(-?\d+\.?\d*)(?:!|&|$)/);
    if (preciseCoordMatch && preciseLngMatch) {
      return {
        lat: parseFloat(preciseCoordMatch[1]),
        lng: parseFloat(preciseLngMatch[1]),
        name: extractedName || undefined
      };
    }
    
    // PRIORITY 2: Extract coordinates from @lat,lng pattern (works for both /@lat,lng and /place/Name/@lat,lng)
    // Capture ALL decimal places - no truncation
    const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordMatch) {
      return {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2]),
        name: extractedName || undefined
      };
    }

    // Format 3: https://www.google.com/maps?q=lat,lng
    const match3 = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match3) {
      return {
        lat: parseFloat(match3[1]),
        lng: parseFloat(match3[2])
      };
    }

    // Format 4: https://maps.google.com/?ll=lat,lng
    const match4 = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match4) {
      return {
        lat: parseFloat(match4[1]),
        lng: parseFloat(match4[2])
      };
    }

    // For short URLs that couldn't be expanded, throw helpful error
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      throw new Error('Link-urile scurte Google Maps nu pot fi procesate automat. Te rugăm să deschizi link-ul în browser și să copiezi link-ul complet (lung) din bara de adrese.');
    }

    return null;
  } catch (error) {
    console.error('Error extracting coordinates from URL:', error);
    return null;
  }
};

/**
 * Scrapes Google Maps page to extract website, phone, and other details
 * Uses a CORS proxy to bypass CORS restrictions
 */
const scrapeGoogleMapsPage = async (url: string): Promise<{ website?: string; phone?: string; name?: string }> => {
  try {
    // Try multiple CORS proxy services as fallback
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    ];

    let html: string | null = null;
    let lastError: Error | null = null;

    // Try each proxy until one works
    for (const proxyUrl of proxies) {
      try {
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });
        
        if (response.ok) {
          // Different proxies return different formats
          if (proxyUrl.includes('allorigins.win')) {
            const data = await response.json();
            html = data.contents || '';
          } else if (proxyUrl.includes('corsproxy.io')) {
            html = await response.text();
          } else if (proxyUrl.includes('codetabs.com')) {
            html = await response.text();
          } else {
            // Try JSON first, then text
            try {
              const data = await response.json();
              html = data.contents || data || '';
            } catch {
              html = await response.text();
            }
          }
          if (html && html.length > 100) break; // Valid HTML should be longer
        }
      } catch (err: any) {
        lastError = err;
        continue; // Try next proxy
      }
    }

    if (!html) {
      throw lastError || new Error('All CORS proxies failed');
    }

    let website: string | undefined;
    let phone: string | undefined;

    // Method 1: Extract from inline JSON data (Google Maps uses this)
    try {
      // Google Maps embeds data in arrays like [null,null,null,null,null,null,null,null,null,null,"https://website.com"]
      const jsonDataMatches = html.match(/\[null,null,null,null,null,null,null,null,null,null,"([^"]+)"/);
      if (jsonDataMatches && jsonDataMatches[1] && jsonDataMatches[1].startsWith('http')) {
        website = jsonDataMatches[1];
      }

      // Also try to find JSON-LD structured data
      const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
      if (jsonLdMatches) {
        for (const match of jsonLdMatches) {
          try {
            const jsonData = JSON.parse(match.replace(/<script[^>]*>|<\/script>/gi, ''));
            if (jsonData.url && jsonData.url.startsWith('http')) {
              website = jsonData.url;
            }
            if (jsonData.telephone) {
              phone = jsonData.telephone;
            }
            // Also check nested structures
            if (jsonData['@graph']) {
              for (const item of jsonData['@graph']) {
                if (item.url && item.url.startsWith('http') && !website) {
                  website = item.url;
                }
                if (item.telephone && !phone) {
                  phone = item.telephone;
                }
              }
            }
          } catch (e) {
            // Continue if JSON parse fails
          }
        }
      }
    } catch (e) {
      // Continue with regex patterns
    }

    // Method 2: Extract from HTML structure (Google Maps specific)
    if (!website) {
      // Pattern for: <a class="CsEnBe" ... aria-label="Website: zagazaga.ro" href="https://zagazaga.ro/">
      const websiteMatch = html.match(/aria-label="Website:\s*([^"]+)"[^>]*href="(https?:\/\/[^"]+)"/i);
      if (websiteMatch && websiteMatch[2]) {
        website = websiteMatch[2];
      } else {
        // Fallback patterns
        const websitePatterns = [
          /href="(https?:\/\/[^"]+)"[^>]*aria-label="[^"]*website[^"]*"/i,
          /aria-label="Website:\s*([^"]+)"[^>]*href="(https?:\/\/[^"]+)"/i,
          /"website":"([^"]+)"/i,
          /data-value="(https?:\/\/[^"]+)"[^>]*>.*Website/i,
          /href="(https?:\/\/[^"]+)"[^>]*>.*Website/i,
          /"url":"(https?:\/\/[^"]+)"/i,
        ];

        for (const pattern of websitePatterns) {
          const match = html.match(pattern);
          if (match) {
            const url = match[2] || match[1];
            if (url && url.startsWith('http')) {
              website = url;
              break;
            }
          }
        }
      }
    }

    // Method 2: Extract phone from HTML structure (Google Maps specific)
    if (!phone) {
      // Pattern for: aria-label="Phone: 0786 574 809" or data-item-id="phone:tel:0786574809"
      const phoneMatch1 = html.match(/aria-label="Phone:\s*([^"]+)"[^>]*data-item-id="phone:tel:([^"]+)"/i);
      if (phoneMatch1) {
        phone = phoneMatch1[1] || phoneMatch1[2];
        phone = phone.replace(/^tel:/i, '').trim();
      } else {
        // Pattern for: <div class="Io6YTe ...">0786 574 809</div> inside phone button
        const phoneMatch2 = html.match(/data-item-id="phone:tel:([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*Io6YTe[^"]*"[^>]*>([^<]+)<\/div>/i);
        if (phoneMatch2) {
          phone = phoneMatch2[2] || phoneMatch2[1];
          phone = phone.replace(/^tel:/i, '').trim();
        } else {
          // Fallback patterns
          const phonePatterns = [
            /data-item-id="phone:tel:([^"]+)"/i,
            /tel:([+\d\s\-()]+)/i,
            /"phone":"([^"]+)"/i,
            /"telephone":"([^"]+)"/i,
            /aria-label="Phone:\s*([^"]+)"/i,
            /data-value="([+\d\s\-()]+)"[^>]*aria-label="[^"]*phone[^"]*"/i,
            /\+40\s?\d{2,3}\s?\d{3}\s?\d{3,4}/g,
            /\+?\d{1,4}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{1,4}[\s\-]?\d{1,9}/g,
          ];

          for (const pattern of phonePatterns) {
            const matches = html.match(pattern);
            if (matches) {
              phone = matches[1] || matches[0];
              phone = phone.replace(/^tel:/i, '').trim();
              // Validate Romanian phone numbers
              if (phone.length >= 10 && (phone.startsWith('+40') || phone.startsWith('0'))) {
                break;
              } else if (phone.length >= 10) {
                break;
              }
            }
          }
        }
      }
    }

    // Clean up phone number
    if (phone) {
      phone = phone.replace(/^tel:/i, '').replace(/\s+/g, ' ').trim();
    }

    return { website, phone };
  } catch (error) {
    console.warn('Error scraping Google Maps page:', error);
    return {};
  }
};

/**
 * Gets location details using reverse geocoding (OpenStreetMap Nominatim)
 * This is free and doesn't require API keys
 */
export const getLocationDetailsFromCoordinates = async (
  lat: number,
  lng: number
): Promise<Partial<GoogleMapsLocationData>> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=ro&zoom=18`,
      {
        headers: {
          'User-Agent': 'FishTrophy/1.0 (https://fish-trophy.ro)',
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();
    
    // Extract county from address - try multiple fields
    let county = '';
    if (data.address) {
      // Try different possible fields for county
      county = data.address.county || 
               data.address.state_district || 
               data.address.region || 
               data.address.state || 
               '';
      
      // Clean up county name (remove "Județul" prefix if present)
      county = county.replace(/^Județul\s+/i, '').replace(/^County\s+/i, '').trim();
    }

    // Try to determine region from county (Romanian regions)
    const regionMap: Record<string, string> = {
      'București': 'muntenia',
      'Ilfov': 'muntenia',
      'Argeș': 'muntenia',
      'Dâmbovița': 'muntenia',
      'Prahova': 'muntenia',
      'Teleorman': 'muntenia',
      'Giurgiu': 'muntenia',
      'Călărași': 'muntenia',
      'Ialomița': 'muntenia',
      'Brăila': 'muntenia',
      'Buzău': 'muntenia',
      'Vrancea': 'muntenia',
      'Galați': 'moldova',
      'Vaslui': 'moldova',
      'Iași': 'moldova',
      'Botoșani': 'moldova',
      'Suceava': 'moldova',
      'Neamț': 'moldova',
      'Bacău': 'moldova',
      'Dolj': 'oltenia',
      'Gorj': 'oltenia',
      'Mehedinți': 'oltenia',
      'Olt': 'oltenia',
      'Vâlcea': 'oltenia',
      'Cluj': 'transilvania',
      'Alba': 'transilvania',
      'Brașov': 'transilvania',
      'Covasna': 'transilvania',
      'Harghita': 'transilvania',
      'Mureș': 'transilvania',
      'Sibiu': 'transilvania',
      'Bistrița-Năsăud': 'transilvania',
      'Sălaj': 'transilvania',
      'Timiș': 'banat',
      'Caraș-Severin': 'banat',
      'Arad': 'crisana',
      'Bihor': 'crisana',
      'Maramureș': 'maramures',
      'Satu Mare': 'maramures',
      'Constanța': 'dobrogea',
      'Tulcea': 'dobrogea',
    };

    let region = 'muntenia'; // default
    if (county) {
      const normalizedCounty = county.replace('Județul ', '').replace('County', '').trim();
      region = regionMap[normalizedCounty] || 'muntenia';
    }

    return {
      name: data.display_name?.split(',')[0] || '',
      address: data.display_name || '',
      county: county,
      region: region,
      latitude: lat,
      longitude: lng,
    };
  } catch (error) {
    console.error('Error getting location details:', error);
    return {
      latitude: lat,
      longitude: lng,
    };
  }
};

/**
 * Main function to import location from Google Maps URL
 */
export const importLocationFromGoogleMaps = async (
  url: string
): Promise<Partial<GoogleMapsLocationData> | null> => {
  try {
    console.log('🔍 Importing from Google Maps URL:', url);
    
    // Extract coordinates and place name
    const coords = await extractCoordinatesFromUrl(url);
    if (!coords) {
      throw new Error('Nu s-au putut extrage coordonatele din link');
    }
    
    console.log('✅ Extracted coordinates:', coords);

    // Get location details using reverse geocoding (this should always work)
    let details: Partial<GoogleMapsLocationData> = {};
    try {
      details = await getLocationDetailsFromCoordinates(coords.lat, coords.lng);
      console.log('✅ Reverse geocoding result:', details);
    } catch (geocodeError) {
      console.warn('⚠️ Reverse geocoding failed, continuing with coordinates only:', geocodeError);
      details = {
        latitude: coords.lat,
        longitude: coords.lng,
      };
    }

    // Scrape Google Maps page for website and phone (only for full URLs, not short ones)
    // This is optional - if it fails, we continue with what we have
    let scrapedData: { website?: string; phone?: string; name?: string } = {};
    if (!url.includes('goo.gl') && !url.includes('maps.app.goo.gl')) {
      try {
        scrapedData = await scrapeGoogleMapsPage(url);
        console.log('✅ Scraped data:', scrapedData);
      } catch (scrapeError) {
        console.warn('⚠️ Could not scrape Google Maps page (continuing anyway):', scrapeError);
        // Continue without scraped data - this is not critical
      }
    }

    // Use place name from URL if available (more accurate than reverse geocoding)
    // Priority: URL name > scraped name > reverse geocoding name
    const finalName = coords.name || scrapedData.name || details.name || '';
    
    const result = {
      ...details,
      name: finalName, // Prefer name from URL, then scraped, then reverse geocoding
      latitude: coords.lat,
      longitude: coords.lng,
      website: scrapedData.website || details.website,
      phone: scrapedData.phone || details.phone,
    };
    
    console.log('✅ Final import result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error importing from Google Maps:', error);
    throw error;
  }
};

