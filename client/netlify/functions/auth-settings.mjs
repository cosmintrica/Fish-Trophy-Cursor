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
          
          // CRITICAL: Validate new password meets Firebase requirements
          if (newPassword.length < 8) {
            return {
              statusCode: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: false,
                error: 'Parola trebuie să aibă cel puțin 8 caractere'
              })
            };
          }

          // Check if password contains at least one letter and one number
          const hasLetter = /[a-zA-Z]/.test(newPassword);
          const hasNumber = /[0-9]/.test(newPassword);
          
          if (!hasLetter || !hasNumber) {
            return {
              statusCode: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: false,
                error: 'Parola trebuie să conțină cel puțin o literă și o cifră'
              })
            };
          }
          
          // CRITICAL: Require very recent authentication (1 minute)
          const tokenTime = decodedToken.auth_time * 1000;
          const now = Date.now();
          const oneMinute = 1 * 60 * 1000;
          
          if (now - tokenTime > oneMinute) {
            return {
              statusCode: 401,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: false,
                error: 'SECURITATE: Te rog să te autentifici din nou pentru a schimba parola. Sesiunea ta este prea veche.'
              })
            };
          }
          
          // Additional security: Check if user has been active very recently
          const lastSignIn = user.metadata.lastSignInTime;
          if (lastSignIn) {
            const lastSignInTime = new Date(lastSignIn).getTime();
            const twoMinutes = 2 * 60 * 1000;
            
            if (now - lastSignInTime > twoMinutes) {
              return {
                statusCode: 401,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                  success: false,
                  error: 'SECURITATE: Te rog să te autentifici din nou pentru a schimba parola.'
                })
              };
            }
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

          // Check if user has email
          if (!user.email) {
            return {
              statusCode: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: false,
                error: 'No email address found for user'
              })
            };
          }

          // Generate email verification link with proper error handling
          const actionCodeSettings = {
            url: `${event.headers.origin || 'https://fishtrophy.ro'}/profile?verified=true`,
            handleCodeInApp: false,
          };

          const emailVerificationLink = await auth.generateEmailVerificationLink(
            user.email,
            actionCodeSettings
          );

          console.log(`✅ Email verification link generated for user ${firebaseUid}`);

          // Log the verification link for manual use
          console.log(`📧 Email verification link for ${user.email}:`);
          console.log(emailVerificationLink);
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: true,
              message: 'Email verification link generated successfully. Check server logs for the link.',
              data: { 
                email: user.email,
                note: 'Email service not configured yet - link available in server logs',
                linkGenerated: true
              }
            })
          };
        } catch (error) {
          console.error('❌ Error generating email verification:', error);
          
          // Handle specific Firebase errors
          if (error.code === 'auth/too-many-requests') {
            return {
              statusCode: 429,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: false,
                error: 'Prea multe încercări. Te rog să aștepți câteva minute înainte de a încerca din nou.'
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
