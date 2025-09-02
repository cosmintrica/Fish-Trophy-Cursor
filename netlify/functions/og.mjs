export const handler = async (event) => {
  try {
    const { title = 'Fish Trophy', subtitle = 'Platforma Pescarilor din România', domain = 'fishtrophy.ro' } = event.queryStringParameters || {};

    // Generate SVG-based Open Graph image with beautiful design
    const svgContent = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="bubble" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f1f5f9;stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000000" flood-opacity="0.1"/>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- Decorative elements -->
        <circle cx="100" cy="100" r="60" fill="#3b82f6" opacity="0.1"/>
        <circle cx="1100" cy="530" r="80" fill="#10b981" opacity="0.1"/>
        <circle cx="200" cy="500" r="40" fill="#f59e0b" opacity="0.1"/>
        
        <!-- Main content bubble -->
        <rect x="200" y="140" width="800" height="350" rx="24" fill="url(#bubble)" filter="url(#shadow)" stroke="#e2e8f0" stroke-width="1"/>
        
        <!-- Fish Icon (using icon_free style) -->
        <g transform="translate(500, 200)">
          <circle cx="0" cy="0" r="50" fill="#3b82f6" opacity="0.1"/>
          <g transform="translate(-25, -25)">
            <path d="M10 20C10 20 15 10 30 10C45 10 50 20 50 20C50 20 45 30 30 30C15 30 10 20 10 20Z" fill="#3b82f6"/>
            <circle cx="37" cy="17" r="2" fill="white"/>
            <path d="M7 20L12 17L12 23L7 20Z" fill="#1e40af"/>
            <path d="M42 15L52 12L47 20L52 28L42 25" fill="#1e40af" stroke="#1e40af" stroke-width="1"/>
          </g>
        </g>
        
        <!-- Title with homepage-style design -->
        <text x="600" y="320" text-anchor="middle" fill="#1e293b" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="48" font-weight="700" letter-spacing="-0.02em">
          ${title}
        </text>
        
        <!-- Subtitle -->
        <text x="600" y="360" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="500">
          ${subtitle}
        </text>
        
        <!-- Domain in small bubble -->
        <rect x="500" y="400" width="200" height="40" rx="20" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="1"/>
        <text x="600" y="425" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500">
          ${domain}
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
