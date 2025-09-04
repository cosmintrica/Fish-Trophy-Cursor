// netlify/functions/leaderboards.mjs
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function handler(event) {

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: ''
      };
    }

    if (event.httpMethod === 'GET') {
      console.log('🏆 GET request for leaderboards');

      // Get query parameters
      const { species_id, period = 'all', limit = 10 } = event.queryStringParameters || {};

      // Build Supabase query
      let query = supabase
        .from('records')
        .select(`
          id,
          weight_kg,
          length_cm,
          captured_at,
          photo_url,
          notes,
          users!records_user_id_fkey(id, display_name, photo_url),
          species!records_species_id_fkey(name, common_name_ro),
          water_bodies!records_water_body_id_fkey(name)
        `)
        .eq('status', 'approved')
        .order('weight_kg', { ascending: false })
        .limit(parseInt(limit));

      if (species_id) {
        query = query.eq('species_id', species_id);
      }

      if (period !== 'all') {
        const days = period === 'year' ? 365 : period === 'month' ? 30 : 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.gte('captured_at', cutoffDate.toISOString());
      }

      const { data: leaderboard, error } = await query;

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      // Add rank to each entry
      const leaderboardWithRank = (leaderboard || []).map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      console.log(`✅ Found ${leaderboardWithRank.length} leaderboard entries`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: leaderboardWithRank
        })
      };
    }

    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed'
      })
    };
  } catch (error) {
    console.error('❌ Error handling leaderboards:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}
