import { db, waterBodies } from './db';

export async function GET() {
  try {
    console.log('🔍 GET request for water bodies list');
    
    const waterBodiesList = await db.select().from(waterBodies).orderBy(waterBodies.name);
    
    console.log(`✅ Found ${waterBodiesList.length} water bodies`);
    
    return new Response(JSON.stringify({
      success: true,
      data: waterBodiesList
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
    console.error('❌ Error fetching water bodies:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch water bodies'
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
