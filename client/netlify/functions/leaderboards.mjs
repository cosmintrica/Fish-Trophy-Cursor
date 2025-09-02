// netlify/functions/leaderboards.mjs
import { neon } from '@netlify/neon';

export async function handler(event) {
  const sql = neon(); // automatically uses NETLIFY_DATABASE_URL
  
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
      
      let query = `
        SELECT 
          r.id as record_id,
          r.weight_kg,
          r.length_cm,
          r.captured_at,
          r.photo_url,
          r.notes,
          u.id as user_id,
          u.display_name,
          u.photo_url as user_photo_url,
          s.name as species_name,
          s.common_name_ro,
          wb.name as water_body_name,
          ROW_NUMBER() OVER (ORDER BY r.weight_kg DESC) as rank
        FROM records r
        LEFT JOIN users u ON u.id = r.user_id
        LEFT JOIN species s ON s.id = r.species_id
        LEFT JOIN water_bodies wb ON wb.id = r.water_body_id
        WHERE r.status = 'approved'
      `;
      
      const params = [];
      let paramIndex = 1;
      
      if (species_id) {
        query += ` AND r.species_id = $${paramIndex}`;
        params.push(species_id);
        paramIndex++;
      }
      
      if (period !== 'all') {
        const days = period === 'year' ? 365 : period === 'month' ? 30 : 7;
        query += ` AND r.captured_at >= NOW() - INTERVAL '${days} days'`;
      }
      
      query += ` ORDER BY r.weight_kg DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
      
      const leaderboard = await sql.unsafe(query, params);
      
      console.log(`✅ Found ${leaderboard.length} leaderboard entries`);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: leaderboard
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
