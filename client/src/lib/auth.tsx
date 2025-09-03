import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Register user in database
      if (userCredential.user) {
        try {
          const response = await fetch('/.netlify/functions/user-register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firebase_uid: userCredential.user.uid,
              email: userCredential.user.email,
              display_name: userCredential.user.displayName || '',
              photo_url: userCredential.user.photoURL || ''
            })
          });

          const result = await response.json();
          if (result.success) {
            console.log('✅ User registered in database:', result.data);
          } else {
            console.error('❌ Failed to register user in database:', result.error);
          }
        } catch (dbError) {
          console.error('❌ Error registering user in database:', dbError);
          // Don't throw error - user is still created in Firebase
        }
      }
      
      // Send email verification automatically after signup
      if (userCredential.user && !userCredential.user.emailVerified) {
        try {
          await sendEmailVerification(userCredential.user, {
            url: `${window.location.origin}/profile?verified=true`,
            handleCodeInApp: false,
          });
          console.log('✅ Email verification sent to:', email);
        } catch (emailError) {
          console.error('❌ Error sending email verification:', emailError);
          // Don't throw error - user is still created successfully
        }
      }
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Register user in database if they don't exist
      if (userCredential.user) {
        try {
          const response = await fetch('/.netlify/functions/user-register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              firebase_uid: userCredential.user.uid,
              email: userCredential.user.email,
              display_name: userCredential.user.displayName || '',
              photo_url: userCredential.user.photoURL || ''
            })
          });

          const result = await response.json();
          if (result.success) {
            console.log('✅ User registered in database:', result.data);
          } else if (result.error === 'User already exists') {
            console.log('✅ User already exists in database');
          } else {
            console.error('❌ Failed to register user in database:', result.error);
          }
        } catch (dbError) {
          console.error('❌ Error registering user in database:', dbError);
          // Don't throw error - user is still signed in
        }
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
