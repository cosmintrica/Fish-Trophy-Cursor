// netlify/functions/species.mjs
import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    if (event.httpMethod === 'GET') {
      console.log('🔍 GET request for species list');
      const speciesList = await sql`
        SELECT id, name, common_name_ro, scientific_name, description, image_url, 
               min_weight_kg, max_weight_kg, habitat, season, created_at, updated_at
        FROM species 
        ORDER BY common_name_ro
      `;
      
      console.log(`✅ Found ${speciesList.length} species`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify(speciesList)
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
