import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface ForumUser {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  signature?: string;
  post_count: number;
  topic_count: number;
  reputation_points: number;
  rank: string;
  badges: string[];
  is_online: boolean;
  last_seen_at: string;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  forumUser: ForumUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, username: string) => Promise<{ error?: any }>;
  signInWithGoogle: () => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [forumUser, setForumUser] = useState<ForumUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false); // Setez false pentru dezvoltare

  useEffect(() => {
    // Pentru dezvoltare fără baza de date - nu facem nimic
    // Toate funcțiile de auth sunt dezactivate temporar
  }, []);

  const loadForumUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('forum_users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading forum user:', error);
        return;
      }

      if (data) {
        setForumUser(data);
      } else {
        // Create forum user if doesn't exist
        await createForumUser(userId);
      }
    } catch (error) {
      console.error('Error loading forum user:', error);
    }
  };

  const createForumUser = async (userId: string) => {
    try {
      // Get user metadata
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user for forum profile creation:', userError);
        return;
      }

      // Generate username from email or use random
      const email = user.email || '';
      const baseUsername = email.split('@')[0] || 'pescar';
      let username = baseUsername;
      
      // Check if username exists and make it unique
      let counter = 1;
      let usernameExists = true;
      
      while (usernameExists) {
        const { data, error } = await supabase
          .from('forum_users')
          .select('id')
          .eq('username', username)
          .single();
          
        if (error && error.code === 'PGRST116') {
          // Username doesn't exist, we can use it
          usernameExists = false;
        } else if (data) {
          // Username exists, try with counter
          username = `${baseUsername}${counter}`;
          counter++;
        }
      }

      const newForumUser = {
        user_id: userId,
        username,
        post_count: 0,
        topic_count: 0,
        reputation_points: 0,
        rank: 'pescar-nou',
        badges: [],
        is_online: true,
        last_seen_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('forum_users')
        .insert([newForumUser])
        .select()
        .single();

      if (error) {
        console.error('Error creating forum user:', error);
        return;
      }

      setForumUser(data);
    } catch (error) {
      console.error('Error creating forum user:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await loadForumUser(data.user.id);
      }

      return {};
    } catch (error) {
      console.error('Sign in error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        // Forum user will be created automatically when they first login
      }

      return {};
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/forum`
        }
      });

      if (error) {
        console.error('Google sign in error:', error);
        return { error };
      }

      return {};
    } catch (error) {
      console.error('Google sign in error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        return;
      }

      setUser(null);
      setForumUser(null);
      setSession(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    forumUser,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut
  };
};