// netlify/functions/create-manual-admin.mjs
import { neon } from '@netlify/neon';

export async function handler(event) {
  const sql = neon();
  
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

    if (event.httpMethod === 'POST' || event.httpMethod === 'GET') {
      console.log('🔧 Creating manual admin user');
      
      // Get admin email from environment variable
      const adminEmail = process.env.ADMIN_EMAIL || 'cosmin.trica@outlook.com';
      
      // Delete all existing users first
      await sql`DELETE FROM users`;
      console.log('🗑️ Deleted all existing users');
      
      // Create new admin user with proper data
      const newUsers = await sql`
        INSERT INTO users (firebase_uid, email, display_name, role, created_at, updated_at)
        VALUES ('manual-admin-uid', ${adminEmail}, 'Cosmin Trica', 'admin', NOW(), NOW())
        RETURNING id, firebase_uid, email, display_name, role, created_at, updated_at
      `;

      const newUser = newUsers[0];
      console.log(`✅ Created manual admin user: ${newUser.email}`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Manual admin user created successfully',
          data: newUser
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
    console.error('❌ Error creating manual admin user:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error: ' + error.message
      })
    };
  }
}
