/**
 * Simple encryption utility for private messages
 * Uses Web Crypto API for client-side encryption
 * 
 * IMPORTANT: This is a basic implementation. For production, consider:
 * - Key exchange protocol (e.g., Diffie-Hellman)
 * - Key derivation from user passwords
 * - Secure key storage
 */

// Generate a random encryption key (for demo - in production, derive from user keys)
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

// Encrypt message content
export async function encryptMessage(
  message: string,
  key: CryptoKey
): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  // Convert to base64 for storage
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

// Decrypt message content
export async function decryptMessage(
  encryptedData: string,
  ivString: string,
  key: CryptoKey
): Promise<string> {
  // Convert from base64
  const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivString), c => c.charCodeAt(0));

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encrypted
  );

  // Convert to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// Derive key from user IDs (simple approach - for production use proper key exchange)
export async function deriveKeyFromUsers(
  userId1: string,
  userId2: string
): Promise<CryptoKey> {
  // Sort IDs to ensure same key for both users
  const sortedIds = [userId1, userId2].sort().join('-');
  
  // Use PBKDF2 to derive key from user IDs
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(sortedIds),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('fish-trophy-messages'), // In production, use random salt per conversation
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

