// netlify/functions/user-profile.mjs
import { neon } from '@netlify/neon';

export async function handler(event) {
  const sql = neon(); // automatically uses NETLIFY_DATABASE_URL

  // Extract firebase_uid from path: /.netlify/functions/user-profile/[firebase_uid]
  const pathParts = event.path.split('/');
  const firebaseUid = pathParts[pathParts.length - 1];

  if (!firebaseUid || firebaseUid === 'user-profile') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Firebase UID is required' })
    };
  }

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

      let users = await sql`
        SELECT id, firebase_uid, email, display_name, photo_url, phone, role, bio, location, website, created_at, updated_at
        FROM users
        WHERE firebase_uid = ${firebaseUid}
      `;

      if (users.length === 0) {
        // Create user if they don't exist - we'll get Firebase data from the request
        console.log(`🆕 Creating new user on GET: ${firebaseUid}`);

        // For GET requests, we can't get Firebase data from body, so create with minimal data
        // The user will be updated when they make a PUT request with their Firebase data
        const newUsers = await sql`
          INSERT INTO users (firebase_uid, email, display_name, photo_url, role, created_at, updated_at)
          VALUES (${firebaseUid}, '', '', '', 'user', NOW(), NOW())
          RETURNING id, firebase_uid, email, display_name, photo_url, phone, role, bio, location, website, created_at, updated_at
        `;
        users = newUsers;
        console.log(`✅ Created new user with ID: ${newUsers[0].id} (minimal data - will be updated on first PUT)`);
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

      const { displayName, display_name, bio, location, website, phone, email, photo_url } = JSON.parse(event.body || '{}');

      // Map displayName to display_name for database compatibility
      const displayNameToSave = displayName || display_name;
      const emailToSave = email || '';
      const photoUrlToSave = photo_url || '';

      // Check if user exists first, if not create them
      let existingUsers = await sql`
        SELECT id, email FROM users WHERE firebase_uid = ${firebaseUid}
      `;

      if (existingUsers.length === 0) {
        // Create user if they don't exist with Firebase data
        console.log(`🆕 Creating new user: ${firebaseUid}`);
        
        // Validate email is provided
        if (!emailToSave) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'Email is required for new user creation'
            })
          };
        }

        const newUsers = await sql`
          INSERT INTO users (firebase_uid, email, display_name, photo_url, role, created_at, updated_at)
          VALUES (${firebaseUid}, ${emailToSave}, ${displayNameToSave || ''}, ${photoUrlToSave}, 'user', NOW(), NOW())
          RETURNING id
        `;
        existingUsers = newUsers;
        console.log(`✅ Created new user with ID: ${newUsers[0].id}, email: ${emailToSave}, name: ${displayNameToSave}`);
      } else {
        // User exists, check if email is being updated
        const existingUser = existingUsers[0];
        if (emailToSave && emailToSave !== existingUser.email) {
          console.log(`⚠️ Email change detected: ${existingUser.email} -> ${emailToSave}`);
          // For security, we don't allow email changes through this endpoint
          // Email changes should go through Firebase Auth
        }
      }

      // Update user profile - only update fields that are provided and not empty
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (displayNameToSave !== undefined && displayNameToSave !== '') {
        updateFields.push(`display_name = $${paramIndex}`);
        updateValues.push(displayNameToSave);
        paramIndex++;
      }

      if (emailToSave && emailToSave !== '') {
        updateFields.push(`email = $${paramIndex}`);
        updateValues.push(emailToSave);
        paramIndex++;
      }

      if (photoUrlToSave !== undefined && photoUrlToSave !== '') {
        updateFields.push(`photo_url = $${paramIndex}`);
        updateValues.push(photoUrlToSave);
        paramIndex++;
      }

      if (bio !== undefined && bio !== '') {
        updateFields.push(`bio = $${paramIndex}`);
        updateValues.push(bio);
        paramIndex++;
      }

      if (location !== undefined && location !== '') {
        updateFields.push(`location = $${paramIndex}`);
        updateValues.push(location);
        paramIndex++;
      }

      if (website !== undefined && website !== '') {
        updateFields.push(`website = $${paramIndex}`);
        updateValues.push(website);
        paramIndex++;
      }

      if (phone !== undefined && phone !== '') {
        updateFields.push(`phone = $${paramIndex}`);
        updateValues.push(phone);
        paramIndex++;
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(firebaseUid);

      let updatedUsers;
      if (updateFields.length <= 1) {
        // Only updated_at, no other fields to update
        updatedUsers = await sql`
          UPDATE users
          SET updated_at = NOW()
          WHERE firebase_uid = ${firebaseUid}
          RETURNING id, firebase_uid, email, display_name, photo_url, phone, role, bio, location, website, created_at, updated_at
        `;
      } else {
        const query = `
          UPDATE users
          SET ${updateFields.join(', ')}
          WHERE firebase_uid = $${paramIndex}
          RETURNING id, firebase_uid, email, display_name, photo_url, phone, role, bio, location, website, created_at, updated_at
        `;

        updatedUsers = await sql.unsafe(query, updateValues);
      }

      const updatedUser = updatedUsers[0];
      console.log(`✅ Updated user: ${updatedUser.display_name || updatedUser.email}`);

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
