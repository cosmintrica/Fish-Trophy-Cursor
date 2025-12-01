import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ForumUser } from '../types/forum';
import { useAuth as useMainAuth } from '../../hooks/useAuth';

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
  const mainAuth = useMainAuth();
  const [forumUser, setForumUser] = useState<ForumUser | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Când utilizatorul principal se schimbă, actualizează forumUser
    if (mainAuth.user) {
      const loadUserData = async () => {
        const displayName = mainAuth.user.user_metadata?.display_name ||
                           mainAuth.user.user_metadata?.full_name ||
                           mainAuth.user.email?.split('@')[0] ||
                           'Utilizator';

        const isAdmin = mainAuth.user.email === 'cosmin.trica@outlook.com';
        const isFounder = isAdmin; // Founder = creator/admin

        // Obține photo_url din profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('photo_url')
          .eq('id', mainAuth.user.id)
          .maybeSingle();

        const newForumUser: ForumUser = {
          id: mainAuth.user.id,
          username: displayName,
          email: mainAuth.user.email,
          avatar_url: profile?.photo_url || mainAuth.user.user_metadata?.avatar_url || null,
          rank: isFounder ? 'founder' : 'pescar',
          post_count: 0,
          topic_count: 0,
          reputation_points: isAdmin ? 999 : 100,
          badges: isFounder ? ['Founder', 'Administrator', 'Expert Pescuit'] : ['Pescar Nou'],
          isAdmin: isAdmin,
          canModerateRespect: isAdmin,
          canDeletePosts: isAdmin,
          canBanUsers: isAdmin,
          canEditAnyPost: isAdmin
        };

        setForumUser(newForumUser);
      };

      loadUserData();
    } else {
      setForumUser(null);
    }
  }, [mainAuth.user]);

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
        // Obține photo_url din profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('photo_url')
          .eq('id', userId)
          .maybeSingle();
        
        setForumUser({
          ...data,
          photo_url: profile?.photo_url || data.avatar_url || null
        });
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
    try {
      await mainAuth.signIn(email, password);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      await mainAuth.signUp(email, password, username);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await mainAuth.signInWithGoogle();
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await mainAuth.logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user: mainAuth.user,
    forumUser,
    session: mainAuth.session,
    loading: mainAuth.loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };
};
