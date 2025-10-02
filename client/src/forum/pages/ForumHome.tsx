import React, { useState } from 'react';
import SimpleForumLayout from '../components/SimpleForumLayout';

export default function ForumHome() {
  const [user, setUser] = useState<{
    id: string;
    username: string;
    avatar_url?: string;
    rank: string;
  } | null>(null);

  const handleLogin = () => {
    setUser({
      id: '1',
      username: 'TestUser',
      rank: 'pescar'
    });
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <SimpleForumLayout
      user={user}
      onLogin={handleLogin}
      onLogout={handleLogout}
    />
  );
}