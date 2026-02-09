import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getStoredSession } from '../../lib/auth-supabase';
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

  // Sync loading state with main auth - prevents false redirects when auth re-evaluates
  // Initialize from main auth or localStorage check to prevent flash for guests
  const [loading, setLoading] = useState(() => {
    if (!mainAuth.loading) return mainAuth.loading;
    // If main auth is loading, check if we have a stored session
    // If NO session in storage, we are definitely a guest -> not loading
    const stored = getStoredSession();
    return !!stored;
  });

  // Actualizează last_seen_at și rank pentru utilizatorii online
  useEffect(() => {
    if (!mainAuth.user) return;

    const updateUserActivity = async () => {
      try {
        // Verifică admin role din profiles (sursa de adevăr)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', mainAuth.user.id)
          .maybeSingle();
        const isAdmin = profile?.role === 'admin';

        const displayName = mainAuth.user.user_metadata?.display_name ||
          mainAuth.user.user_metadata?.full_name ||
          mainAuth.user.email?.split('@')[0] ||
          'Utilizator';

        // Verifică dacă user-ul există în forum_users
        const { data: existingUser } = await supabase
          .from('forum_users')
          .select('id')
          .eq('user_id', mainAuth.user.id)
          .maybeSingle();

        if (existingUser) {
          // Update user existent cu last_seen_at
          // NU actualizăm username sau rank - acestea sunt gestionate de trigger-e SQL
          await supabase
            .from('forum_users')
            .update({
              last_seen_at: new Date().toISOString()
            })
            .eq('user_id', mainAuth.user.id);
        } else {
          // Creează user nou în forum_users
          // Obține username din profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', mainAuth.user.id)
            .maybeSingle();

          const username = profile?.username || mainAuth.user.email?.split('@')[0] || 'pescar';

          const { error: insertError } = await supabase
            .from('forum_users')
            .insert({
              user_id: mainAuth.user.id,
              username: username, // Username corect din profiles
              // NU setăm rank - trigger-ul SQL va seta 'ou_de_peste' automat
              post_count: 0,
              topic_count: 0,
              reputation_points: 0,
              last_seen_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Error inserting forum_user:', insertError);
          } else {
            console.log('Created new forum_user for:', mainAuth.user.id);
          }
        }
      } catch (error) {
        console.error('Error updating user activity:', error);
      }
    };

    // Actualizează imediat
    updateUserActivity();

    // Actualizează la fiecare 2 minute cât timp utilizatorul este activ
    const interval = setInterval(updateUserActivity, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [mainAuth.user]);

  useEffect(() => {
    // Sync loading with main auth loading state
    if (mainAuth.loading) {
      setLoading(true);
      return;
    }

    // Când utilizatorul principal se schimbă, actualizează forumUser
    if (mainAuth.user) {
      const loadUserData = async () => {
        try {
          const displayName = mainAuth.user.user_metadata?.display_name ||
            mainAuth.user.user_metadata?.full_name ||
            mainAuth.user.email?.split('@')[0] ||
            'Utilizator';

          // Obține photo_url și role din database
          const { data: profile } = await supabase
            .from('profiles')
            .select('photo_url, role')
            .eq('id', mainAuth.user.id)
            .maybeSingle();

          // Verifică admin role din profiles (sursa de adevăr)
          const isAdmin = profile?.role === 'admin';

          // Obține username și rank real din forum_users (dacă există)
          const { data: forumUserData } = await supabase
            .from('forum_users')
            .select('username, rank, badges')
            .eq('user_id', mainAuth.user.id)
            .maybeSingle();

          // Folosește username-ul real din forum_users, nu displayName
          const realUsername = forumUserData?.username || displayName;

          const newForumUser: ForumUser = {
            id: mainAuth.user.id,
            username: realUsername, // Username real din forum_users
            email: mainAuth.user.email,
            avatar_url: profile?.photo_url || mainAuth.user.user_metadata?.avatar_url || null,
            rank: forumUserData?.rank || 'ou_de_peste', // Rank real din database
            post_count: 0,
            topic_count: 0,
            reputation_points: isAdmin ? 999 : 100,
            badges: forumUserData?.badges || (isAdmin ? ['Administrator'] : ['Pescar Nou']),
            isAdmin: isAdmin,
            canModerateRespect: isAdmin,
            canDeletePosts: isAdmin,
            canBanUsers: isAdmin,
            canEditAnyPost: isAdmin
          };

          setForumUser(newForumUser);
        } finally {
          setLoading(false); // Always set loading to false after attempt
        }
      };

      loadUserData();
    } else {
      setForumUser(null);
      setLoading(false); // No user, stop loading
    }
  }, [mainAuth.user, mainAuth.loading]);

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
