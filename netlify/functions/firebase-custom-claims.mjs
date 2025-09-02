// netlify/functions/firebase-custom-claims.mjs
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();

export async function handler(event) {
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

    // Verify authorization
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Authorization header required'
        })
      };
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid token'
        })
      };
    }

    const firebaseUid = decodedToken.uid;

    if (event.httpMethod === 'POST') {
      const { action, targetUid, role } = JSON.parse(event.body || '{}');
      
      if (action === 'set-role') {
        // Check if current user is admin
        const currentUser = await auth.getUser(firebaseUid);
        const currentUserClaims = currentUser.customClaims || {};
        
        if (currentUserClaims.role !== 'admin') {
          return {
            statusCode: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'Only admins can set roles'
            })
          };
        }

        if (!targetUid || !role) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'targetUid and role are required'
            })
          };
        }

        // Set custom claims for target user
        await auth.setCustomUserClaims(targetUid, { 
          role: role,
          updatedBy: firebaseUid,
          updatedAt: new Date().toISOString()
        });

        console.log(`✅ Set role '${role}' for user ${targetUid} by admin ${firebaseUid}`);

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            message: `Role '${role}' set successfully for user`,
            data: { targetUid, role }
          })
        };
      }

      if (action === 'get-claims') {
        // Get current user's claims
        const user = await auth.getUser(firebaseUid);
        const claims = user.customClaims || {};

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            data: { 
              uid: firebaseUid,
              claims: claims,
              role: claims.role || 'user'
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
          error: 'Invalid action. Supported actions: set-role, get-claims'
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
    console.error('❌ Error in firebase-custom-claims:', error);
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
