// Species API - Get fish species data
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
  headers: cors(),
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
    // GET /api/species - List all species
    if (method === 'GET' && pathSegments[0] === 'species') {
      const queryParams = event.queryStringParameters || {};
      
      let query = supabase
        .from('fish_species')
        .select('*')
        .order('name');

      // Apply search filter
      if (queryParams.search) {
        query = query.or(`name.ilike.%${queryParams.search}%,scientific_name.ilike.%${queryParams.search}%`);
      }

      // Apply limit
      if (queryParams.limit) {
        query = query.limit(parseInt(queryParams.limit));
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching species:', error);
        return bad('Failed to fetch species', 500);
      }

      return ok({ success: true, data: data || [] });
    }

    // GET /api/species/:id - Get specific species
    if (method === 'GET' && pathSegments[0] === 'species' && pathSegments[1]) {
      const speciesId = pathSegments[1];

      const { data, error } = await supabase
        .from('fish_species')
        .select('*')
        .eq('id', speciesId)
        .single();

      if (error) {
        console.error('Error fetching species:', error);
        return bad('Species not found', 404);
      }

      return ok({ success: true, data });
    }

    return bad('Not found', 404);

  } catch (error) {
    console.error('Species API error:', error);
    return bad('Internal server error', 500);
  }
};
