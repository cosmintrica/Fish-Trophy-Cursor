// netlify/functions/send-email-verification.mjs
import { neon } from '@netlify/neon';

export async function handler(event) {
  const sql = neon();

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, verificationLink, userName } = JSON.parse(event.body || '{}');

    if (!email || !verificationLink) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: false,
          error: 'Email and verification link are required'
        })
      };
    }

    // Send email using SendGrid
    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: email }],
          subject: 'Verifică-ți email-ul - Fish Trophy'
        }],
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@fishtrophy.ro',
          name: 'Fish Trophy'
        },
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e40af;">Bine ai venit la Fish Trophy!</h2>
              <p>Salut ${userName || 'Pescar'}!</p>
              <p>Te rugăm să verifici email-ul tău pentru a-ți activa contul pe Fish Trophy.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationLink}"
                   style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Verifică Email-ul
                </a>
              </div>
              <p>Dacă butonul nu funcționează, copiază și lipește acest link în browser:</p>
              <p style="word-break: break-all; color: #666;">${verificationLink}</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px;">
                Acest email a fost trimis automat. Te rugăm să nu răspunzi la acest email.
              </p>
            </div>
          `
        }]
      })
    });

    if (sendGridResponse.ok) {
      console.log(`✅ Email verification sent to: ${email}`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          success: true,
          message: 'Email verification sent successfully'
        })
      };
    } else {
      const errorText = await sendGridResponse.text();
      console.error('❌ SendGrid error:', errorText);
      throw new Error(`SendGrid error: ${sendGridResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Error sending email verification:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to send email verification'
      })
    };
  }
}
