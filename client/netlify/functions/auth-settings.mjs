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
              error: 'Parola nouă este obligatorie',
              field: 'newPassword'
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
              error: 'Parola actuală este obligatorie pentru verificare',
              field: 'currentPassword'
            })
          };
        }

        // Check if new password is different from current password
        if (newPassword === currentPassword) {
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'Parola nouă trebuie să fie diferită de cea actuală',
              field: 'newPassword'
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
                error: 'Parola trebuie să aibă cel puțin 8 caractere',
                field: 'newPassword'
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
                error: 'Parola trebuie să conțină cel puțin o literă și o cifră',
                field: 'newPassword'
              })
            };
          }
          
          // CRITICAL: Verify current password by attempting to sign in
          // This is the ONLY way to verify the current password with Firebase Admin SDK
          try {
            // We need to use Firebase Auth REST API to verify the current password
            const verifyPasswordResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: user.email,
                password: currentPassword,
                returnSecureToken: true
              })
            });

            const verifyResult = await verifyPasswordResponse.json();
            
            if (!verifyResult.idToken) {
              return {
                statusCode: 400,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                  success: false,
                  error: 'Parola actuală este incorectă',
                  field: 'currentPassword'
                })
              };
            }
          } catch (verifyError) {
            return {
              statusCode: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: false,
                error: 'Parola actuală este incorectă',
                field: 'currentPassword'
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

          // Try to send email verification directly
          try {
            await auth.generateEmailVerificationLink(
              user.email,
              actionCodeSettings
            );
          } catch (linkError) {
            console.error('❌ Error generating email verification link:', linkError);
            throw linkError;
          }

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
