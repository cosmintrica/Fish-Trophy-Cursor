// netlify/functions/locations.mjs
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(event) {
  try {
    if (event.httpMethod === 'GET') {
      console.log('🔍 GET request for locations list');
      
      const { data: locations, error } = await supabase
        .from('fishing_locations')
        .select(`
          id, name, subtitle, administrare, type, county, region,
          latitude, longitude, description, facilities, access_type,
          access_fee, best_season, best_time, parking_available,
          parking_fee, boat_rental, boat_rental_fee, created_at, updated_at
        `)
        .order('name');
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      console.log(`✅ Found ${locations?.length || 0} locations`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify(locations || [])
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}
