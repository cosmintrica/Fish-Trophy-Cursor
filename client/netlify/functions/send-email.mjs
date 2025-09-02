// netlify/functions/send-email.mjs
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
      const { action, email } = JSON.parse(event.body || '{}');
      
      if (action === 'send-verification') {
        try {
          // Get user info
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
          console.log(`📧 Email verification link: ${emailVerificationLink}`);

          // Try to send email using Firebase Auth REST API
          try {
            const sendEmailResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.FIREBASE_API_KEY}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                requestType: 'VERIFY_EMAIL',
                idToken: idToken,
                continueUrl: `${event.headers.origin || 'https://fishtrophy.ro'}/profile?verified=true`
              })
            });

            const sendResult = await sendEmailResponse.json();
            
            if (sendResult.error) {
              console.error('❌ Error sending email:', sendResult.error);
              return {
                statusCode: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                  success: false,
                  error: 'Failed to send verification email: ' + sendResult.error.message
                })
              };
            }

            console.log(`✅ Verification email sent successfully to ${user.email}`);

            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: true,
                message: 'Email de verificare trimis cu succes! Verifică-ți inbox-ul.',
                data: { 
                  email: user.email,
                  emailSent: true
                }
              })
            };
          } catch (sendError) {
            console.error('❌ Error sending email via REST API:', sendError);
            
            // Fallback: return the link for manual use
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: true,
                message: 'Link de verificare generat. Verifică server logs pentru link.',
                data: { 
                  email: user.email,
                  link: emailVerificationLink,
                  note: 'Email service may not be configured - link available in server logs'
                }
              })
            };
          }
        } catch (error) {
          console.error('❌ Error in send-verification:', error);
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'Failed to send verification email: ' + error.message
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
          error: 'Invalid action. Supported actions: send-verification'
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
    console.error('❌ Error in send-email:', error);
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
