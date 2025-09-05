// Simple catch-all API for local/dev usage

// In-memory stores (dev only)
const profiles = new Map()
const records = new Map()

const ok = (data, init = {}) => ({
  statusCode: 200,
  headers: cors(),
  body: JSON.stringify(data),
  ...init
})
const bad = (message, status = 400) => ({
  statusCode: status,
  headers: cors(),
  body: JSON.stringify({ success: false, error: message })
})
const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
})

const parseBody = async (event) => {
  if (!event.body) return null
  try {
    return JSON.parse(event.body)
  } catch {
    return null
  }
}

const parsePath = (path) => path.replace(/^\/api\//, '').split('/')

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: cors()
    }
  }

  const segments = parsePath(event.path)
  const method = event.httpMethod

  // /users/:id/profile
  if (segments[0] === 'users' && segments[2] === 'profile') {
    const userId = segments[1]
    if (method === 'GET') {
      const data = profiles.get(userId) || null
      return ok({ success: true, ... (data ? { data } : { data: null }) })
    }
    if (method === 'PUT') {
      const body = await parseBody(event)
      if (!body) return bad('Invalid JSON body', 400)
      profiles.set(userId, body)
      return ok({ success: true, data: body })
    }
    if (method === 'POST' && segments[3] === 'image') {
      // Not used but keep compatibility
      return ok({ success: true, data: { imageUrl: '' } })
    }
  }

  // /users/:id/records
  if (segments[0] === 'users' && segments[2] === 'records') {
    const userId = segments[1]
    if (method === 'GET') {
      const list = Array.from(records.values()).filter((r) => r.angler === userId)
      return ok({ success: true, data: list })
    }
  }

  // /records and /records/:id
  if (segments[0] === 'records') {
    if (method === 'POST') {
      const body = await parseBody(event)
      if (!body) return bad('Invalid JSON body', 400)
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
      const rec = { ...body, id }
      records.set(id, rec)
      return ok({ success: true, data: rec })
    }
    const id = segments[1]
    if (!id) return bad('Record ID required', 400)
    if (method === 'PUT') {
      const body = await parseBody(event)
      if (!body) return bad('Invalid JSON body', 400)
      const prev = records.get(id) || { id }
      const next = { ...prev, ...body }
      records.set(id, next)
      return ok({ success: true, data: next })
    }
    if (method === 'DELETE') {
      records.delete(id)
      return ok({ success: true })
    }
  }

  // /og - Open Graph Image Generator
  if (segments[0] === 'og') {
    if (method === 'GET') {
      const title = event.queryStringParameters?.title || 'Fish Trophy'
      const subtitle = event.queryStringParameters?.subtitle || 'Platforma Pescarilor din România'
      const domain = event.queryStringParameters?.domain || 'FishTrophy.ro'
      
      // Generate SVG image
      const svg = `
        <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
              <stop offset="50%" style="stop-color:#3b82f6;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#60a5fa;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#f0f9ff;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <!-- Background -->
          <rect width="1200" height="630" fill="url(#bg)"/>
          
          <!-- Decorative elements -->
          <circle cx="100" cy="100" r="60" fill="rgba(255,255,255,0.1)"/>
          <circle cx="1100" cy="530" r="80" fill="rgba(255,255,255,0.08)"/>
          <circle cx="200" cy="500" r="40" fill="rgba(255,255,255,0.06)"/>
          
          <!-- Fish icon -->
          <g transform="translate(50, 200)">
            <path d="M0,0 L80,20 L120,60 L100,100 L60,120 L20,100 L0,60 Z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
            <circle cx="20" cy="30" r="8" fill="rgba(255,255,255,0.4)"/>
            <path d="M60,40 Q80,50 100,40" stroke="rgba(255,255,255,0.3)" stroke-width="2" fill="none"/>
          </g>
          
          <!-- Trophy icon -->
          <g transform="translate(1000, 150)">
            <rect x="0" y="40" width="60" height="80" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
            <rect x="10" y="20" width="40" height="20" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
            <circle cx="30" cy="30" r="15" fill="rgba(255,255,255,0.3)"/>
          </g>
          
          <!-- Main content -->
          <text x="600" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="url(#textGrad)">${title}</text>
          <text x="600" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="rgba(255,255,255,0.9)">${subtitle}</text>
          
          <!-- Domain -->
          <text x="600" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.7)">${domain}</text>
          
          <!-- Decorative line -->
          <line x1="300" y1="350" x2="900" y2="350" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
          
          <!-- Bottom accent -->
          <rect x="0" y="580" width="1200" height="50" fill="rgba(0,0,0,0.1)"/>
        </svg>
      `
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=3600',
          ...cors()
        },
        body: svg
      }
    }
  }

  return bad('Not found', 404)
}

