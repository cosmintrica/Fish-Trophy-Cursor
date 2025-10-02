import { useState, useEffect } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  rank: string;
  isAdmin?: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock user pentru dezvoltare
    setUser({
      id: '1',
      username: 'TestUser',
      email: 'test@example.com',
      rank: 'pescar',
      isAdmin: false
    });
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Mock login
    setUser({
      id: '1',
      username: 'TestUser',
      email: email,
      rank: 'pescar',
      isAdmin: false
    });
  };

  const logout = () => {
    setUser(null);
  };

  return {
    user,
    loading,
    login,
    logout
  };
};
