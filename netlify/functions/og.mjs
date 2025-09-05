export const handler = async (event) => {
  try {
    const { title = 'Fish Trophy', subtitle = 'Platforma Pescarilor din România', domain = 'fishtrophy.ro' } = event.queryStringParameters || {};

    // Generate SVG-based Open Graph image with beautiful design
    const svgContent = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#1e293b;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#334155;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#1e40af;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#1e3a8a;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="subtitleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Background with gradient -->
        <rect width="1200" height="630" fill="url(#bgGradient)"/>
        
        <!-- Decorative elements -->
        <circle cx="100" cy="100" r="80" fill="#3b82f6" opacity="0.1"/>
        <circle cx="1100" cy="530" r="120" fill="#10b981" opacity="0.1"/>
        <circle cx="600" cy="150" r="60" fill="#8b5cf6" opacity="0.1"/>
        
        <!-- Fishing hook icon -->
        <path d="M200 200 L220 180 L240 200 L260 180 L280 200 L300 180 L320 200 L340 180 L360 200 L380 180 L400 200 L420 180 L440 200 L460 180 L480 200 L500 180 L520 200 L540 180 L560 200 L580 180 L600 200 L620 180 L640 200 L660 180 L680 200 L700 180 L720 200 L740 180 L760 200 L780 180 L800 200 L820 180 L840 200 L860 180 L880 200 L900 180 L920 200 L940 180 L960 200 L980 180 L1000 200 L1020 180 L1040 200 L1060 180 L1080 200 L1100 180 L1120 200 L1140 180 L1160 200 L1180 180 L1200 200" stroke="#3b82f6" stroke-width="2" opacity="0.3"/>
        
        <!-- Main title -->
        <text x="600" y="280" text-anchor="middle" fill="url(#titleGradient)" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="84" font-weight="900" letter-spacing="-0.02em" filter="url(#glow)">
          ${title}
        </text>
        
        <!-- Subtitle -->
        <text x="600" y="340" text-anchor="middle" fill="url(#subtitleGradient)" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="600" letter-spacing="-0.01em">
          ${subtitle}
        </text>
        
        <!-- Domain -->
        <text x="600" y="400" text-anchor="middle" fill="#94a3b8" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="500">
          ${domain}
        </text>
        
        <!-- Decorative line -->
        <line x1="400" y1="450" x2="800" y2="450" stroke="#3b82f6" stroke-width="3" opacity="0.6"/>
        
        <!-- Fish icon -->
        <path d="M550 500 L600 480 L650 500 L600 520 Z" fill="#10b981" opacity="0.8"/>
        <circle cx="600" cy="500" r="8" fill="#ffffff"/>
        <path d="M580 490 L590 500 L580 510 M610 490 L620 500 L610 510" stroke="#10b981" stroke-width="2" fill="none"/>
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
