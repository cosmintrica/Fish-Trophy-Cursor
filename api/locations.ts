import { db, locations, waterBodies } from '@fishtrophy/db';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    console.log('🔍 GET request for locations list');
    
    const locationsList = await db
      .select({
        id: locations.id,
        name: locations.name,
        description: locations.description,
        water_body_id: locations.water_body_id,
        water_body_name: waterBodies.name,
        created_at: locations.created_at,
        updated_at: locations.updated_at
      })
      .from(locations)
      .leftJoin(waterBodies, eq(locations.water_body_id, waterBodies.id))
      .orderBy(locations.name);
    
    console.log(`✅ Found ${locationsList.length} locations`);
    
    return new Response(JSON.stringify({
      success: true,
      data: locationsList
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch locations'
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
