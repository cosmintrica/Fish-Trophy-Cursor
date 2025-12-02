// Fishing Locations API - Get fishing locations data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
});

const ok = (data, init = {}) => ({
  statusCode: 200,
  headers: {
    ...cors(),
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600'
  },
  body: JSON.stringify(data),
  ...init
});

const bad = (message, status = 400) => ({
  statusCode: status,
  headers: cors(),
  body: JSON.stringify({ success: false, error: message })
});

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: cors()
    };
  }

  const method = event.httpMethod;
  const pathSegments = event.path.replace(/^\/api\//, '').split('/');

  try {
    // GET /api/locations - List all fishing locations
    if (method === 'GET' && pathSegments[0] === 'locations') {
      const queryParams = event.queryStringParameters || {};
      
      let query = supabase
        .from('fishing_locations')
        .select('*')
        .order('name');

      // Apply type filter
      if (queryParams.type) {
        query = query.eq('type', queryParams.type);
      }

      // Apply county filter
      if (queryParams.county) {
        query = query.eq('county', queryParams.county);
      }

      // Apply search filter
      if (queryParams.search) {
        query = query.or(`name.ilike.%${queryParams.search}%,description.ilike.%${queryParams.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching locations:', error);
        return bad('Failed to fetch locations', 500);
      }

      return ok({ success: true, data: data || [] });
    }

    // GET /api/locations/:id - Get specific location
    if (method === 'GET' && pathSegments[0] === 'locations' && pathSegments[1]) {
      const locationId = pathSegments[1];

      const { data, error } = await supabase
        .from('fishing_locations')
        .select('*')
        .eq('id', locationId)
        .single();

      if (error) {
        console.error('Error fetching location:', error);
        return bad('Location not found', 404);
      }

      return ok({ success: true, data });
    }

    return bad('Not found', 404);

  } catch (error) {
    console.error('Locations API error:', error);
    return bad('Internal server error', 500);
  }
};
