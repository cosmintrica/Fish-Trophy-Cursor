import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ForumUser } from '../types/forum';

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
        avatar_url: user.user_metadata?.avatar_url || null,
        post_count: 0,
        topic_count: 0,
        reputation_points: 0,
        rank: 'incepator',
        badges: [],
        is_online: true,
      };

      const { data, error } = await supabase
        .from('forum_users')
        .insert([newForumUser])
        .select()
        .single();

      if (error) {
        console.error('Error creating forum user:', error);
      } else {
        setForumUser(data);
      }
    } catch (error) {
      console.error('Error creating forum user:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    // Mock sign in pentru dezvoltare
    
    // Verificare admin
    if (email === 'cosmin.trica@outlook.com') {
      
      const adminUser = {
        id: 'admin-cosmin-123',
        email,
        created_at: new Date().toISOString(),
      };
      
      const adminForumUser = {
        id: 'forum-admin-cosmin',
        user_id: 'admin-cosmin-123',
        username: 'CosminAdmin',
        avatar_url: '/icon_free.png',
        signature: '🏆 Fondator Fish Trophy | Administrator Forum',
        post_count: 1250,
        topic_count: 89,
        reputation_points: 999,
        rank: 'vip' as const, // Folosesc vip pentru admin în sistem actual
        badges: ['Fondator', 'Administrator', 'Expert Pescuit', 'VIP Member', 'Top Contributor'],
        is_online: true,
        last_seen_at: new Date().toISOString(),
        created_at: new Date('2023-01-15').toISOString(),
        updated_at: new Date().toISOString(),
        // Proprietăți admin
        isAdmin: true,
        canModerateRespect: true,
        canDeletePosts: true,
        canBanUsers: true,
        canEditAnyPost: true
      };
      
      setUser(adminUser as any);
      setForumUser(adminForumUser as any);
      
      return { error: null };
    }
    
    // Simulez un utilizator normal conectat
    const mockUser = {
      id: 'mock-user-123',
      email,
      created_at: new Date().toISOString(),
    };
    
    const mockForumUser = {
      id: 'forum-mock-123',
      user_id: 'mock-user-123',
      username: email.split('@')[0] || 'pescar123',
      avatar_url: null,
      signature: null,
      post_count: 42,
      topic_count: 8,
      reputation_points: 156,
      rank: 'pescar' as const,
      badges: ['Primul Post', 'Sociabil'],
      is_online: true,
      last_seen_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setUser(mockUser as any);
    setForumUser(mockForumUser);
    
    return { error: null };
  };

  const signUp = async (email: string, password: string, username: string) => {
    // Mock sign up pentru dezvoltare
    return { error: null };
  };

  const signInWithGoogle = async () => {
    // Mock Google sign in
    return { error: null };
  };

  const signOut = async () => {
    // Mock sign out
    setUser(null);
    setForumUser(null);
    setSession(null);
  };

  return {
    user,
    forumUser,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };
};