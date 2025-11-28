import { createContext } from 'react';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data?: any; error: any }>;
  signUp: (email: string, password: string, displayName?: string, countyId?: string, cityId?: string, username?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<{ error: any }>;
  updateProfile: (updates: Record<string, unknown>) => Promise<void>;
  needsProfileCompletion: boolean;
  setNeedsProfileCompletion: (value: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
