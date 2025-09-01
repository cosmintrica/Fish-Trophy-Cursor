import { db, species } from '@fishtrophy/db';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    console.log('🔍 GET request for species list');
    
    const speciesList = await db.select().from(species).orderBy(species.common_name_ro);
    
    console.log(`✅ Found ${speciesList.length} species`);
    
    return new Response(JSON.stringify({
      success: true,
      data: speciesList
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
    console.error('❌ Error fetching species:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch species'
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
