import { db, species } from '@fishtrophy/db';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const { pathname } = new URL(request.url);
  const speciesId = pathname.split('/').pop()!;
  
  try {
    console.log(`🔍 GET request for species: ${speciesId}`);
    
    const speciesData = await db.select().from(species).where(eq(species.id, speciesId)).limit(1);
    
    if (speciesData.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Species not found'
      }), {
        status: 404,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    console.log(`✅ Found species: ${speciesData[0].common_name_ro}`);
    
    return new Response(JSON.stringify({
      success: true,
      data: speciesData[0]
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
