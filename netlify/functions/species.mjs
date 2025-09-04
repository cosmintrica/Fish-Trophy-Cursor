// netlify/functions/species.mjs
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
      console.log('🔍 GET request for species list');
      
      const { data: speciesList, error } = await supabase
        .from('fish_species')
        .select(`
          id, name, common_name_ro, scientific_name, description, image_url, 
          min_weight_kg, max_weight_kg, habitat, season, region, created_at, updated_at
        `)
        .order('common_name_ro');
      
      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }
      
      console.log(`✅ Found ${speciesList?.length || 0} species`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify(speciesList || [])
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('❌ Error fetching species:', error);
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
