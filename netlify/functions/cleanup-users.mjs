// netlify/functions/cleanup-users.mjs
import { neon } from '@netlify/neon';

export async function handler(event) {
  const sql = neon(); // automatically uses NETLIFY_DATABASE_URL

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
    if (event.httpMethod === 'GET') {
      // Check for duplicate users
      const duplicates = await sql`
        SELECT firebase_uid, email, COUNT(*) as count
        FROM users 
        GROUP BY firebase_uid, email
        HAVING COUNT(*) > 1
        ORDER BY count DESC
      `;

      console.log(`🔍 Found ${duplicates.length} duplicate groups`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: {
            duplicateGroups: duplicates.length,
            duplicates: duplicates
          }
        })
      };
    }

    if (event.httpMethod === 'POST') {
      const { action } = JSON.parse(event.body || '{}');

      if (action === 'clean-duplicates') {
        console.log('🧹 Starting duplicate cleanup...');

        // First, identify duplicates
        const duplicates = await sql`
          SELECT firebase_uid, email, COUNT(*) as count
          FROM users 
          GROUP BY firebase_uid, email
          HAVING COUNT(*) > 1
        `;

        let totalCleaned = 0;

        for (const duplicate of duplicates) {
          console.log(`🧹 Cleaning duplicates for firebase_uid: ${duplicate.firebase_uid}`);

          // Keep the most recent user, delete the rest
          const cleaned = await sql`
            DELETE FROM users 
            WHERE firebase_uid = ${duplicate.firebase_uid}
            AND id NOT IN (
              SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (ORDER BY updated_at DESC, created_at DESC) as rn
                FROM users 
                WHERE firebase_uid = ${duplicate.firebase_uid}
              ) ranked
              WHERE rn = 1
            )
          `;

          totalCleaned += cleaned.length;
          console.log(`✅ Cleaned ${cleaned.length} duplicates for ${duplicate.firebase_uid}`);
        }

        console.log(`🎉 Total cleaned: ${totalCleaned} duplicate users`);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            data: {
              totalCleaned: totalCleaned,
              duplicateGroups: duplicates.length
            }
          })
        };
      }

      if (action === 'validate-uniqueness') {
        // Check for any remaining duplicates
        const remainingDuplicates = await sql`
          SELECT firebase_uid, email, COUNT(*) as count
          FROM users 
          GROUP BY firebase_uid, email
          HAVING COUNT(*) > 1
        `;

        const totalUsers = await sql`SELECT COUNT(*) as count FROM users`;
        const uniqueUsers = await sql`SELECT COUNT(DISTINCT firebase_uid) as count FROM users`;

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            data: {
              totalUsers: totalUsers[0].count,
              uniqueUsers: uniqueUsers[0].count,
              remainingDuplicates: remainingDuplicates.length,
              duplicates: remainingDuplicates
            }
          })
        };
      }

      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid action. Supported actions: clean-duplicates, validate-uniqueness'
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
    console.error('❌ Error in cleanup-users function:', error);
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
