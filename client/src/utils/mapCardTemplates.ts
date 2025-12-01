// Helper functions to generate HTML for different map location cards
// Used in Home.tsx for map popups

export interface MapCardData {
  id: string;
  name: string;
  coords: [number, number];
  [key: string]: any;
}

// Common helper to escape HTML
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Common helper for close button
const getCloseButton = (): string => {
  return `
    <button class="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all duration-200 hover:rotate-90 z-20 cursor-pointer" onclick="this.closest('.maplibregl-popup').remove()">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  `;
};

// Common helper for Google/Apple Maps links
const getMapLinks = (coords: [number, number], isMobile: boolean): string => {
  const [lng, lat] = coords;
  const padding = isMobile ? 'px-2 py-1.5' : 'px-3 py-2';
  const iconSize = isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const textSize = isMobile ? 'text-xs' : 'text-xs';
  
  return `
    <div class="flex gap-2 ${isMobile ? 'pt-2 border-t border-gray-100' : 'pt-3 border-t border-gray-100'}">
      <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 ${padding} rounded-lg ${textSize} font-medium transition-colors border border-gray-200 shadow-sm hover:shadow">
        <svg class="${iconSize}" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        Google Maps
      </a>
      <a href="https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d" target="_blank" rel="noopener noreferrer" class="flex-1 flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 ${padding} rounded-lg ${textSize} font-medium transition-colors border border-gray-200 shadow-sm hover:shadow">
        <svg class="${iconSize}" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        Apple Maps
      </a>
    </div>
  `;
};

// Common helper for contact info (website, phone)
const getContactInfo = (data: any, isMobile: boolean): string => {
  if (!data.website && !data.phone) return '';
  
  const iconSize = isMobile ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = isMobile ? 'text-xs' : 'text-sm';
  const gap = isMobile ? 'gap-1.5' : 'gap-2';
  const spacing = isMobile ? 'space-y-1.5' : 'space-y-2';
  const margin = isMobile ? 'mb-3' : 'mb-4';
  
  return `
    <div class="${margin} ${spacing}">
      ${data.website ? `
        <div class="flex items-center ${gap} ${textSize}">
          <svg class="${iconSize} text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
          </svg>
          <a href="${data.website.startsWith('http') ? data.website : 'https://' + data.website}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 truncate">${data.website.replace(/^https?:\/\//, '')}</a>
        </div>
      ` : ''}
      ${data.phone ? `
        <div class="flex items-center ${gap} ${textSize}">
          <svg class="${iconSize} text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
          <a href="tel:${data.phone}" class="text-blue-600 hover:text-blue-800">${escapeHtml(data.phone)}</a>
        </div>
      ` : ''}
    </div>
  `;
};

// Shop Card Template
export const generateShopCard = (shop: any, isMobile: boolean): string => {
  const padding = isMobile ? 'p-4' : 'p-5';
  const minWidth = isMobile ? 'min-w-[200px] max-w-[240px]' : 'min-w-[320px] max-w-[380px]';
  const titleSize = isMobile ? 'text-sm' : 'text-xl';
  const iconSize = isMobile ? 'text-lg' : 'text-2xl';
  const textSize = isMobile ? 'text-xs' : 'text-sm';
  const margin = isMobile ? 'mb-3' : 'mb-4';
  
  const rating = shop.rating || 0;
  const reviewCount = shop.review_count || 0;
  const services = shop.services || [];
  
  return `
    <div class="${padding} ${minWidth} bg-white ${isMobile ? 'rounded-xl' : 'rounded-2xl'} shadow-xl border border-gray-100 relative">
      ${getCloseButton()}
      
      <div class="${margin}">
        <h3 class="font-bold ${titleSize} text-gray-800 ${isMobile ? 'mb-1' : 'mb-2'} flex items-start gap-2">
          <span class="${iconSize} flex-shrink-0">🏪</span>
          <span class="break-words">${escapeHtml(shop.name)}</span>
        </h3>
        <p class="${textSize} text-gray-500">${escapeHtml(shop.address)}, ${escapeHtml(shop.city)}</p>
        <p class="${textSize} text-gray-500">${escapeHtml(shop.county)}, ${shop.region.charAt(0).toUpperCase() + shop.region.slice(1)}</p>
      </div>

      ${rating > 0 ? `
        <div class="${margin} flex items-center gap-2">
          <div class="flex items-center">
            ${Array.from({ length: 5 }, (_, i) => 
              i < Math.floor(rating) ? '⭐' : '☆'
            ).join('')}
          </div>
          <span class="${textSize} text-gray-600">${rating.toFixed(1)}</span>
          ${reviewCount > 0 ? `<span class="${textSize} text-gray-500">(${reviewCount} ${reviewCount === 1 ? 'recenzie' : 'recenzii'})</span>` : ''}
        </div>
      ` : ''}

      ${shop.description ? `
        <div class="${margin}">
          <p class="${textSize} text-gray-600 leading-relaxed ${isMobile ? 'line-clamp-2' : 'line-clamp-3'}">${escapeHtml(shop.description)}</p>
        </div>
      ` : ''}

      ${services.length > 0 ? `
        <div class="${margin}">
          <p class="${textSize} font-semibold text-gray-700 mb-1">Servicii:</p>
          <div class="flex flex-wrap gap-1">
            ${services.map((service: string) => `
              <span class="inline-block ${textSize} px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">${escapeHtml(service)}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${shop.opening_hours ? `
        <div class="${margin}">
          <p class="${textSize} font-semibold text-gray-700">Program:</p>
          <p class="${textSize} text-gray-600">${escapeHtml(shop.opening_hours)}</p>
        </div>
      ` : ''}

      ${getContactInfo(shop, isMobile)}

      ${getMapLinks(shop.coords, isMobile)}
    </div>
  `;
};

// AJVPS Office Card Template
export const generateAJVPSOfficeCard = (office: any, isMobile: boolean): string => {
  const padding = isMobile ? 'p-4' : 'p-5';
  const minWidth = isMobile ? 'min-w-[200px] max-w-[240px]' : 'min-w-[320px] max-w-[380px]';
  const titleSize = isMobile ? 'text-sm' : 'text-xl';
  const iconSize = isMobile ? 'text-lg' : 'text-2xl';
  const textSize = isMobile ? 'text-xs' : 'text-sm';
  const margin = isMobile ? 'mb-3' : 'mb-4';
  
  const officeIcons: Record<string, string> = {
    'ajvps': '🏛️',
    'primarie': '🏢',
    'agentie': '📋',
    'institutie': '🏛️'
  };
  
  const officeNames: Record<string, string> = {
    'ajvps': 'Birou AJVPS',
    'primarie': 'Primărie',
    'agentie': 'Agenție',
    'institutie': 'Instituție'
  };
  
  const icon = officeIcons[office.office_type] || '🏛️';
  const typeName = officeNames[office.office_type] || office.office_type;
  const services = office.services || [];
  
  return `
    <div class="${padding} ${minWidth} bg-white ${isMobile ? 'rounded-xl' : 'rounded-2xl'} shadow-xl border border-gray-100 relative">
      ${getCloseButton()}
      
      <div class="${margin}">
        <h3 class="font-bold ${titleSize} text-gray-800 ${isMobile ? 'mb-1' : 'mb-2'} flex items-start gap-2">
          <span class="${iconSize} flex-shrink-0">${icon}</span>
          <span class="break-words">${escapeHtml(office.name)}</span>
        </h3>
        <p class="${textSize} text-gray-600 mb-1">${typeName}</p>
        <p class="${textSize} text-gray-500">${escapeHtml(office.address)}, ${escapeHtml(office.city)}</p>
        <p class="${textSize} text-gray-500">${escapeHtml(office.county)}, ${office.region.charAt(0).toUpperCase() + office.region.slice(1)}</p>
      </div>

      ${office.description ? `
        <div class="${margin}">
          <p class="${textSize} text-gray-600 leading-relaxed ${isMobile ? 'line-clamp-2' : 'line-clamp-3'}">${escapeHtml(office.description)}</p>
        </div>
      ` : ''}

      ${services.length > 0 ? `
        <div class="${margin}">
          <p class="${textSize} font-semibold text-gray-700 mb-1">Servicii:</p>
          <div class="flex flex-wrap gap-1">
            ${services.map((service: string) => `
              <span class="inline-block ${textSize} px-2 py-0.5 bg-pink-50 text-pink-700 rounded-md">${escapeHtml(service)}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${office.opening_hours ? `
        <div class="${margin}">
          <p class="${textSize} font-semibold text-gray-700">Program:</p>
          <p class="${textSize} text-gray-600">${escapeHtml(office.opening_hours)}</p>
        </div>
      ` : ''}

      ${getContactInfo(office, isMobile)}

      ${getMapLinks(office.coords, isMobile)}
    </div>
  `;
};

// Accommodation Card Template
export const generateAccommodationCard = (accommodation: any, isMobile: boolean): string => {
  const padding = isMobile ? 'p-4' : 'p-5';
  const minWidth = isMobile ? 'min-w-[200px] max-w-[240px]' : 'min-w-[320px] max-w-[380px]';
  const titleSize = isMobile ? 'text-sm' : 'text-xl';
  const iconSize = isMobile ? 'text-lg' : 'text-2xl';
  const textSize = isMobile ? 'text-xs' : 'text-sm';
  const margin = isMobile ? 'mb-3' : 'mb-4';
  
  const accommodationIcons: Record<string, string> = {
    'pensiune': '🏨',
    'complex': '🏖️',
    'cazare': '🏡',
    'hotel': '🏨',
    'vila': '🏡'
  };
  
  const accommodationNames: Record<string, string> = {
    'pensiune': 'Pensiune',
    'complex': 'Complex',
    'cazare': 'Cazare',
    'hotel': 'Hotel',
    'vila': 'Vilă'
  };
  
  const icon = accommodationIcons[accommodation.accommodation_type] || '🏨';
  const typeName = accommodationNames[accommodation.accommodation_type] || accommodation.accommodation_type;
  const rating = accommodation.rating || 0;
  const reviewCount = accommodation.review_count || 0;
  const facilities = accommodation.facilities || [];
  const hasPond = accommodation.has_fishing_pond || false;
  
  return `
    <div class="${padding} ${minWidth} bg-white ${isMobile ? 'rounded-xl' : 'rounded-2xl'} shadow-xl border border-gray-100 relative">
      ${getCloseButton()}
      
      <div class="${margin}">
        <h3 class="font-bold ${titleSize} text-gray-800 ${isMobile ? 'mb-1' : 'mb-2'} flex items-start gap-2">
          <span class="${iconSize} flex-shrink-0">${icon}</span>
          <span class="break-words">${escapeHtml(accommodation.name)}</span>
        </h3>
        <p class="${textSize} text-gray-600 mb-1">${typeName}</p>
        <p class="${textSize} text-gray-500">${escapeHtml(accommodation.address)}, ${escapeHtml(accommodation.city)}</p>
        <p class="${textSize} text-gray-500">${escapeHtml(accommodation.county)}, ${accommodation.region.charAt(0).toUpperCase() + accommodation.region.slice(1)}</p>
      </div>

      ${hasPond ? `
        <div class="${margin} p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <p class="${textSize} text-green-800 font-semibold">🎣 Are balta de pescuit</p>
        </div>
      ` : ''}

      ${rating > 0 ? `
        <div class="${margin} flex items-center gap-2">
          <div class="flex items-center">
            ${Array.from({ length: 5 }, (_, i) => 
              i < Math.floor(rating) ? '⭐' : '☆'
            ).join('')}
          </div>
          <span class="${textSize} text-gray-600">${rating.toFixed(1)}</span>
          ${reviewCount > 0 ? `<span class="${textSize} text-gray-500">(${reviewCount} ${reviewCount === 1 ? 'recenzie' : 'recenzii'})</span>` : ''}
        </div>
      ` : ''}

      ${accommodation.description ? `
        <div class="${margin}">
          <p class="${textSize} text-gray-600 leading-relaxed ${isMobile ? 'line-clamp-2' : 'line-clamp-3'}">${escapeHtml(accommodation.description)}</p>
        </div>
      ` : ''}

      ${facilities.length > 0 ? `
        <div class="${margin}">
          <p class="${textSize} font-semibold text-gray-700 mb-1">Facilități:</p>
          <div class="flex flex-wrap gap-1">
            ${facilities.map((facility: string) => `
              <span class="inline-block ${textSize} px-2 py-0.5 bg-orange-50 text-orange-700 rounded-md">${escapeHtml(facility)}</span>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${accommodation.fishing_location_id ? `
        <div class="${margin}">
          <p class="${textSize} text-gray-600">📍 Lângă o locație de pescuit</p>
        </div>
      ` : ''}

      ${getContactInfo(accommodation, isMobile)}

      ${accommodation.website ? `
        <div class="${margin}">
          <a href="${accommodation.website.startsWith('http') ? accommodation.website : 'https://' + accommodation.website}" target="_blank" rel="noopener noreferrer" class="inline-block w-full ${isMobile ? 'px-2 py-1' : 'px-3 py-1.5'} bg-orange-500 hover:bg-orange-600 text-white rounded-lg ${textSize} font-medium text-center transition-colors">
            Rezervă acum
          </a>
        </div>
      ` : ''}

      ${getMapLinks(accommodation.coords, isMobile)}
    </div>
  `;
};

