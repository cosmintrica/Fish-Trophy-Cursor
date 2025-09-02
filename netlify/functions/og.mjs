export const handler = async (event) => {
  try {
    const { title = 'Fish Trophy', subtitle = 'Platforma Pescarilor din România', domain = 'fishtrophy.ro' } = event.queryStringParameters || {};

    // Generate SVG-based Open Graph image with beautiful design
    const svgContent = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="bubble" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f1f5f9;stop-opacity:1" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="#000000" flood-opacity="0.15"/>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- Decorative elements -->
        <circle cx="80" cy="80" r="50" fill="#3b82f6" opacity="0.08"/>
        <circle cx="1120" cy="550" r="70" fill="#10b981" opacity="0.08"/>
        <circle cx="150" cy="450" r="35" fill="#f59e0b" opacity="0.08"/>
        
        <!-- Main content bubble with rounded corners and shadow -->
        <rect x="150" y="120" width="900" height="390" rx="32" fill="url(#bubble)" filter="url(#shadow)" stroke="#e2e8f0" stroke-width="2"/>
        
        <!-- Fish Icon (stylized like icon_free.png) -->
        <g transform="translate(600, 250)">
          <circle cx="0" cy="0" r="60" fill="#3b82f6" opacity="0.1"/>
          <g transform="translate(-30, -30)">
            <!-- Fish body -->
            <ellipse cx="30" cy="30" rx="35" ry="20" fill="#3b82f6"/>
            <!-- Fish tail -->
            <path d="M5 30L15 20L15 40L5 30Z" fill="#1e40af"/>
            <!-- Fish eye -->
            <circle cx="45" cy="25" r="4" fill="white"/>
            <circle cx="46" cy="24" r="2" fill="#1e40af"/>
            <!-- Fish fins -->
            <path d="M25 15L35 10L30 20L25 15Z" fill="#1e40af"/>
            <path d="M25 45L35 50L30 40L25 45Z" fill="#1e40af"/>
          </g>
        </g>
        
        <!-- Title with homepage-style design -->
        <text x="600" y="380" text-anchor="middle" fill="#1e293b" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="56" font-weight="800" letter-spacing="-0.03em">
          ${title}
        </text>
        
        <!-- Subtitle -->
        <text x="600" y="420" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="500">
          ${subtitle}
        </text>
        
        <!-- Domain in small rectangular bubble with rounded corners -->
        <rect x="450" y="450" width="300" height="50" rx="25" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="2"/>
        <text x="600" y="480" text-anchor="middle" fill="#64748b" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="600">
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
