export const handler = async (event) => {
  try {
    // Extract parameters from both /api/og and /api/og.png
    const { title = 'Fish Trophy', subtitle = 'Platforma Pescarilor din România', domain = 'fishtrophy.ro' } = event.queryStringParameters || {};

    // Generate beautiful centered Open Graph image
    const svgContent = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Beautiful gradient background -->
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#f1f5f9;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
          </linearGradient>
          
          <!-- Title gradient -->
          <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#4f46e5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
          </linearGradient>
          
          <!-- Card gradient -->
          <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
          </linearGradient>
          
          <!-- Icon gradient -->
          <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#2563eb;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#4f46e5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
          </linearGradient>
          
          <!-- Shadow filter -->
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.1"/>
          </filter>
          
          <!-- Glow effect -->
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bgGradient)"/>
        
        <!-- Main container with shadow -->
        <rect x="100" y="80" width="1000" height="470" rx="24" fill="url(#cardGradient)" filter="url(#shadow)"/>
        
        <!-- Icon centered at top -->
        <g transform="translate(600, 150)">
          <circle cx="0" cy="0" r="50" fill="url(#iconGradient)"/>
          <!-- Trophy icon -->
          <g transform="translate(0, 0)">
            <path d="M-12 -15 L-8 -18 L-4 -15 L0 -18 L4 -15 L8 -18 L12 -15 L10 -8 L6 0 L3 3 L0 5 L-3 3 L-6 0 L-10 -8 Z" fill="#ffffff"/>
            <circle cx="0" cy="-3" r="2" fill="#ffffff"/>
            <path d="M-6 -3 L-4 -1 L-6 1 M6 -3 L4 -1 L6 1" stroke="#ffffff" stroke-width="1.5" fill="none"/>
          </g>
        </g>
        
        <!-- Title centered -->
        <text x="600" y="250" text-anchor="middle" fill="url(#titleGradient)" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="800" letter-spacing="-0.02em" filter="url(#glow)">
          ${title}
        </text>
        
        <!-- Subtitle centered -->
        <text x="600" y="320" text-anchor="middle" fill="#374151" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="600">
          ${subtitle}
        </text>
        
        <!-- Domain centered -->
        <text x="600" y="370" text-anchor="middle" fill="#6b7280" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="500">
          ${domain}
        </text>
        
        <!-- Footer text centered -->
        <text x="600" y="500" text-anchor="middle" fill="#9ca3af" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="400">
          Făcut cu <tspan fill="#ef4444">❤️</tspan> în România
        </text>
      </svg>
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
      body: svgContent,
    };
  } catch (error) {
    console.error('Error generating OG image:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate image' }),
    };
  }
};
