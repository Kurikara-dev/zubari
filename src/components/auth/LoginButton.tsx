'use client';

import { useState, useEffect } from 'react';

interface User {
  name?: string;
  email?: string;
  picture?: string;
}

export default function LoginButton() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ユーザー情報を取得
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setIsLoading(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) return <div>Loading...</div>;

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          Welcome, {user.name || user.email}
        </span>
        <a
          href="/api/auth/logout"
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
        >
          Logout
        </a>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/login"
      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm transition-colors"
    >
      Login
    </a>
  );
}