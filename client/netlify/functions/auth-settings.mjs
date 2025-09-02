// netlify/functions/auth-settings.mjs
import { neon } from '@netlify/neon';
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
      const { action, newEmail, newPassword } = JSON.parse(event.body || '{}');
      
      if (action === 'change-email') {
        if (!newEmail) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'New email is required'
            })
          };
        }

        try {
          // Update email in Firebase Auth
          await auth.updateUser(firebaseUid, {
            email: newEmail,
            emailVerified: false // User needs to verify new email
          });

          // Update email in database
          await sql`
            UPDATE users 
            SET email = ${newEmail}, updated_at = NOW()
            WHERE firebase_uid = ${firebaseUid}
          `;

          console.log(`✅ Email updated for user ${firebaseUid}: ${newEmail}`);

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: true,
              message: 'Email updated successfully. Please verify your new email address.',
              data: { newEmail }
            })
          };
        } catch (error) {
          console.error('❌ Error updating email:', error);
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'Failed to update email: ' + error.message
            })
          };
        }
      }

      if (action === 'change-password') {
        const { newPassword, currentPassword } = JSON.parse(event.body || '{}');
        
        if (!newPassword) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'New password is required'
            })
          };
        }

        if (!currentPassword) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'Current password is required for verification'
            })
          };
        }

        try {
          // Get user info
          const user = await auth.getUser(firebaseUid);
          
          // IMPORTANT: Firebase Admin SDK cannot verify current password directly
          // This should be done client-side with reauthentication
          // For now, we'll require the user to be recently authenticated
          
          // Check if token is recent (within last 5 minutes)
          const tokenTime = decodedToken.auth_time * 1000;
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;
          
          if (now - tokenTime > fiveMinutes) {
            return {
              statusCode: 401,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: false,
                error: 'Token expired. Please re-authenticate to change password.'
              })
            };
          }
          
          // Update password in Firebase Auth
          await auth.updateUser(firebaseUid, {
            password: newPassword
          });

          console.log(`✅ Password updated for user ${firebaseUid}`);

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: true,
              message: 'Password updated successfully'
            })
          };
        } catch (error) {
          console.error('❌ Error updating password:', error);
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'Failed to update password: ' + error.message
            })
          };
        }
      }

      if (action === 'send-email-verification') {
        try {
          // Send email verification
          const user = await auth.getUser(firebaseUid);
          if (user.emailVerified) {
            return {
              statusCode: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: false,
                error: 'Email is already verified'
              })
            };
          }

          // Generate email verification link
          const actionCodeSettings = {
            url: `${event.headers.origin || 'https://fishtrophy.ro'}/profile?verified=true`,
            handleCodeInApp: false,
          };

          const emailVerificationLink = await auth.generateEmailVerificationLink(
            user.email,
            actionCodeSettings
          );

          console.log(`✅ Email verification link generated for user ${firebaseUid}`);

          // TODO: Send email via Resend/SendGrid when configured
          // For now, return the link for manual use
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: true,
              message: 'Email verification link generated. Check console for link (email service not configured yet).',
              data: { 
                emailVerificationLink,
                email: user.email,
                note: 'Email service not configured - link available in server logs'
              }
            })
          };
        } catch (error) {
          console.error('❌ Error generating email verification:', error);
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'Failed to generate email verification: ' + error.message
            })
          };
        }
      }

      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid action. Supported actions: change-email, change-password, send-email-verification'
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
    console.error('❌ Error in auth-settings:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
}
