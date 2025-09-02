// netlify/functions/db-test.mjs
export async function handler(event) {
  console.log('🔍 DB Test function called');
  
  try {
    // Test if @netlify/neon can be imported
    console.log('Testing @netlify/neon import...');
    const { neon } = await import('@netlify/neon');
    console.log('✅ @netlify/neon imported successfully');
    
    // Test if we can create a connection
    console.log('Testing database connection...');
    const sql = neon();
    console.log('✅ Database connection created');
    
    // Test a simple query
    console.log('Testing simple query...');
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Query executed successfully:', result);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Database connection test successful!',
        result: result
      })
    };
    
  } catch (error) {
    console.error('❌ DB Test error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Database connection test failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
}
