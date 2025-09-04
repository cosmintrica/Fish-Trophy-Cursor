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

  return bad('Not found', 404)
}

