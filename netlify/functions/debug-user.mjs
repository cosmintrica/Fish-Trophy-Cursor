// netlify/functions/debug-user.mjs
import { neon } from '@netlify/neon';

export async function handler(event) {
  const sql = neon();

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const { firebase_uid, email } = JSON.parse(event.body || '{}');

    console.log(`🔍 Debug request for Firebase UID: ${firebase_uid}, Email: ${email}`);

    // Check if user exists in database
    const users = await sql`
      SELECT id, firebase_uid, email, display_name, role, created_at, updated_at
      FROM users
      WHERE firebase_uid = ${firebase_uid} OR email = ${email}
    `;

    console.log(`📊 Found ${users.length} users in database`);

    // Get all users for debugging
    const allUsers = await sql`
      SELECT id, firebase_uid, email, display_name, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        data: {
          requestedUser: users.length > 0 ? users[0] : null,
          allUsers: allUsers,
          totalUsers: allUsers.length,
          searchCriteria: {
            firebase_uid,
            email
          }
        }
      })
    };

  } catch (error) {
    console.error('❌ Error in debug-user:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}
