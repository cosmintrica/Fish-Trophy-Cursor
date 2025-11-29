export const handler = async (event) => {
  try {
    // Extract parameters from both /api/og and /api/og.png
    const { title = 'Fish Trophy', subtitle = 'Platforma Pescarilor din România', domain = 'fishtrophy.ro' } = event.queryStringParameters || {};

    // Decode URL-encoded parameters
    const decodedTitle = decodeURIComponent(title);
    const decodedSubtitle = decodeURIComponent(subtitle);
    const decodedDomain = decodeURIComponent(domain);

    // Generate beautiful professional Open Graph image with modern design
    const svgContent = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Beautiful gradient background -->
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#764ba2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f093fb;stop-opacity:1" />
          </linearGradient>
          
          <!-- Title gradient -->
          <linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
          
          <!-- Card gradient with subtle shadow -->
          <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
          </linearGradient>
          
          <!-- Shadow filter for depth -->
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="#000000" flood-opacity="0.25"/>
          </filter>
          
          <!-- Glow effect for title -->
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <!-- Decorative pattern -->
          <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/>
          </pattern>
        </defs>
        
        <!-- Background with gradient -->
        <rect width="1200" height="630" fill="url(#bgGradient)"/>
        
        <!-- Decorative dots pattern -->
        <rect width="1200" height="630" fill="url(#dots)" opacity="0.3"/>
        
        <!-- Decorative circles for depth -->
        <circle cx="150" cy="150" r="100" fill="rgba(255,255,255,0.1)"/>
        <circle cx="1050" cy="480" r="120" fill="rgba(255,255,255,0.08)"/>
        <circle cx="250" cy="500" r="60" fill="rgba(255,255,255,0.06)"/>
        
        <!-- Main content card with shadow -->
        <rect x="150" y="100" width="900" height="430" rx="32" fill="url(#cardGradient)" filter="url(#shadow)"/>
        
        <!-- Fish emoji icon -->
        <text x="600" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="80" opacity="0.9">🐟</text>
        
        <!-- Trophy emoji icon (decorative) -->
        <text x="950" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="60" opacity="0.7">🏆</text>
        
        <!-- Title with gradient and glow -->
        <text x="600" y="280" text-anchor="middle" fill="url(#titleGradient)" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="64" font-weight="800" letter-spacing="-0.02em" filter="url(#glow)">
          ${decodedTitle}
        </text>
        
        <!-- Subtitle -->
        <text x="600" y="340" text-anchor="middle" fill="#374151" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="32" font-weight="600" letter-spacing="-0.01em">
          ${decodedSubtitle}
        </text>
        
        <!-- Domain badge -->
        <rect x="450" y="370" width="300" height="50" rx="25" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="2"/>
        <text x="600" y="400" text-anchor="middle" fill="#6b7280" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="24" font-weight="500" letter-spacing="0.05em">
          ${decodedDomain}
        </text>
        
        <!-- Footer text -->
        <text x="600" y="560" text-anchor="middle" fill="rgba(255,255,255,0.95)" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="20" font-weight="500">
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Failed to generate image' }),
    };
  }
};
