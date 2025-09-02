// netlify/functions/locations.mjs
import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    if (event.httpMethod === 'GET') {
      console.log('🔍 GET request for locations list');
      
      const locations = await sql`
        SELECT l.id, l.name, l.description, l.geom, l.created_at, l.updated_at,
               wb.name as water_body_name, wb.type as water_body_type
        FROM locations l
        LEFT JOIN water_bodies wb ON l.water_body_id = wb.id
        ORDER BY l.name
      `;
      
      console.log(`✅ Found ${locations.length} locations`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify(locations)
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
