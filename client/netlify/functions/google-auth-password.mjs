import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
if (!global.firebaseAdminInitialized) {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    initializeApp({
      credential: cert(serviceAccount)
    });
    
    global.firebaseAdminInitialized = true;
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
  }
}

export const handler = async (event) => {
  // Handle CORS
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

  try {
    const auth = getAuth();
    
    // Verify Firebase ID token
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
    const decodedToken = await auth.verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    if (event.httpMethod === 'POST') {
      const { action, newPassword } = JSON.parse(event.body || '{}');
      
      if (action === 'set-password') {
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

        // Validate password complexity
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

        try {
          // Get user info
          const user = await auth.getUser(firebaseUid);
          
          // Check if user has Google provider
          const hasGoogleProvider = user.providerData.some(provider => provider.providerId === 'google.com');
          
          if (!hasGoogleProvider) {
            return {
              statusCode: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                success: false,
                error: 'Această funcție este doar pentru utilizatorii care s-au înregistrat cu Google'
              })
            };
          }

          // Set password for Google Auth user
          await auth.updateUser(firebaseUid, {
            password: newPassword
          });

          console.log(`✅ Password set for Google Auth user: ${firebaseUid}`);

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: true,
              message: 'Parola a fost setată cu succes! Acum poți schimba parola din secțiunea Setări.'
            })
          };
        } catch (error) {
          console.error('❌ Error setting password for Google Auth user:', error);
          return {
            statusCode: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: false,
              error: 'Eroare la setarea parolei: ' + error.message
            })
          };
        }
      }
    }

    if (event.httpMethod === 'GET') {
      // Check if user has Google provider and if password is set
      try {
        const user = await auth.getUser(firebaseUid);
        const hasGoogleProvider = user.providerData.some(provider => provider.providerId === 'google.com');
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: true,
            data: {
              hasGoogleProvider,
              needsPassword: hasGoogleProvider && !user.passwordHash
            }
          })
        };
      } catch (error) {
        console.error('❌ Error checking user providers:', error);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: 'Eroare la verificarea provider-ului: ' + error.message
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
        error: 'Invalid action. Supported actions: set-password'
      })
    };

  } catch (error) {
    console.error('❌ Error in google-auth-password function:', error);
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
};
