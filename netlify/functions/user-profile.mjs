// netlify/functions/user-profile.mjs
import { neon } from '@netlify/neon';

export async function handler(event) {
  const sql = neon(); // automatically uses NETLIFY_DATABASE_URL

  // Extract firebase_uid from path: /.netlify/functions/user-profile/[firebase_uid]
  const pathParts = event.path.split('/');
  const firebaseUid = pathParts[pathParts.length - 1];

  // CRITICAL: Strict validation for Firebase UID
  if (!firebaseUid || 
      firebaseUid === 'user-profile' || 
      firebaseUid === 'undefined' || 
      firebaseUid === 'null' ||
      firebaseUid.trim() === '' ||
      firebaseUid.length < 15) {
    console.error('❌ Invalid Firebase UID:', firebaseUid);
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: false,
        error: 'Invalid or missing Firebase UID' 
      })
    };
  }

  console.log(`🔍 Processing request for Firebase UID: ${firebaseUid}`);

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

    if (event.httpMethod === 'GET') {
      console.log(`🔍 GET request for user profile: ${firebaseUid}`);

      // CRITICAL: Use parameterized query to prevent SQL injection
      const users = await sql`
        SELECT id, firebase_uid, email, display_name, photo_url, phone, role, bio, location, website, created_at, updated_at
        FROM users
        WHERE firebase_uid = ${firebaseUid}
      `;

      if (users.length === 0) {
        console.log(`❌ User not found: ${firebaseUid}`);
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'User not found. Please register first.'
          })
        };
      }

      if (users.length > 1) {
        console.error(`❌ CRITICAL: Multiple users found with same Firebase UID: ${firebaseUid}`);
        // This should NEVER happen - log for investigation
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Database integrity error: Multiple users with same UID'
          })
        };
      }

      const userData = users[0];
      console.log(`✅ Found user: ${userData.display_name || userData.email}`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
        },
        body: JSON.stringify({
          success: true,
          data: {
            id: userData.id,
            firebase_uid: userData.firebase_uid,
            email: userData.email,
            displayName: userData.display_name || '',
            photo_url: userData.photo_url || '',
            phone: userData.phone || '',
            role: userData.role,
            bio: userData.bio || '',
            location: userData.location || '',
            website: userData.website || '',
            created_at: userData.created_at,
            updated_at: userData.updated_at
          }
        })
      };
    }

    if (event.httpMethod === 'PUT') {
      console.log(`🔄 PUT request for user profile: ${firebaseUid}`);

      const { displayName, display_name, bio, location, website, phone, photo_url } = JSON.parse(event.body || '{}');

      // Map displayName to display_name for database compatibility
      const displayNameToSave = displayName || display_name;
      const photoUrlToSave = photo_url || '';

      // CRITICAL: Check if user exists first - NO AUTO-CREATION
      const existingUsers = await sql`
        SELECT id, email, role FROM users WHERE firebase_uid = ${firebaseUid}
      `;

      if (existingUsers.length === 0) {
        console.log(`❌ User not found for update: ${firebaseUid}`);
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'User not found. Please register first.'
          })
        };
      }

      if (existingUsers.length > 1) {
        console.error(`❌ CRITICAL: Multiple users found with same Firebase UID: ${firebaseUid}`);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Database integrity error: Multiple users with same UID'
          })
        };
      }

      // CRITICAL: Validate that we're updating the correct user
      const existingUser = existingUsers[0];
      console.log(`✅ User exists: ${existingUser.id}, role: ${existingUser.role}`);

      // Sync email from Firebase Auth if needed
      try {
        const { getAuth } = await import('firebase-admin/auth');
        const auth = getAuth();
        const firebaseUser = await auth.getUser(firebaseUid);
        const firebaseEmail = firebaseUser.email || '';
        
        // Update email if it's different
        if (firebaseEmail && firebaseEmail !== existingUser.email) {
          await sql`
            UPDATE users 
            SET email = ${firebaseEmail}, updated_at = NOW()
            WHERE firebase_uid = ${firebaseUid}
          `;
          console.log(`📧 Updated email from Firebase: ${firebaseEmail}`);
        }
      } catch (firebaseError) {
        console.error('❌ Error syncing Firebase email:', firebaseError);
      }

      // CRITICAL: Update user profile with strict validation
      const updatedUsers = await sql`
        UPDATE users
        SET display_name = ${displayNameToSave || null},
            photo_url = ${photoUrlToSave || null},
            bio = ${bio || null},
            location = ${location || null},
            website = ${website || null},
            phone = ${phone || null},
            updated_at = NOW()
        WHERE firebase_uid = ${firebaseUid}
        RETURNING id, firebase_uid, email, display_name, photo_url, phone, role, bio, location, website, created_at, updated_at
      `;

      if (updatedUsers.length === 0) {
        console.error(`❌ Update failed for user: ${firebaseUid}`);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Update failed'
          })
        };
      }

      if (updatedUsers.length > 1) {
        console.error(`❌ CRITICAL: Update affected multiple users: ${firebaseUid}`);
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Update affected multiple users - database integrity error'
          })
        };
      }

      const updatedUser = updatedUsers[0];
      console.log(`✅ Updated user: ${updatedUser.display_name || updatedUser.email} (firebase_uid: ${firebaseUid})`);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          data: {
            id: updatedUser.id,
            firebase_uid: updatedUser.firebase_uid,
            email: updatedUser.email,
            displayName: updatedUser.display_name || '',
            photo_url: updatedUser.photo_url || '',
            phone: updatedUser.phone || '',
            role: updatedUser.role,
            bio: updatedUser.bio || '',
            location: updatedUser.location || '',
            website: updatedUser.website || '',
            created_at: updatedUser.created_at,
            updated_at: updatedUser.updated_at
          }
        })
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (error) {
    console.error('❌ Error handling user profile:', error);
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
