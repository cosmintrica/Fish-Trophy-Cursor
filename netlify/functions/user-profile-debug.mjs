// netlify/functions/user-profile-debug.mjs
export async function handler(event) {
  console.log('🔍 Debug function called');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Extract firebase_uid from path
    const pathParts = event.path.split('/');
    const firebaseUid = pathParts[pathParts.length - 1];
    
    console.log('Firebase UID:', firebaseUid);
    console.log('HTTP Method:', event.httpMethod);
    console.log('Body:', event.body);
    
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
    
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      console.log('Parsed body:', body);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Debug function works!',
          firebaseUid: firebaseUid,
          method: event.httpMethod,
          receivedData: body
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Debug function works!',
        firebaseUid: firebaseUid,
        method: event.httpMethod
      })
    };
    
  } catch (error) {
    console.error('❌ Debug function error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Debug function error',
        message: error.message,
        stack: error.stack
      })
    };
  }
}
